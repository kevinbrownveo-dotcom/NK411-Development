import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Space, Card, Typography, Modal, Form, Input,
  Tag, Popconfirm, message, Checkbox, Divider, Alert, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined,
  ReloadOutlined, SettingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminApi } from '../../services/api';
import type { Role, RolePermission } from '../../types';

const { Title, Text } = Typography;

const RESOURCES = [
  { key: 'assets', label: 'Aktivlər' },
  { key: 'threats', label: 'Təhdidlər' },
  { key: 'vulnerabilities', label: 'Boşluqlar' },
  { key: 'risks', label: 'Risklər' },
  { key: 'incidents', label: 'İnsidentlər' },
  { key: 'solutions', label: 'Həllər' },
  { key: 'requirements', label: 'Tələblər' },
  { key: 'thresholds', label: 'Hədlər' },
  { key: 'consequences', label: 'Fəsadlar' },
  { key: 'reconciliations', label: 'Uzlaşdırma' },
  { key: 'audit', label: 'Audit Jurnalı' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'İstifadəçilər' },
  { key: 'roles', label: 'Rollar' },
];

const ACTIONS = [
  { key: 'read', label: 'Oxu' },
  { key: 'create', label: 'Yarat' },
  { key: 'update', label: 'Yenilə' },
  { key: 'delete', label: 'Sil' },
];

type PermMatrix = Record<string, Record<string, boolean>>;

function buildMatrix(perms: RolePermission[]): PermMatrix {
  const matrix: PermMatrix = {};
  RESOURCES.forEach((r) => {
    matrix[r.key] = {};
    ACTIONS.forEach((a) => { matrix[r.key][a.key] = false; });
  });
  perms.forEach((p) => {
    if (matrix[p.resource]) matrix[p.resource][p.action] = true;
  });
  return matrix;
}

