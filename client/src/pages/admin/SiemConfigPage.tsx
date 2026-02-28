import React, { useEffect, useState } from 'react';
import {
    Table, Card, Typography, Button, Modal, Form, Input, Select,
    Switch, Tag, Space, Spin, Alert, Tabs, InputNumber, message, Popconfirm, Divider,
} from 'antd';
import {
    PlusOutlined, SendOutlined, DeleteOutlined,
    EditOutlined, CheckCircleFilled, CloseCircleFilled, QuestionCircleFilled,
    SafetyCertificateOutlined, PoweroffOutlined,
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface SiemDestination {
    id: string;
    name: string;
    protocol: string;
    host: string;
    port: number;
    facility: number;
    severity_threshold: string;
    tls_enabled: boolean;
    retry_max: number;
    retry_backoff_ms: number;
    queue_size: number;
    is_active: boolean;
    health_status: string;
    last_health_check: string;
}

interface RetentionPolicy {
    id: string;
    log_table: string;
    retention_days: number;
    archive_enabled: boolean;
    archive_path: string;
}

interface SecurityEvent {
    id: string;
    event_type: string;
    user_id: string;
    result: string;
    severity: string;
    source_ip: string;
    created_at: string;
    metadata: any;
}

export default function SiemConfigPage() {
    const [destinations, setDestinations] = useState<SiemDestination[]>([]);
    const [retention, setRetention] = useState<RetentionPolicy[]>([]);
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingDest, setEditingDest] = useState<SiemDestination | null>(null);
    const [forwardingEnabled, setForwardingEnabled] = useState(true);
    const [toggleLoading, setToggleLoading] = useState(false);
    const [form] = Form.useForm();

    const loadAll = async () => {
        setLoading(true);
        try {
            const [destRes, retRes, evRes, statusRes] = await Promise.all([
                api.get('/siem/destinations'),
                api.get('/siem/retention'),
                api.get('/siem/security-events?limit=50'),
                api.get('/siem/forwarding-status'),
            ]);
            setDestinations(destRes.data);
            setRetention(retRes.data);
            setEvents(evRes.data);
            setForwardingEnabled(statusRes.data.enabled);
        } catch { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => { loadAll(); }, []);

    const handleToggleForwarding = async (checked: boolean) => {
        setToggleLoading(true);
        try {
            const res = await api.post('/siem/forwarding-status', { enabled: checked });
            setForwardingEnabled(res.data.enabled);
            message.success(checked ? 'Log göndərmə AKTİVLƏŞDİRİLDİ' : 'Log göndərmə DAYANDIRILDI');
        } catch {
            message.error('Dəyişiklik uğursuz oldu');
        }
        setToggleLoading(false);
    };

    const handleSaveDest = async (values: any) => {
        try {
            if (editingDest) {
                await api.put(`/siem/destinations/${editingDest.id}`, values);
                message.success('Hədəf yeniləndi');
            } else {
                await api.post('/siem/destinations', values);
                message.success('Hədəf əlavə edildi');
            }
            setModalVisible(false);
            setEditingDest(null);
            form.resetFields();
            loadAll();
        } catch {
            message.error('Xəta baş verdi');
        }
    };

    const handleTest = async (id: string) => {
        try {
            const res = await api.post(`/siem/destinations/${id}/test`);
            if (res.data.success) {
                message.success(res.data.message);
            } else {
                message.warning(res.data.message);
            }
            loadAll();
        } catch {
            message.error('Test uğursuz oldu');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/siem/destinations/${id}`);
            message.success('Hədəf silindi');
            loadAll();
        } catch {
            message.error('Silmə xətası');
        }
    };

    const healthBadge = (status: string) => {
        const map: Record<string, React.ReactNode> = {
            OK: <CheckCircleFilled style={{ color: '#52c41a' }} />,
            FAIL: <CloseCircleFilled style={{ color: '#ff4d4f' }} />,
            UNKNOWN: <QuestionCircleFilled style={{ color: '#faad14' }} />,
        };
        return map[status] || map.UNKNOWN;
    };

    const severityColor = (sev: string) => {
        const map: Record<string, string> = {
            CRITICAL: 'red', ERROR: 'volcano', WARN: 'orange', INFO: 'blue', DEBUG: 'default',
        };
        return map[sev] || 'default';
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <SafetyCertificateOutlined /> SIEM / Logging İdarəetməsi
                </Title>
                <Space size="large">
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '8px 20px', borderRadius: 8,
                        background: forwardingEnabled ? '#f6ffed' : '#fff2f0',
                        border: `1px solid ${forwardingEnabled ? '#b7eb8f' : '#ffa39e'}`,
                    }}>
                        <PoweroffOutlined style={{ fontSize: 18, color: forwardingEnabled ? '#52c41a' : '#ff4d4f' }} />
                        <Text strong>Log Göndərmə:</Text>
                        <Switch
                            checked={forwardingEnabled}
                            onChange={handleToggleForwarding}
                            loading={toggleLoading}
                            checkedChildren="AKTİV"
                            unCheckedChildren="DAYANDIRDI"
                        />
                    </div>
                </Space>
            </div>

            {!forwardingEnabled && (
                <Alert
                    message="Log göndərmə dayandırılıb"
                    description="SIEM hədəflərinə heç bir log göndərilmir. Aktiv etmək üçün yuxarıdakı düyməni basın."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            <Tabs defaultActiveKey="1">
                <TabPane tab="SIEM Hədəfləri" key="1">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingDest(null); form.resetFields(); setModalVisible(true); }}
                        style={{ marginBottom: 16 }}>
                        Yeni Hədəf
                    </Button>

                    <Table dataSource={destinations} rowKey="id" pagination={false} bordered size="small"
                        columns={[
                            { title: 'Ad', dataIndex: 'name', key: 'name', render: (t: string) => <Text strong>{t}</Text> },
                            { title: 'Protokol', dataIndex: 'protocol', key: 'protocol', render: (p: string) => <Tag color={p === 'TLS' ? 'green' : p === 'TCP' ? 'blue' : 'default'}>{p}</Tag> },
                            { title: 'Host:Port', key: 'hostport', render: (_: any, r: SiemDestination) => `${r.host}:${r.port}` },
                            { title: 'TLS', dataIndex: 'tls_enabled', key: 'tls', render: (v: boolean) => v ? <Tag color="green">🔒 Aktiv</Tag> : <Tag>Yox</Tag> },
                            { title: 'Min. Severity', dataIndex: 'severity_threshold', key: 'sev' },
                            { title: 'Status', key: 'health', render: (_: any, r: SiemDestination) => <Space>{healthBadge(r.health_status)} {r.health_status}</Space> },
                            {
                                title: 'Əməliyyat', key: 'actions', render: (_: any, r: SiemDestination) => (
                                    <Space>
                                        <Button size="small" type="primary" ghost icon={<SendOutlined />} onClick={() => handleTest(r.id)}>Test</Button>
                                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingDest(r); form.setFieldsValue(r); setModalVisible(true); }}>Redaktə</Button>
                                        <Popconfirm title="Silmək istəyirsiniz?" onConfirm={() => handleDelete(r.id)}>
                                            <Button size="small" danger icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                    </Space>
                                ),
                            },
                        ]}
                    />
                </TabPane>

                <TabPane tab="Log Retention" key="2">
                    <Alert message="Hər log cədvəli üçün saxlama müddəti və arxivləmə parametrlərini konfiqurasiya edin." type="info" showIcon style={{ marginBottom: 16 }} />
                    <Table dataSource={retention} rowKey="id" pagination={false} bordered size="small"
                        columns={[
                            {
                                title: 'Log Cədvəli', dataIndex: 'log_table', key: 'log_table', width: 200,
                                render: (t: string) => {
                                    const labels: Record<string, string> = {
                                        audit_log: '🔒 Audit Log (immutable)',
                                        security_event_log: '🛡️ Security Events',
                                        application_log: '📋 Application Log',
                                        integration_log: '🔗 Integration Log',
                                    };
                                    return <Text strong>{labels[t] || t}</Text>;
                                },
                            },
                            {
                                title: 'Saxlama (gün)', dataIndex: 'retention_days', key: 'days', width: 180,
                                render: (val: number, record: RetentionPolicy) => (
                                    <InputNumber
                                        min={7} max={36500} value={val}
                                        onChange={(v) => setRetention(prev => prev.map(r => r.id === record.id ? { ...r, retention_days: v || val } : r))}
                                        addonAfter="gün" style={{ width: '100%' }}
                                    />
                                ),
                            },
                            {
                                title: 'İl', key: 'years', width: 80,
                                render: (_: any, r: RetentionPolicy) => <Text type="secondary">{(r.retention_days / 365).toFixed(1)} il</Text>,
                            },
                            {
                                title: 'Arxivləmə', dataIndex: 'archive_enabled', key: 'archive', width: 120,
                                render: (val: boolean, record: RetentionPolicy) => (
                                    <Switch checked={val} checkedChildren="Aktiv" unCheckedChildren="Deaktiv"
                                        onChange={(checked) => setRetention(prev => prev.map(r => r.id === record.id ? { ...r, archive_enabled: checked } : r))}
                                    />
                                ),
                            },
                            {
                                title: '', key: 'save', width: 100,
                                render: (_: any, record: RetentionPolicy) => (
                                    <Button type="primary" size="small" onClick={async () => {
                                        try {
                                            await api.put(`/siem/retention/${record.id}`, { retention_days: record.retention_days, archive_enabled: record.archive_enabled, archive_path: record.archive_path });
                                            message.success(`${record.log_table} yeniləndi`);
                                        } catch { message.error('Yeniləmə xətası'); }
                                    }}>Saxla</Button>
                                ),
                            },
                        ]}
                    />
                </TabPane>

                <TabPane tab="Security Hadisələri" key="3">
                    <Table dataSource={events} rowKey="id" pagination={{ pageSize: 20 }} bordered size="small"
                        columns={[
                            { title: 'Vaxt', dataIndex: 'created_at', key: 'time', width: 180, render: (v: string) => new Date(v).toLocaleString('az-AZ') },
                            { title: 'Hadisə', dataIndex: 'event_type', key: 'type', render: (t: string) => <Tag>{t}</Tag> },
                            { title: 'Nəticə', dataIndex: 'result', key: 'result', render: (r: string) => <Tag color={r === 'SUCCESS' ? 'green' : r === 'DENY' ? 'red' : 'orange'}>{r}</Tag> },
                            { title: 'Severity', dataIndex: 'severity', key: 'sev', render: (s: string) => <Tag color={severityColor(s)}>{s}</Tag> },
                            { title: 'IP', dataIndex: 'source_ip', key: 'ip' },
                        ]}
                    />
                </TabPane>
            </Tabs>

            <Modal
                title={editingDest ? 'SIEM Hədəfini Redaktə Et' : 'Yeni SIEM Hədəfi'}
                open={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => { setModalVisible(false); setEditingDest(null); }}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSaveDest}>
                    <Form.Item name="name" label="Ad" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="protocol" label="Protokol" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'UDP', label: 'UDP — Syslog RFC5424 (şifrsiz)' },
                            { value: 'TCP', label: 'TCP — JSON over TCP (şifrsiz)' },
                            { value: 'TLS', label: 'TLS — JSON over TLS 1.2/1.3 (şifrəli) ✅' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="host" label="Host / IP" rules={[{ required: true }]}>
                        <Input placeholder="192.168.1.100 və ya siem.example.com" />
                    </Form.Item>
                    <Form.Item name="port" label="Port" rules={[{ required: true }]}>
                        <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="severity_threshold" label="Minimum Severity" initialValue="INFO">
                        <Select options={[
                            { value: 'DEBUG', label: 'DEBUG — Hər şey' },
                            { value: 'INFO', label: 'INFO — Normal + yuxarı' },
                            { value: 'WARN', label: 'WARN — Xəbərdarlıq + yuxarı' },
                            { value: 'ERROR', label: 'ERROR — Xəta + yuxarı' },
                            { value: 'CRITICAL', label: 'CRITICAL — Yalnız kritik' },
                        ]} />
                    </Form.Item>
                    <Divider>Əlaqə Parametrləri</Divider>
                    <Form.Item name="tls_enabled" label="TLS Şifrələmə" valuePropName="checked">
                        <Switch checkedChildren="Aktiv" unCheckedChildren="Deaktiv" />
                    </Form.Item>
                    <Form.Item name="retry_max" label="Max Retry Sayı" initialValue={3}>
                        <InputNumber min={0} max={10} />
                    </Form.Item>
                    <Form.Item name="retry_backoff_ms" label="Retry Gözləmə (ms)" initialValue={1000}>
                        <InputNumber min={100} max={30000} />
                    </Form.Item>
                    <Form.Item name="queue_size" label="Queue Ölçüsü" initialValue={10000}>
                        <InputNumber min={100} max={100000} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
