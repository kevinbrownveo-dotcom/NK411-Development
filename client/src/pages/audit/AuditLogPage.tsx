import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Space, Select, Tabs, Spin } from 'antd';
import { AuditOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { AuditLogEntry } from '../../types';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ACTION_COLORS: Record<string, string> = {
  create: 'green', update: 'blue', delete: 'red', override: 'orange',
  resolve_conflict: 'purple', export: 'cyan', sync: 'geekblue',
  login: 'lime', approve: 'gold',
  // Security events
  LOGIN_SUCCESS: 'green', LOGIN_FAIL: 'volcano', LOGIN_LOCKOUT: 'red',
  ACCESS_DENIED: 'red', ACCESS_GRANTED: 'green',
  SIEM_TEST: 'default',
};

const auditColumns = [
  {
    title: 'Vaxt', dataIndex: 'created_at', key: 'created_at', width: 170,
    render: (v: string) => new Date(v).toLocaleString('az-AZ'),
  },
  {
    title: 'Əməliyyat', dataIndex: 'action', key: 'action', width: 130,
    render: (v: string) => <Tag color={ACTION_COLORS[v] || 'default'}>{v}</Tag>,
  },
  { title: 'Obyekt', dataIndex: 'entity_type', key: 'entity_type', width: 120 },
  {
    title: 'ID', dataIndex: 'entity_id', key: 'entity_id', width: 100,
    render: (v: string) => v ? <Text code>{v?.substring(0, 8)}</Text> : '-',
  },
  { title: 'İstifadəçi', dataIndex: 'actor_name', key: 'actor_name', width: 140 },
  {
    title: 'Rol', dataIndex: 'actor_role', key: 'actor_role', width: 110,
    render: (v: string) => v ? <Tag>{v}</Tag> : '-',
  },
  {
    title: 'Severity', dataIndex: 'severity', key: 'severity', width: 90,
    render: (v: string) => {
      const colors: Record<string, string> = { CRITICAL: 'red', ERROR: 'volcano', WARN: 'orange', INFO: 'blue', DEBUG: 'default' };
      return v ? <Tag color={colors[v] || 'default'}>{v}</Tag> : <Tag color="blue">INFO</Tag>;
    },
  },
  {
    title: 'Dəyişikliklər', dataIndex: 'changed_fields', key: 'changed_fields',
    render: (v: any) => {
      if (!v) return null;
      const fields = typeof v === 'string' ? JSON.parse(v) : v;
      if (Array.isArray(fields)) {
        return fields.slice(0, 3).map((f: any, i: number) => (
          <Tag key={i} style={{ marginBottom: 2 }}>{f.field || f}</Tag>
        ));
      }
      return <Tag>dəyişiklik var</Tag>;
    },
  },
  { title: 'IP', dataIndex: 'ip_address', key: 'ip_address', width: 120 },
  { title: 'Səbəb', dataIndex: 'reason', key: 'reason', width: 150, ellipsis: true },
];

const securityColumns = [
  {
    title: 'Vaxt', dataIndex: 'created_at', key: 'time', width: 170,
    render: (v: string) => new Date(v).toLocaleString('az-AZ'),
  },
  {
    title: 'Hadisə', dataIndex: 'event_type', key: 'type', width: 160,
    render: (t: string) => <Tag color={ACTION_COLORS[t] || 'default'}>{t}</Tag>,
  },
  {
    title: 'Nəticə', dataIndex: 'result', key: 'result', width: 100,
    render: (r: string) => <Tag color={r === 'SUCCESS' ? 'green' : r === 'DENY' ? 'red' : 'orange'}>{r}</Tag>,
  },
  {
    title: 'Severity', dataIndex: 'severity', key: 'sev', width: 90,
    render: (s: string) => {
      const colors: Record<string, string> = { CRITICAL: 'red', ERROR: 'volcano', WARN: 'orange', INFO: 'blue', DEBUG: 'default' };
      return <Tag color={colors[s] || 'default'}>{s}</Tag>;
    },
  },
  { title: 'IP', dataIndex: 'source_ip', key: 'ip', width: 120 },
  { title: 'Səbəb Kodu', dataIndex: 'reason_code', key: 'reason', width: 160 },
  {
    title: 'Metadata', dataIndex: 'metadata', key: 'meta',
    render: (v: any) => {
      if (!v) return '-';
      const obj = typeof v === 'string' ? JSON.parse(v) : v;
      return Object.entries(obj).slice(0, 2).map(([k, val]) => (
        <Tag key={k} style={{ marginBottom: 2 }}>{k}: {String(val)}</Tag>
      ));
    },
  },
];

export default function AuditLogPage() {
  const [auditData, setAuditData] = useState<AuditLogEntry[]>([]);
  const [securityData, setSecurityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [activeTab, setActiveTab] = useState('1');

  const fetchAudit = async (page = 1) => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/audit-log', { params: { page, limit: 50 } });
      setAuditData(res.data);
      setPagination({ current: res.pagination.page, pageSize: 50, total: res.pagination.total });
    } catch { } finally {
      setLoading(false);
    }
  };

  const fetchSecurity = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/siem/security-events?limit=100');
      setSecurityData(data);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAudit(); fetchSecurity(); }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === '1') fetchAudit();
    if (key === '2') fetchSecurity();
  };

  return (
    <div>
      <Title level={3}><AuditOutlined /> Audit & Security Jurnalı</Title>
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab={<span><AuditOutlined /> Audit İzi</span>} key="1">
          <Card>
            <Table
              columns={auditColumns} dataSource={auditData} rowKey="id" loading={loading}
              pagination={{ ...pagination, showTotal: (t) => `Cəmi: ${t}` }}
              onChange={(p) => fetchAudit(p.current)}
              scroll={{ x: 'max-content' }}
              size="small"
            />
          </Card>
        </TabPane>
        <TabPane tab={<span><SafetyCertificateOutlined /> Security Hadisələri</span>} key="2">
          <Card>
            <Table
              columns={securityColumns} dataSource={securityData} rowKey="id" loading={loading}
              pagination={{ pageSize: 30, showTotal: (t) => `Cəmi: ${t}` }}
              scroll={{ x: 'max-content' }}
              size="small"
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}
