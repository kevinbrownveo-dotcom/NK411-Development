import React from 'react';
import { Tag } from 'antd';
import CrudPage from '../../components/common/CrudPage';
import { Asset } from '../../types';
import AssetForm from './AssetForm';

const CRITICALITY_COLORS: Record<string, string> = {
  kritik: 'red', yüksək: 'orange', orta: 'gold', aşağı: 'green', çox_aşağı: 'blue',
};

const columns = [
  { title: 'Kod', dataIndex: 'asset_code', key: 'asset_code', width: 150 },
  { title: 'Ad', dataIndex: 'name', key: 'name' },
  { title: 'Kateqoriya', dataIndex: 'category', key: 'category', width: 120 },
  { title: 'Alt kateqoriya', dataIndex: 'sub_category', key: 'sub_category', width: 130 },
  { title: 'Dəyər', dataIndex: 'value', key: 'value', width: 80 },
  {
    title: 'Kritiklik', dataIndex: 'criticality', key: 'criticality', width: 120,
    render: (v: string) => <Tag color={CRITICALITY_COLORS[v] || 'default'}>{v}</Tag>,
  },
  {
    title: 'Status', dataIndex: 'status', key: 'status', width: 120,
    render: (v: string) => <Tag color={v === 'aktiv' ? 'green' : 'default'}>{v}</Tag>,
  },
  { title: 'Yerləşmə', dataIndex: 'location', key: 'location' },
];

export default function AssetsPage() {
  return <CrudPage<Asset> title="Aktiv Kataloqu" apiPath="/assets" columns={columns} formComponent={AssetForm} permissionResource="assets" />;
}
