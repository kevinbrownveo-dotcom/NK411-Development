import React from 'react';
import { Card, Row, Col, Progress, Typography, Space, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface KpiIndicator {
    label: string;
    value: number; // Percentage
    unit: string;
}

interface DetailedKpiData {
    kpi_10_2_1_1: KpiIndicator;
    kpi_10_2_1_4: KpiIndicator;
    kpi_10_2_1_5: KpiIndicator;
    kpi_10_2_1_6: KpiIndicator;
    kpi_10_2_1_8: KpiIndicator;
    kpi_10_2_1_9: KpiIndicator;
    kpi_10_2_2_1: KpiIndicator;
    kpi_10_2_2_4: KpiIndicator;
    kpi_10_2_2_5: KpiIndicator;
}

interface DetailedKpiPanelProps {
    data: DetailedKpiData | null;
    loading?: boolean;
}

const getProgressColor = (percent: number) => {
    if (percent >= 80) return '#52c41a';
    if (percent >= 50) return '#faad14';
    return '#f5222d';
};

export default function DetailedKpiPanel({ data, loading }: DetailedKpiPanelProps) {
    if (!data) return null;

    const kpis = [
        { key: '10.2.1.1', info: data.kpi_10_2_1_1, desc: 'Sistemdəkı aktivlərin nə qədəri risk qiymətləndirməsinə cəlb edilib.' },
        { key: '10.2.1.4', info: data.kpi_10_2_1_4, desc: 'Bütün təhdidlərin aktiv risklərlə əlaqələndirilmə nisbəti.' },
        { key: '10.2.1.5', info: data.kpi_10_2_1_5, desc: 'Məlum boşluqların aktiv risklərlə əlaqələndirilmə nisbəti.' },
        { key: '10.2.1.6', info: data.kpi_10_2_1_6, desc: 'Açıq risklərin emal prosesində (Treated) olma nisbəti.' },
        { key: '10.2.1.8', info: data.kpi_10_2_1_8, desc: 'Kataloqdakı həllərin aktiv risklərə tətbiq olunma faizi.' },
        { key: '10.2.1.9', info: data.kpi_10_2_1_9, desc: 'Baş vermiş insidentlərin uğurla bağlanma/həll olunma faizi.' },
        { key: '10.2.2.1', info: data.kpi_10_2_2_1, desc: 'Məlumat bazaları arası (DXƏIT/SIEM vs RR) qeydlərin uyğun gəlmə dərəcəsi.' },
    ];

    return (
        <Card
            title="Qanun §10.2 Compliance İndikatorları"
            loading={loading}
            style={{ marginTop: 16 }}
        >
            <Row gutter={[16, 24]}>
                {kpis.map((kpi) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={kpi.key}>
                        <Card type="inner" bodyStyle={{ textAlign: 'center', padding: '16px 8px' }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Maddə {kpi.key}
                                    <Tooltip title={kpi.desc}>
                                        <InfoCircleOutlined style={{ marginLeft: 4 }} />
                                    </Tooltip>
                                </Text>
                                <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text strong style={{ lineHeight: 1.2 }}>{kpi.info.label}</Text>
                                </div>
                                <Progress
                                    type="dashboard"
                                    percent={kpi.info.value}
                                    strokeColor={getProgressColor(kpi.info.value)}
                                    size={120}
                                />
                            </Space>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Card>
    );
}
