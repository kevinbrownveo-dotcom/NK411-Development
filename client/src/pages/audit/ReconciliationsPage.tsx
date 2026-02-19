import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Space, Select, Button } from 'antd';
import { SwapOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title } = Typography;

const SYNC_COLORS: Record<string, string> = {
  ok: 'green', failed: 'red', pending: 'gold', conflict: 'orange', disabled: 'default',
};

const columns = [
  { title: 'Obyekt növü', dataIndex: 'entity_type', key: 'entity_type', width: 120 },
  { title: 'Obyekt ID', dataIndex: 'entity_id', key: 'entity_id', width: 280 },
  { title: 'Mənbə sistem', dataIndex: 'source_system', key: 'source_system', width: 120 },
  { title: 'Mənbə ID', dataIndex: 'source_record_id', key: 'source_record_id', width: 200 },
  { title: 'İstiqamət', dataIndex: 'sync_direction', key: 'sync_direction', width: 120 },
  {
    title: 'Status', dataIndex: 'sync_status', key: 'sync_status', width: 100,
    render: (v: string) => <Tag color={SYNC_COLORS[v] || 'default'}>{v}</Tag>,
  },
  { title: 'Son sinx', dataIndex: 'last_sync_at', key: 'last_sync_at', width: 180 },
];

export default function ReconciliationsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/reconciliations');
      setData(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          <SwapOutlined /> Uzlaşdırma (Mapping)
        </Title>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Yenilə</Button>
      </div>
      <Card>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
          scroll={{ x: 'max-content' }} />
      </Card>
    </div>
  );
}
