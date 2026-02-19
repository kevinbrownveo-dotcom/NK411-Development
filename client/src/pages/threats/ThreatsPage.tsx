import React from 'react';
import { Tag, Progress } from 'antd';
import CrudPage from '../../components/common/CrudPage';
import { Threat } from '../../types';
import ThreatForm from './ThreatForm';
import FieldLabelWithHelp from '../../components/common/FieldLabelWithHelp';

const SEVERITY_COLORS: Record<string, string> = {
  kritik: 'red', yüksək: 'orange', orta: 'gold', aşağı: 'green', çox_aşağı: 'blue',
};

const columns = [
  { title: 'Kod', dataIndex: 'threat_code', key: 'threat_code', width: 150 },
  { title: 'Ad', dataIndex: 'name', key: 'name' },
  { title: 'Kateqoriya', dataIndex: 'category', key: 'category', width: 110 },
  { title: 'Mənbə', dataIndex: 'source', key: 'source', width: 100 },
  {
    title: 'Ciddilik', dataIndex: 'severity', key: 'severity', width: 110,
    render: (v: string) => <Tag color={SEVERITY_COLORS[v] || 'default'}>{v}</Tag>,
  },
  {
    title: 'Ehtimal', dataIndex: 'probability', key: 'probability', width: 120,
    render: (v: number) => <Progress percent={v} size="small" />,
  },
  {
    title: <FieldLabelWithHelp fieldKey="threats.is_external" label="DXƏIT" />, dataIndex: 'is_external', key: 'is_external', width: 80,
    render: (v: boolean) => v ? <Tag color="purple">Bəli</Tag> : null,
  },
];

export default function ThreatsPage() {
  return <CrudPage<Threat> title="Təhdid Kataloqu" apiPath="/threats" columns={columns} formComponent={ThreatForm} />;
}
