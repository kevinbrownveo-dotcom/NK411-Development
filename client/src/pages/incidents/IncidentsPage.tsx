import React from 'react';
import { Tag } from 'antd';
import CrudPage from '../../components/common/CrudPage';
import { Incident } from '../../types';
import FieldLabelWithHelp from '../../components/common/FieldLabelWithHelp';
import IncidentForm from './IncidentForm';

const SEVERITY_COLORS: Record<string, string> = {
  P1_kritik: 'red', P2_yüksək: 'orange', P3_orta: 'gold', P4_aşağı: 'green',
};

const columns = [
  { title: 'Kod', dataIndex: 'incident_code', key: 'incident_code', width: 150 },
  { title: 'Başlıq', dataIndex: 'title', key: 'title' },
  { title: <FieldLabelWithHelp fieldKey="incidents.type" label="Növ" />, dataIndex: 'type', key: 'type', width: 140 },
  {
    title: <FieldLabelWithHelp fieldKey="incidents.severity" label="Ciddilik" />, dataIndex: 'severity', key: 'severity', width: 110,
    render: (v: string) => <Tag color={SEVERITY_COLORS[v] || 'default'}>{v}</Tag>,
  },
  { title: <FieldLabelWithHelp fieldKey="incidents.detection_datetime" label="Aşkarlanma" />, dataIndex: 'detection_datetime', key: 'detection_datetime', width: 160 },
  {
    title: 'Status', dataIndex: 'status', key: 'status', width: 150,
    render: (v: string) => <Tag color={v === 'bağlı' ? 'green' : v === 'yeni' ? 'red' : 'processing'}>{v}</Tag>,
  },
  {
    title: <FieldLabelWithHelp fieldKey="incidents.notify_dxeit" label="DXƏIT" />, dataIndex: 'notify_dxeit', key: 'notify_dxeit', width: 80,
    render: (v: boolean) => v ? <Tag color="purple">Bəli</Tag> : null,
  },
];

export default function IncidentsPage() {
  return <CrudPage<Incident> title="İnsident İdarəetməsi" apiPath="/incidents" columns={columns} formComponent={IncidentForm} permissionResource="incidents" />;
}
