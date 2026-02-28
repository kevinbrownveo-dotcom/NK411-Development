import React, { useEffect, useState } from 'react';
import { Table, Card, Spin, Tag, Space, Typography, Tooltip } from 'antd';
import { CheckCircleFilled, CloseCircleOutlined } from '@ant-design/icons';
import api, { adminApi } from '../../services/api';

const { Title, Text } = Typography;

interface RbacMatrixData {
    roles: string[];
    modules: { key: string; label: string }[];
    actions: string[];
    matrix: {
        module: string;
        key: string;
        permissions: {
            role: string;
            read: boolean;
            create: boolean;
            update: boolean;
            delete: boolean;
        }[];
    }[];
}

const ACTION_COLORS: Record<string, string> = {
    read: 'blue',
    create: 'green',
    update: 'orange',
    delete: 'red',
};

const ACTION_LABELS: Record<string, string> = {
    read: 'Oxu',
    create: 'Yarat',
    update: 'Dəyiş',
    delete: 'Sil',
};

export default function GlobalRbacMatrix() {
    const [data, setData] = useState<RbacMatrixData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We add this endpoint to adminApi temporarily or use the base API
        api.get<RbacMatrixData>('/admin/rbac-matrix')
            .then((res: any) => setData(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading || !data) {
        return (
            <Card style={{ marginTop: 16 }}>
                <Spin style={{ display: 'block', margin: '40px auto' }} />
            </Card>
        );
    }

    // Sütunları formalaşdır (1 Sütun Module, qalanları Rollardır)
    const columns = [
        {
            title: 'Modullar / Resurslar',
            dataIndex: 'module',
            key: 'module',
            fixed: 'left' as const,
            width: 180,
            render: (text: string) => <Text strong>{text}</Text>,
        },
        ...data.roles.map(role => ({
            title: <div style={{ textAlign: 'center' }}>{role.replace('_', ' ').toUpperCase()}</div>,
            key: role,
            align: 'center' as const,
            width: 160,
            render: (_: any, record: any) => {
                const perm = record.permissions.find((p: any) => p.role === role);
                if (!perm) return <Text type="secondary">—</Text>;

                // İcazələrin icmalı üçün tag-lər render olunur
                return (
                    <Space size={4} wrap style={{ justifyContent: 'center' }}>
                        {['read', 'create', 'update', 'delete'].map(action => {
                            const hasAccess = perm[action as keyof typeof perm];
                            if (!hasAccess) return null;

                            return (
                                <Tooltip title={`${ACTION_LABELS[action]}`} key={action}>
                                    <Tag color={ACTION_COLORS[action]} style={{ margin: 0, padding: '0 4px', minWidth: 24, textAlign: 'center' }}>
                                        {action.charAt(0).toUpperCase()}
                                    </Tag>
                                </Tooltip>
                            );
                        })}
                        {!perm.read && !perm.create && !perm.update && !perm.delete && (
                            <Tooltip title="Səlahiyyət yoxdur">
                                <CloseCircleOutlined style={{ color: '#d9d9d9' }} />
                            </Tooltip>
                        )}
                    </Space>
                );
            }
        }))
    ];

    return (
        <Card
            title="Qlobal RBAC İdarəetmə Matrisi (Audit Görünüşü — Qanun §5.6.2)"
            style={{ marginTop: 16 }}
            bodyStyle={{ padding: 0 }}
        >
            <div style={{ padding: '16px 24px', backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                <Space size={16} wrap>
                    <Text strong>Açar (Legend):</Text>
                    <Tag color="blue">R (Oxumaq)</Tag>
                    <Tag color="green">C (Yaratmaq)</Tag>
                    <Tag color="orange">U (Yeniləmək)</Tag>
                    <Tag color="red">D (Silmək)</Tag>
                    <Text type="secondary" style={{ fontSize: 13, marginLeft: 16 }}>
                        Rolların modullar üzrə tam hüquq xəritəsi yuxarıda göstərildiyi kimi audita hazırdır.
                    </Text>
                </Space>
            </div>
            <Table
                columns={columns}
                dataSource={data.matrix}
                rowKey="key"
                pagination={false}
                scroll={{ x: 'max-content' }}
                size="small"
                bordered
            />
        </Card>
    );
}
