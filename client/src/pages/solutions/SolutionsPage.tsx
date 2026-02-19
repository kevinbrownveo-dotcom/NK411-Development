import React from 'react';
import { Tag } from 'antd';
import CrudPage from '../../components/common/CrudPage';
import { Solution } from '../../types';
import FieldLabelWithHelp from '../../components/common/FieldLabelWithHelp';

const columns = [
  { title: 'Kod', dataIndex: 'solution_code', key: 'solution_code', width: 150 },
  { title: 'Ad', dataIndex: 'name', key: 'name' },
  { title: <FieldLabelWithHelp fieldKey="solutions.type" label="Növ" />, dataIndex: 'type', key: 'type', width: 130 },
  { title: 'Xarakter', dataIndex: 'solution_kind', key: 'solution_kind', width: 110 },
  { title: 'Texnologiya', dataIndex: 'technology', key: 'technology', width: 110 },
  {
    title: 'Süni İntellekt', dataIndex: 'is_ai', key: 'is_ai', width: 90,
    render: (v: boolean) => v ? <Tag color="blue">Bəli</Tag> : null,
  },
  { title: 'Effektivlik', dataIndex: 'effectiveness', key: 'effectiveness', width: 100 },
  {
    title: 'Sertifikatlı', dataIndex: 'is_certified', key: 'is_certified', width: 100,
    render: (v: boolean) => v ? <Tag color="green">Bəli</Tag> : <Tag>Xeyr</Tag>,
  },
  { title: <FieldLabelWithHelp fieldKey="solutions.source" label="Mənbə" />, dataIndex: 'source', key: 'source', width: 120 },
];

export default function SolutionsPage() {
  return <CrudPage<Solution> title="Həllər Kataloqu" apiPath="/solutions" columns={columns} />;
}
