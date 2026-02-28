import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { writeAuditLog, getChangedFields } from '../middleware/auditLog';
import db from '../config/database';

interface CrudOptions {
  table: string;
  entityType: string;
  permissionPrefix: string;
  codeColumn?: string;
  searchColumns?: string[];
  defaultSort?: string;
  /** Columns to mask (replace with '***') for non-admin users (DLP — RR-REQ-0035) */
  sensitiveColumns?: string[];
  /** Max rows for non-admin users (DLP export limit — RR-REQ-0035). Default: 50 */
  dlpMaxLimit?: number;
  beforeCreate?: (data: any, req: AuthRequest) => Promise<any>;
  afterCreate?: (record: any, req: AuthRequest) => Promise<void>;
  beforeUpdate?: (data: any, existing: any, req: AuthRequest) => Promise<any>;
}

export function createCrudRouter(options: CrudOptions): Router {
  const router = Router();
  const {
    table, entityType, permissionPrefix, codeColumn,
    searchColumns = ['name'], defaultSort = 'created_at',
  } = options;

  // GET / — Siyahı + axtarış + filtrasiya + səhifələmə
  router.get('/', authenticate, authorize(`${permissionPrefix}:read`),
    async (req: AuthRequest, res: Response) => {
      try {
        const isAdmin = req.user?.role === 'admin';
        const dlpLimit = options.dlpMaxLimit || 50;
        const maxAllowed = isAdmin ? 100 : dlpLimit;

        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, maxAllowed);
        const offset = (page - 1) * limit;
        const search = req.query.search as string;
        const sortBy = (req.query.sortBy as string) || defaultSort;
        const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

        let query = db(table);
        let countQuery = db(table);

        // Axtarış
        if (search && searchColumns.length > 0) {
          const searchCondition = searchColumns
            .map((col) => `${col} ILIKE ?`)
            .join(' OR ');
          const searchParams = searchColumns.map(() => `%${search}%`);
          query = query.whereRaw(`(${searchCondition})`, searchParams);
          countQuery = countQuery.whereRaw(`(${searchCondition})`, searchParams);
        }

        // Filtr parametrləri (query string-dən)
        const filterKeys = Object.keys(req.query).filter(
          (k) => !['page', 'limit', 'search', 'sortBy', 'sortOrder'].includes(k)
        );
        for (const key of filterKeys) {
          const value = req.query[key] as string;
          if (value) {
            query = query.where(key, value);
            countQuery = countQuery.where(key, value);
          }
        }

        const [{ count }] = await countQuery.count();
        let data = await query.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

        // DLP maskalama: admin olmayan istifadəçilər üçün həssas sahələri gizlət (RR-REQ-0035)
        if (!isAdmin && options.sensitiveColumns && options.sensitiveColumns.length > 0) {
          data = data.map((row: any) => {
            const masked = { ...row };
            for (const col of options.sensitiveColumns!) {
              if (masked[col] !== undefined && masked[col] !== null) {
                masked[col] = '***';
              }
            }
            return masked;
          });
        }

        res.json({
          data,
          pagination: {
            page,
            limit,
            total: parseInt(count as string),
            totalPages: Math.ceil(parseInt(count as string) / limit),
          },
        });
      } catch (error) {
        res.status(500).json({ error: `${entityType} siyahısı alınarkən xəta` });
      }
    }
  );

  // GET /:id — Tək qeyd
  router.get('/:id', authenticate, authorize(`${permissionPrefix}:read`),
    async (req: AuthRequest, res: Response) => {
      try {
        const record = await db(table).where({ id: req.params.id }).first();
        if (!record) {
          res.status(404).json({ error: `${entityType} tapılmadı` });
          return;
        }
        res.json(record);
      } catch (error) {
        res.status(500).json({ error: `${entityType} alınarkən xəta` });
      }
    }
  );

  // POST / — Yaratma
  router.post('/', authenticate, authorize(`${permissionPrefix}:create`),
    async (req: AuthRequest, res: Response) => {
      try {
        let data = { ...req.body, created_by: req.user!.userId };

        if (options.beforeCreate) {
          data = await options.beforeCreate(data, req);
        }

        const [record] = await db(table).insert(data).returning('*');

        await writeAuditLog({
          entity_type: entityType,
          entity_id: record.id,
          action: 'create',
          changed_fields: data,
          actor_user_id: req.user!.userId,
          actor_role: req.user!.role,
          ip_address: req.ip,
        });

        if (options.afterCreate) {
          await options.afterCreate(record, req);
        }

        res.status(201).json(record);
      } catch (error: any) {
        if (error.code === '23505') {
          res.status(409).json({ error: 'Bu qeyd artıq mövcuddur' });
          return;
        }
        res.status(500).json({ error: `${entityType} yaradılarkən xəta: ${error.message}` });
      }
    }
  );

  // PUT /:id — Yeniləmə
  router.put('/:id', authenticate, authorize(`${permissionPrefix}:update`),
    async (req: AuthRequest, res: Response) => {
      try {
        const existing = await db(table).where({ id: req.params.id }).first();
        if (!existing) {
          res.status(404).json({ error: `${entityType} tapılmadı` });
          return;
        }

        let data = { ...req.body };
        delete data.id;
        delete data.created_at;
        delete data.created_by;

        if (options.beforeUpdate) {
          data = await options.beforeUpdate(data, existing, req);
        }

        const changedFields = getChangedFields(existing, data);

        const [updated] = await db(table)
          .where({ id: req.params.id })
          .update({ ...data, updated_at: new Date() })
          .returning('*');

        if (changedFields.length > 0) {
          await writeAuditLog({
            entity_type: entityType,
            entity_id: req.params.id,
            action: 'update',
            changed_fields: changedFields,
            actor_user_id: req.user!.userId,
            actor_role: req.user!.role,
            ip_address: req.ip,
          });
        }

        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: `${entityType} yenilənərkən xəta: ${error.message}` });
      }
    }
  );

  // DELETE /:id — Silmə
  router.delete('/:id', authenticate, authorize(`${permissionPrefix}:delete`),
    async (req: AuthRequest, res: Response) => {
      try {
        const existing = await db(table).where({ id: req.params.id }).first();
        if (!existing) {
          res.status(404).json({ error: `${entityType} tapılmadı` });
          return;
        }

        await db(table).where({ id: req.params.id }).delete();

        await writeAuditLog({
          entity_type: entityType,
          entity_id: req.params.id,
          action: 'delete',
          changed_fields: existing,
          actor_user_id: req.user!.userId,
          actor_role: req.user!.role,
          ip_address: req.ip,
        });

        res.json({ message: `${entityType} uğurla silindi` });
      } catch (error) {
        res.status(500).json({ error: `${entityType} silinərkən xəta` });
      }
    }
  );

  return router;
}
