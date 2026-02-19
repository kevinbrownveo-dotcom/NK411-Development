import React from 'react';
import { Tag } from 'antd';
import CrudPage from '../../components/common/CrudPage';
import { Vulnerability } from '../../types';
import VulnerabilityForm from './VulnerabilityForm';

const STATUS_COLORS: Record<string, string> = {
  açıq: 'red', işdə: 'processing', həll_edilib: 'green', risk_kimi_qəbul_edilib: 'gold',
};

const columns = [
  { title: 'Kod', dataIndex: 'vuln_code', key: 'vuln_code', width: 150 },
  { title: 'Ad', dataIndex: 'name', key: 'name' },
  { title: 'Növ', dataIndex: 'type', key: 'type', width: 130 },
  { title: 'CVE', dataIndex: 'cve_ref', key: 'cve_ref', width: 150 },
  { title: 'Daxili ciddilik', dataIndex: 'severity_internal', key: 'severity_internal', width: 130 },
  {
    title: 'Qanun ciddiliyi', dataIndex: 'severity_law', key: 'severity_law', width: 130,
    render: (v: string) => <Tag color={v === 'kritik' ? 'red' : v === 'yüksək' ? 'orange' : 'default'}>{v}</Tag>,
  },
  {
    title: 'Status', dataIndex: 'status', key: 'status', width: 150,
    render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
  },
  { title: 'Aşkarlanma', dataIndex: 'detection_date', key: 'detection_date', width: 120 },
];

export default function VulnerabilitiesPage() {
  return <CrudPage<Vulnerability> title="Boşluq / Uyğunsuzluq Reyestri" apiPath="/vulnerabilities" columns={columns} formComponent={VulnerabilityForm} />;
}
