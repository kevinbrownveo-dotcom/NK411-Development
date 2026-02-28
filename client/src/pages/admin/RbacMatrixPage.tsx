import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Spin, Alert } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;

interface MatrixRow {
    module: string;
    key: string;
    permissions: { role: string; read: boolean; create: boolean; update: boolean; delete: boolean }[];
}

/**
 * §5.6.2 — İnformasiya təhlükəsizliyinə aid məsuliyyətlərin və
 * səlahiyyətlərin rollar üzrə bölgü matrisası
 */
export default function RbacMatrixPage() {
    const [data, setData] = useState<{ roles: string[]; matrix: MatrixRow[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get('/admin/rbac-matrix')
            .then((res) => setData(res.data))
            .catch((err) => setError(err.response?.data?.error || 'Xəta'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
    if (error) return <Alert type="error" message={error} />;
    if (!data) return null;

    const yes = <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />;
    const no = <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 12, opacity: 0.3 }} />;

    const roleLabels: Record<string, string> = {
        admin: 'Admin',
        risk_manager: 'Risk Meneceri',
        asset_owner: 'Aktiv Sahibi',
        incident_coordinator: 'İnsident Koordinator',
        auditor: 'Auditor',
        dxeit_rep: 'DXƏİT Nümayəndəsi',
    };

    const columns: any[] = [
        {
            title: 'Modul',
            dataIndex: 'module',
            key: 'module',
            fixed: 'left' as const,
            width: 150,
            render: (text: string) => <Text strong>{text}</Text>,
        },
        ...data.roles.flatMap((role) => [
            {
                title: <Tag color="blue">{roleLabels[role] || role}</Tag>,
                children: ['read', 'create', 'update', 'delete'].map((action) => ({
                    title: action.charAt(0).toUpperCase() + action.slice(1),
                    key: `${role}_${action}`,
                    width: 60,
                    align: 'center' as const,
                    render: (_: any, record: MatrixRow) => {
                        const perm = record.permissions.find((p) => p.role === role);
                        return perm?.[action as keyof typeof perm] ? yes : no;
                    },
                })),
            },
        ]),
    ];

    return (
        <div style={{ padding: 24 }}>
            <Title level={3}>§5.6.2 — Rol ↔ Modul İcazə Matrisası (RBAC)</Title>
            <Card>
                <Table
                    dataSource={data.matrix}
                    columns={columns}
                    rowKey="key"
                    pagination={false}
                    bordered
                    size="small"
                    scroll={{ x: 1800 }}
                />
            </Card>
        </div>
    );
}
