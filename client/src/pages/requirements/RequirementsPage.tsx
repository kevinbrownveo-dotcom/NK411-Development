import React from 'react';
import { Tag } from 'antd';
import CrudPage from '../../components/common/CrudPage';
import { Requirement } from '../../types';
import RequirementForm from './RequirementForm';

const STATUS_COLORS: Record<string, string> = {
  aktiv: 'green', draft: 'default', köhnəlmiş: 'red',
};

const columns = [
  { title: 'Kod', dataIndex: 'req_code', key: 'req_code', width: 150 },
  { title: 'Başlıq', dataIndex: 'req_title', key: 'req_title' },
  { title: 'Kateqoriya', dataIndex: 'req_category', key: 'req_category', width: 140 },
  { title: 'Mənbə növü', dataIndex: 'source_type', key: 'source_type', width: 130 },
  { title: 'Mənbə ref', dataIndex: 'source_ref', key: 'source_ref', width: 200 },
  {
    title: 'Fəaliyyət sahəsi', dataIndex: 'activity_area', key: 'activity_area', width: 200,
    render: (v: string[]) => v?.map((a) => <Tag key={a} style={{ marginBottom: 2 }}>{a}</Tag>),
  },
  {
    title: 'Status', dataIndex: 'status', key: 'status', width: 100,
    render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
  },
];

export default function RequirementsPage() {
  return <CrudPage<Requirement> title="Tələblər və Hədlər" apiPath="/requirements" columns={columns} formComponent={RequirementForm} />;
}
