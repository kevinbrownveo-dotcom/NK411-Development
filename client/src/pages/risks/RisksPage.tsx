import React from 'react';
import { Tag } from 'antd';
import CrudPage from '../../components/common/CrudPage';
import { Risk } from '../../types';

const PRIORITY_COLORS: Record<string, string> = {
  kritik: 'red', yüksək: 'orange', orta: 'gold', aşağı: 'green',
};

const columns = [
  { title: 'Kod', dataIndex: 'risk_code', key: 'risk_code', width: 150 },
  { title: 'Ad', dataIndex: 'name', key: 'name' },
  { title: 'Kateqoriya', dataIndex: 'category', key: 'category', width: 110 },
  {
    title: 'Prioritet', dataIndex: 'priority', key: 'priority', width: 110,
    render: (v: string) => <Tag color={PRIORITY_COLORS[v] || 'default'}>{v}</Tag>,
  },
  { title: 'Keyfiyyət skoru', dataIndex: 'qualitative_score', key: 'qualitative_score', width: 130 },
  { title: 'Emal', dataIndex: 'treatment_option', key: 'treatment_option', width: 140 },
  {
    title: 'Status', dataIndex: 'status', key: 'status', width: 110,
    render: (v: string) => <Tag color={v === 'açıq' ? 'red' : v === 'bağlı' ? 'green' : 'processing'}>{v}</Tag>,
  },
  { title: 'Qalıq risk', dataIndex: 'residual_risk_score', key: 'residual_risk_score', width: 110 },
];

export default function RisksPage() {
  return <CrudPage<Risk> title="Risk Reyestri" apiPath="/risks" columns={columns} />;
}
