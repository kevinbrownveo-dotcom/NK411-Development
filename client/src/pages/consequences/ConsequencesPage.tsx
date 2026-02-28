import React from 'react';
import { Tag } from 'antd';
import CrudPage from '../../components/common/CrudPage';
import { Consequence } from '../../types';
import ConsequenceForm from './ConsequenceForm';

const SEVERITY_COLORS: Record<string, string> = {
    kritik: 'red', yüksək: 'orange', orta: 'gold', aşağı: 'green', çox_aşağı: 'blue',
};

const CATEGORY_LABELS: Record<string, string> = {
    continuity: 'Davamlılıq', reputasiya: 'Reputasiya', maliyyə: 'Maliyyə',
    hüquqi: 'Hüquqi', əməliyyat: 'Əməliyyat', texnoloji: 'Texnoloji', insan: 'İnsan',
};

const columns = [
    {
        title: 'Kateqoriya', dataIndex: 'consequence_category', key: 'consequence_category', width: 130,
        render: (v: string) => <Tag>{CATEGORY_LABELS[v] || v}</Tag>,
    },
    { title: 'Təsvir', dataIndex: 'consequence_description', key: 'consequence_description', ellipsis: true },
    {
        title: 'Ciddilik', dataIndex: 'severity_law', key: 'severity_law', width: 120,
        render: (v: string) => <Tag color={SEVERITY_COLORS[v] || 'default'}>{v}</Tag>,
    },
    {
        title: 'Ehtimal', dataIndex: 'probability_band_law', key: 'probability_band_law', width: 110,
        render: (v: string) => <Tag>{v?.replace('p', '').replace('_', '-')}%</Tag>,
    },
    { title: 'Sübut', dataIndex: 'evidence', key: 'evidence', width: 150, ellipsis: true },
];

export default function ConsequencesPage() {
    return <CrudPage<Consequence> title="Fəsadlar" apiPath="/consequences" columns={columns} formComponent={ConsequenceForm} permissionResource="consequences" />;
}