function matrixToPerms(matrix: PermMatrix): { resource: string; action: string }[] {
  const result: { resource: string; action: string }[] = [];
  Object.entries(matrix).forEach(([resource, actions]) => {
    Object.entries(actions).forEach(([action, granted]) => {
      if (granted) result.push({ resource, action });
    });
  });
  return result;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [matrix, setMatrix] = useState<PermMatrix>({});
  const [permLoading, setPermLoading] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getRoles();
      setRoles(res.data);
    } catch {
      message.error('Rollar yüklənərkən xəta');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openPermissions = async (role: Role) => {
    setSelectedRole(role);
    setPermLoading(true);
    setPermOpen(true);
    try {
      const res = await adminApi.getRolePermissions(role.id);
      setMatrix(buildMatrix(res.data));
    } catch {
      message.error('İcazələr yüklənərkən xəta');
    } finally {
      setPermLoading(false);
    }
  };

  const handleSavePerms = async () => {
    if (!selectedRole) return;
    try {
      await adminApi.updateRolePermissions(selectedRole.id, matrixToPerms(matrix));
      message.success('İcazələr yadda saxlandı');
      setPermOpen(false);
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Xəta baş verdi');
    }
  };

  const togglePerm = (resource: string, action: string) => {
    setMatrix((prev) => ({
      ...prev,
      [resource]: { ...prev[resource], [action]: !prev[resource]?.[action] },
    }));
  };

  const toggleRow = (resource: string, allCheck: boolean) => {
    setMatrix((prev) => {
      const actions = { ...prev[resource] };
      ACTIONS.forEach((a) => { actions[a.key] = allCheck; });
      return { ...prev, [resource]: actions };
    });
  };

  const toggleColumn = (action: string, allCheck: boolean) => {
    setMatrix((prev) => {
      const next = { ...prev };
      RESOURCES.forEach((r) => {
        next[r.key] = { ...next[r.key], [action]: allCheck };
      });
      return next;
    });
  };

  const handleCreateRole = async () => {
    try {
      const values = await form.validateFields();
      await adminApi.createRole({ ...values, permissions: matrixToPerms(matrix) });
      message.success('Rol yaradıldı');
      setCreateOpen(false);
      form.resetFields();
      setMatrix(buildMatrix([]));
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Xəta baş verdi');
    }
  };

  const handleDelete = async (role: Role) => {
    try {
      await adminApi.deleteRole(role.id);
      message.success('Rol silindi');
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Xəta baş verdi');
    }
  };

  const columns: ColumnsType<Role> = [
    {
      title: 'Rol Adı', key: 'name',
      render: (_, r) => (
        <Space>
          <Text strong>{r.label}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({r.name})</Text>
          {r.is_system && <Tag color="blue" icon={<SafetyCertificateOutlined />}>Sistem</Tag>}
          {r.is_custom && <Tag color="green">Xüsusi</Tag>}
        </Space>
      ),
    },
    { title: 'Təsvir', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Əməliyyatlar', key: 'actions',
      render: (_, r) => (
        <Space>
          <Tooltip title="İcazə Matrisi">
            <Button icon={<SettingOutlined />} size="small" onClick={() => openPermissions(r)}>İcazələr</Button>
          </Tooltip>
          {!r.is_system && (
            <Popconfirm title="Rolu silirsiniz. Əminsiniz?" onConfirm={() => handleDelete(r)} okText="Bəli" cancelText="Xeyr">
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const PermissionMatrix = ({ disabled }: { disabled?: boolean }) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>Modul</th>
            {ACTIONS.map((a) => (
              <th key={a.key} style={{ padding: '4px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                {a.label}
                {!disabled && (
                  <Checkbox
                    style={{ marginLeft: 4 }}
                    indeterminate={RESOURCES.some((r) => matrix[r.key]?.[a.key]) && !RESOURCES.every((r) => matrix[r.key]?.[a.key])}
                    checked={RESOURCES.every((r) => matrix[r.key]?.[a.key])}
                    onChange={(e) => toggleColumn(a.key, e.target.checked)}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RESOURCES.map((r) => {
            const allChecked = ACTIONS.every((a) => matrix[r.key]?.[a.key]);
            const someChecked = ACTIONS.some((a) => matrix[r.key]?.[a.key]);
            return (
              <tr key={r.key} style={{ borderBottom: '1px solid #fafafa' }}>
                <td style={{ padding: '4px 8px' }}>
                  {!disabled && (
                    <Checkbox
                      indeterminate={someChecked && !allChecked}
                      checked={allChecked}
                      onChange={(e) => toggleRow(r.key, e.target.checked)}
                      style={{ marginRight: 8 }}
                    />
                  )}
                  {r.label}
                </td>
                {ACTIONS.map((a) => (
                  <td key={a.key} style={{ textAlign: 'center', padding: '4px 12px' }}>
                    <Checkbox
                      checked={!!matrix[r.key]?.[a.key]}
                      onChange={() => !disabled && togglePerm(r.key, a.key)}
                      disabled={disabled}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Title level={4} style={{ margin: 0 }}>Rol & İcazə İdarəetməsi</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setMatrix(buildMatrix([])); form.resetFields(); setCreateOpen(true); }}>
            Yeni Rol
          </Button>
        </Space>
      </Space>

      <Table rowKey="id" dataSource={roles} columns={columns} loading={loading} size="small" pagination={false} />

      {/* İcazə Matrisi Modalı */}
      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>İcazə Matrisi: <Text type="secondary">{selectedRole?.label}</Text></span>
            {selectedRole?.is_system && <Alert type="info" message="Sistem roleun icazələrini dəyişdirmək mümkündür, lakin diqqətlə edin." banner style={{ padding: '0 8px' }} />}
          </Space>
        }
        open={permOpen}
        onOk={handleSavePerms}
        onCancel={() => setPermOpen(false)}
        okText="Yadda saxla"
        cancelText="Ləğv et"
        width={780}
        confirmLoading={permLoading}
      >
        <PermissionMatrix />
      </Modal>

      {/* Yeni Rol Yaratma Modalı */}
      <Modal
        title="Yeni Rol Yarat"
        open={createOpen}
        onOk={handleCreateRole}
        onCancel={() => setCreateOpen(false)}
        okText="Yarat"
        cancelText="Ləğv et"
        width={780}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Rol Kodu (daxili)" rules={[{ required: true, message: 'Rol kodu tələb olunur' }, { pattern: /^[a-z_]+$/, message: 'Yalnız kiçik hərf və alt xətt' }]}>
            <Input placeholder="məs. finance_manager" />
          </Form.Item>
          <Form.Item name="label" label="Görünən Ad" rules={[{ required: true, message: 'Rol adı tələb olunur' }]}>
            <Input placeholder="məs. Maliyyə Meneceri" />
          </Form.Item>
          <Form.Item name="description" label="Təsvir">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
        <Divider>İcazə Matrisi</Divider>
        <PermissionMatrix />
      </Modal>
    </Card>
  );
}
