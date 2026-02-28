import React from 'react';
import { Tag } from 'antd';
import CrudPage from '../../components/common/CrudPage';
import { Threshold } from '../../types';
import ThresholdForm from './ThresholdForm';

const columns = [
    { title: 'Həd növü', dataIndex: 'threshold_type', key: 'threshold_type', width: 150 },
    {
        title: 'Tətbiq olunur', dataIndex: 'applies_to_type', key: 'applies_to_type', width: 140,
        render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: 'Dəyər', dataIndex: 'value', key: 'value', width: 120 },
    { title: 'Vahid', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: 'Sahibi', dataIndex: 'owner_role', key: 'owner_role', width: 130 },
    {
        title: 'Nəzərdən keçirmə', dataIndex: 'review_frequency', key: 'review_frequency', width: 130,
        render: (v: string) => v ? <Tag color="blue">{v}</Tag> : null,
    },
    {
        title: 'Sübut', dataIndex: 'evidence_link', key: 'evidence_link', width: 120, ellipsis: true,
        render: (v: string) => v ? <a href={v} target="_blank" rel="noopener noreferrer">Link</a> : null,
    },
];

export default function ThresholdsPage() {
    return <CrudPage<Threshold> title="Hədlər" apiPath="/thresholds" columns={columns} formComponent={ThresholdForm} permissionResource="thresholds" />;
}
