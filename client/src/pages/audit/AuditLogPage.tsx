import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Space, Select, Input, DatePicker } from 'antd';
import { AuditOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { AuditLogEntry } from '../../types';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const ACTION_COLORS: Record<string, string> = {
  create: 'green', update: 'blue', delete: 'red', override: 'orange',
  resolve_conflict: 'purple', export: 'cyan', sync: 'geekblue',
};

const columns = [
  { title: 'Vaxt', dataIndex: 'created_at', key: 'created_at', width: 180 },
  {
    title: 'Əməliyyat', dataIndex: 'action', key: 'action', width: 130,
    render: (v: string) => <Tag color={ACTION_COLORS[v] || 'default'}>{v}</Tag>,
  },
  { title: 'Obyekt növü', dataIndex: 'entity_type', key: 'entity_type', width: 120 },
  { title: 'Obyekt ID', dataIndex: 'entity_id', key: 'entity_id', width: 120,
    render: (v: string) => v?.substring(0, 8) + '...',
  },
  { title: 'İstifadəçi', dataIndex: 'actor_name', key: 'actor_name', width: 160 },
  { title: 'Rol', dataIndex: 'actor_role', key: 'actor_role', width: 120 },
  {
    title: 'Dəyişikliklər', dataIndex: 'changed_fields', key: 'changed_fields',
    render: (v: any) => {
      if (!v) return null;
      const fields = typeof v === 'string' ? JSON.parse(v) : v;
      if (Array.isArray(fields)) {
        return fields.map((f: any, i: number) => (
          <Tag key={i} style={{ marginBottom: 2 }}>{f.field}</Tag>
        ));
      }
      return <Tag>dəyişiklik var</Tag>;
    },
  },
  { title: 'Səbəb', dataIndex: 'reason', key: 'reason', width: 200 },
  { title: 'IP', dataIndex: 'ip_address', key: 'ip_address', width: 130 },
];

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/audit-log', { params: { page, limit: 50 } });
      setData(res.data);
      setPagination({ current: res.pagination.page, pageSize: 50, total: res.pagination.total });
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
      <Title level={3}><AuditOutlined /> Audit Jurnalı</Title>
      <Card>
        <Table
          columns={columns} dataSource={data} rowKey="id" loading={loading}
          pagination={{ ...pagination, showTotal: (t) => `Cəmi: ${t}` }}
          onChange={(p) => fetchData(p.current)}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
