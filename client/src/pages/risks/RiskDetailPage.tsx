import React, { useEffect, useState, useCallback } from 'react';
import {
    Card, Descriptions, Tag, Tabs, Table, Button, Select, message,
    Popconfirm, Spin, Typography, Space, Statistic, Row, Col,
} from 'antd';
import {
    ArrowLeftOutlined, PlusOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const { Title } = Typography;

const SEVERITY_COLORS: Record<string, string> = {
    kritik: 'red', yüksək: 'orange', orta: 'gold', aşağı: 'green', çox_aşağı: 'blue',
};

const PRIORITY_COLORS: Record<string, string> = {
    kritik: 'red', yüksək: 'orange', orta: 'gold', aşağı: 'green',
};

interface RelationData {
    assets: any[];
    threats: any[];
    vulnerabilities: any[];
    consequences: any[];
    solutions: any[];
}

export default function RiskDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [risk, setRisk] = useState<any>(null);
    const [relations, setRelations] = useState<RelationData>({ assets: [], threats: [], vulnerabilities: [], consequences: [], solutions: [] });
    const [score, setScore] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Available items for linking
    const [availableAssets, setAvailableAssets] = useState<any[]>([]);
    const [availableThreats, setAvailableThreats] = useState<any[]>([]);
    const [availableVulns, setAvailableVulns] = useState<any[]>([]);
    const [availableSolutions, setAvailableSolutions] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<string>('');

    const loadRisk = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const [riskRes, relRes, scoreRes] = await Promise.all([
                api.get(`/risks/${id}`),
                api.get(`/risks/${id}/relations`),
                api.get(`/risks/${id}/score`),
            ]);
            setRisk(riskRes.data);
            setRelations(relRes.data);
            setScore(scoreRes.data);
        } catch {
            message.error('Risk yüklənərkən xəta');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { loadRisk(); }, [loadRisk]);

    const loadAvailableItems = useCallback(async () => {
        try {
            const [a, t, v, s] = await Promise.all([
                api.get('/assets', { params: { limit: 200 } }),
                api.get('/threats', { params: { limit: 200 } }),
                api.get('/vulnerabilities', { params: { limit: 200 } }),
                api.get('/solutions', { params: { limit: 200 } }),
            ]);
            setAvailableAssets(a.data.data || []);
            setAvailableThreats(t.data.data || []);
            setAvailableVulns(v.data.data || []);
            setAvailableSolutions(s.data.data || []);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { loadAvailableItems(); }, [loadAvailableItems]);

    const handleLink = async (type: string, idField: string) => {
        if (!selectedItem) return;
        try {
            await api.post(`/risks/${id}/${type}`, { [idField]: selectedItem });
            message.success('Əlaqə yaradıldı');
            setSelectedItem('');
            loadRisk();
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Əlaqə yaradılarkən xəta');
        }
    };

    const handleUnlink = async (type: string, itemId: string) => {
        try {
            await api.delete(`/risks/${id}/${type}/${itemId}`);
            message.success('Əlaqə silindi');
            loadRisk();
        } catch {
            message.error('Əlaqə silinərkən xəta');
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
    if (!risk) return <div>Risk tapılmadı</div>;

    const linkedAssetIds = new Set(relations.assets.map((a) => a.id));
    const linkedThreatIds = new Set(relations.threats.map((t) => t.id));
    const linkedVulnIds = new Set(relations.vulnerabilities.map((v) => v.id));
    const linkedSolutionIds = new Set(relations.solutions.map((s) => s.id));

    const tabItems = [
        {
            key: 'assets',
            label: `Aktivlər (${relations.assets.length})`,
            children: (
                <>
                    <Space style={{ marginBottom: 16 }}>
                        <Select
                            showSearch optionFilterProp="label" placeholder="Aktiv seç..."
                            style={{ width: 300 }} value={selectedItem || undefined}
                            onChange={setSelectedItem}
                            options={availableAssets.filter((a) => !linkedAssetIds.has(a.id)).map((a) => ({ value: a.id, label: `${a.asset_code} — ${a.name}` }))}
                        />
                        <Button icon={<PlusOutlined />} type="primary" onClick={() => handleLink('assets', 'asset_id')}>
                            Əlavə et
                        </Button>
                    </Space>
                    <Table dataSource={relations.assets} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'Kod', dataIndex: 'asset_code', width: 130 },
                        { title: 'Ad', dataIndex: 'name' },
                        { title: 'Kateqoriya', dataIndex: 'category', width: 110 },
                        { title: 'Dəyər', dataIndex: 'value', width: 80 },
                        { title: 'Kritiklik', dataIndex: 'criticality', width: 110, render: (v: string) => <Tag color={SEVERITY_COLORS[v]}>{v}</Tag> },
                        {
                            title: '', width: 50, render: (_: any, r: any) => (
                                <Popconfirm title="Əlaqəni silmək?" onConfirm={() => handleUnlink('assets', r.id)}>
                                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                                </Popconfirm>
                            )
                        },
                    ]} />
                </>
            ),
        },
        {
            key: 'threats',
            label: `Təhdidlər (${relations.threats.length})`,
            children: (
                <>
                    <Space style={{ marginBottom: 16 }}>
                        <Select
                            showSearch optionFilterProp="label" placeholder="Təhdid seç..."
                            style={{ width: 300 }} value={selectedItem || undefined}
                            onChange={setSelectedItem}
                            options={availableThreats.filter((t) => !linkedThreatIds.has(t.id)).map((t) => ({ value: t.id, label: `${t.threat_code} — ${t.name}` }))}
                        />
                        <Button icon={<PlusOutlined />} type="primary" onClick={() => handleLink('threats', 'threat_id')}>
                            Əlavə et
                        </Button>
                    </Space>
                    <Table dataSource={relations.threats} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'Kod', dataIndex: 'threat_code', width: 130 },
                        { title: 'Ad', dataIndex: 'name' },
                        { title: 'Kateqoriya', dataIndex: 'category', width: 110 },
                        { title: 'Ciddilik', dataIndex: 'severity', width: 110, render: (v: string) => <Tag color={SEVERITY_COLORS[v]}>{v}</Tag> },
                        {
                            title: '', width: 50, render: (_: any, r: any) => (
                                <Popconfirm title="Əlaqəni silmək?" onConfirm={() => handleUnlink('threats', r.id)}>
                                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                                </Popconfirm>
                            )
                        },
                    ]} />
                </>
            ),
        },
        {
            key: 'vulnerabilities',
            label: `Boşluqlar (${relations.vulnerabilities.length})`,
            children: (
                <>
                    <Space style={{ marginBottom: 16 }}>
                        <Select
                            showSearch optionFilterProp="label" placeholder="Boşluq seç..."
                            style={{ width: 300 }} value={selectedItem || undefined}
                            onChange={setSelectedItem}
                            options={availableVulns.filter((v) => !linkedVulnIds.has(v.id)).map((v) => ({ value: v.id, label: `${v.vuln_code} — ${v.name}` }))}
                        />
                        <Button icon={<PlusOutlined />} type="primary" onClick={() => handleLink('vulnerabilities', 'vulnerability_id')}>
                            Əlavə et
                        </Button>
                    </Space>
                    <Table dataSource={relations.vulnerabilities} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'Kod', dataIndex: 'vuln_code', width: 130 },
                        { title: 'Ad', dataIndex: 'name' },
                        { title: 'Ciddilik (daxili)', dataIndex: 'severity_internal', width: 130 },
                        { title: 'Status', dataIndex: 'status', width: 110, render: (v: string) => <Tag color={v === 'açıq' ? 'red' : 'green'}>{v}</Tag> },
                        {
                            title: '', width: 50, render: (_: any, r: any) => (
                                <Popconfirm title="Əlaqəni silmək?" onConfirm={() => handleUnlink('vulnerabilities', r.id)}>
                                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                                </Popconfirm>
                            )
                        },
                    ]} />
                </>
            ),
        },
        {
            key: 'solutions',
            label: `Həllər (${relations.solutions.length})`,
            children: (
                <>
                    <Space style={{ marginBottom: 16 }}>
                        <Select
                            showSearch optionFilterProp="label" placeholder="Həll seç..."
                            style={{ width: 300 }} value={selectedItem || undefined}
                            onChange={setSelectedItem}
                            options={availableSolutions.filter((s) => !linkedSolutionIds.has(s.id)).map((s) => ({ value: s.id, label: `${s.solution_code} — ${s.name}` }))}
                        />
                        <Button icon={<PlusOutlined />} type="primary" onClick={() => handleLink('solutions', 'solution_id')}>
                            Əlavə et
                        </Button>
                    </Space>
                    <Table dataSource={relations.solutions} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'Kod', dataIndex: 'solution_code', width: 130 },
                        { title: 'Ad', dataIndex: 'name' },
                        { title: 'Növ', dataIndex: 'type', width: 110 },
                        { title: 'Effektivlik', dataIndex: 'effectiveness', width: 100 },
                        {
                            title: '', width: 50, render: (_: any, r: any) => (
                                <Popconfirm title="Əlaqəni silmək?" onConfirm={() => handleUnlink('solutions', r.id)}>
                                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                                </Popconfirm>
                            )
                        },
                    ]} />
                </>
            ),
        },
        {
            key: 'consequences',
            label: `Fəsadlar (${relations.consequences.length})`,
            children: (
                <Table dataSource={relations.consequences} rowKey="id" size="small" pagination={false} columns={[
                    { title: 'Kateqoriya', dataIndex: 'consequence_category', width: 130 },
                    { title: 'Təsvir', dataIndex: 'consequence_description', ellipsis: true },
                    { title: 'Ciddilik', dataIndex: 'severity_law', width: 110, render: (v: string) => <Tag color={SEVERITY_COLORS[v]}>{v}</Tag> },
                ]} />
            ),
        },
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/risks')}>Geri</Button>
                <Title level={4} style={{ margin: 0 }}>{risk.risk_code} — {risk.name}</Title>
                {risk.priority && <Tag color={PRIORITY_COLORS[risk.priority]} style={{ fontSize: 14 }}>{risk.priority}</Tag>}
            </Space>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card><Statistic title="Keyfiyyət Skoru" value={score?.qualitative_score?.toFixed(2) || '—'} /></Card>
                </Col>
                <Col span={6}>
                    <Card><Statistic title="Kəmiyyət Dəyəri" value={score?.quantitative_value?.toFixed(2) || '—'} /></Card>
                </Col>
                <Col span={6}>
                    <Card><Statistic title="Ehtimal (MAX)" value={score?.prob_max?.toFixed(2) || '—'} /></Card>
                </Col>
                <Col span={6}>
                    <Card><Statistic title="Təsir (MAX)" value={score?.impact_max || '—'} /></Card>
                </Col>
            </Row>

            <Card style={{ marginBottom: 24 }}>
                <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="Risk kodu">{risk.risk_code}</Descriptions.Item>
                    <Descriptions.Item label="Kateqoriya">{risk.category}</Descriptions.Item>
                    <Descriptions.Item label="Status"><Tag color={risk.status === 'açıq' ? 'red' : 'green'}>{risk.status}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Prioritet"><Tag color={PRIORITY_COLORS[risk.priority]}>{risk.priority || '—'}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Emal seçimi">{risk.treatment_option || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Emal müddəti">{risk.treatment_start ? `${risk.treatment_start} → ${risk.treatment_end || '...'}` : '—'}</Descriptions.Item>
                    <Descriptions.Item label="Təsvir" span={2}>{risk.description || '—'}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Card>
                <Tabs items={tabItems} />
            </Card>
        </div>
    );
}
