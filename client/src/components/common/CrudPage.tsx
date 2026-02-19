import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Table, Button, Input, Space, Card, Typography, message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, ExportOutlined, UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { ColumnType } from 'antd/es/table/interface';
import api from '../../services/api';

const { Title } = Typography;

interface CrudPageProps<T> {
  title: string;
  apiPath: string;
  columns: ColumnsType<T>;
  formComponent?: React.ComponentType<{
    visible: boolean;
    record: T | null;
    onClose: () => void;
    onSuccess: () => void;
    apiPath: string;
  }>;
  canCreate?: boolean;
  canDelete?: boolean;
}

export default function CrudPage<T extends { id: string }>({
  title, apiPath, columns, formComponent: FormComponent,
  canCreate = true, canDelete = true,
}: CrudPageProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<T | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join('|');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const escapeCsv = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const normalizeImportValue = (value: string): unknown => {
    const v = value.trim();
    if (!v) return null;
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (v.includes('|')) return v.split('|').map((part) => part.trim()).filter(Boolean);
    if ((v.startsWith('[') && v.endsWith(']')) || (v.startsWith('{') && v.endsWith('}'))) {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    }
    return v;
  };

  const parseCsvLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    cells.push(current);
    return cells;
  };

  const fetchData = useCallback(async (page = 1, pageSize = 20, searchTerm = '') => {
    setLoading(true);
    try {
      const { data: response } = await api.get(apiPath, {
        params: { page, limit: pageSize, search: searchTerm || undefined },
      });
      setData(response.data);
      setPagination({
        current: response.pagination.page,
        pageSize: response.pagination.limit,
        total: response.pagination.total,
      });
    } catch {
      message.error('Məlumatlar yüklənərkən xəta');
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTableChange = (pag: TablePaginationConfig) => {
    fetchData(pag.current, pag.pageSize, search);
  };

  const handleSearch = () => {
    fetchData(1, pagination.pageSize, search);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`${apiPath}/${id}`);
      message.success('Uğurla silindi');
      fetchData(pagination.current, pagination.pageSize, search);
    } catch {
      message.error('Silmə zamanı xəta');
    }
  };

  const handleEdit = (record: T) => {
    setEditRecord(record);
    setFormVisible(true);
  };

  const handleCreate = () => {
    setEditRecord(null);
    setFormVisible(true);
  };

  const handleExport = () => {
    if (!data.length) {
      message.warning('Export üçün məlumat yoxdur');
      return;
    }

    const exportableColumns = columns.filter(
      (col): col is ColumnType<T> & { dataIndex: string } =>
        'dataIndex' in col && typeof col.dataIndex === 'string'
    );
    const headers = exportableColumns.map((col) => {
      if (typeof col.title === 'string') return col.title;
      return String(col.dataIndex);
    });
    const keys = exportableColumns.map((col) => col.dataIndex as string);

    const csvRows = [
      headers.map(escapeCsv).join(','),
      ...data.map((row) => keys.map((key) => escapeCsv(toCsvValue((row as Record<string, unknown>)[key]))).join(',')),
    ];

    const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${apiPath.replace('/', '') || 'data'}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (lines.length < 2) {
        message.warning('CSV faylı boşdur və ya yalnız başlıq var');
        return;
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.trim());
      const payloads = lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        const payload: Record<string, unknown> = {};
        headers.forEach((header, idx) => {
          if (!header) return;
          payload[header] = normalizeImportValue(values[idx] ?? '');
        });
        return payload;
      });

      const results = await Promise.allSettled(payloads.map((payload) => api.post(apiPath, payload)));
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        message.success(`${successCount} qeyd import edildi`);
        fetchData(1, pagination.pageSize, search);
      }
      if (failCount > 0) {
        message.warning(`${failCount} qeyd import edilə bilmədi`);
      }
    } catch {
      message.error('CSV import zamanı xəta baş verdi');
    } finally {
      event.target.value = '';
    }
  };

  const actionColumn: ColumnsType<T> = [
    {
      title: 'Əməliyyat',
      key: 'actions',
      width: 120,
      render: (_: any, record: T) => (
        <Space>
          {FormComponent && (
            <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          )}
          {canDelete && (
            <Popconfirm title="Silmək istəyirsiniz?" onConfirm={() => handleDelete(record.id)}>
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>{title}</Title>
        <Space>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <Input
            placeholder="Axtar..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            allowClear
          />
          <Button icon={<UploadOutlined />} onClick={handleImportClick}>CSV Import</Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>CSV Export</Button>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData(pagination.current, pagination.pageSize, search)} />
          {canCreate && FormComponent && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Yeni
            </Button>
          )}
        </Space>
      </div>

      <Card>
        <Table<T>
          columns={[...columns, ...actionColumn]}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Cəmi: ${total}`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {FormComponent && (
        <FormComponent
          visible={formVisible}
          record={editRecord}
          onClose={() => { setFormVisible(false); setEditRecord(null); }}
          onSuccess={() => {
            setFormVisible(false);
            setEditRecord(null);
            fetchData(pagination.current, pagination.pageSize, search);
          }}
          apiPath={apiPath}
        />
      )}
    </div>
  );
}
