import React from 'react';
import { Card, List, Typography, Progress, Badge } from 'antd';
import { AimOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface SmartTargetsWidgetProps {
    kpi1Percent: number | null;
    detailedData: any | null;
}

export default function SmartTargetsWidget({ kpi1Percent, detailedData }: SmartTargetsWidgetProps) {
    // Define SMART targets
    const targets = [
        {
            id: 1,
            title: 'Aktivlərin Audit Əhatəsi > 90%',
            current: detailedData?.kpi_10_2_1_1?.value || 0,
            target: 90,
            metric: 'Əhatə',
        },
        {
            id: 2,
            title: 'Boşluqların Risklərə Bağlanması > 80%',
            current: detailedData?.kpi_10_2_1_5?.value || 0,
            target: 80,
            metric: 'Bağlanma',
        },
        {
            id: 3,
            title: 'İnsidentlərin Həlli Təminat > 98%',
            current: detailedData?.kpi_10_2_1_9?.value || 0,
            target: 98,
            metric: 'Həll faizi',
        },
        {
            id: 4,
            title: 'Qalıq Risk Tolerans İdarəsi > 95%',
            current: kpi1Percent || 0,
            target: 95,
            metric: 'Uyğunluq',
        },
    ];

    return (
        <Card
            title={<><AimOutlined style={{ color: '#1677ff', marginRight: 8 }} />SMART Hədəflər (OKR) - Qanun §3.1.5</>}
            style={{ marginTop: 16, height: '100%' }}
        >
            <List
                itemLayout="vertical"
                dataSource={targets}
                renderItem={(item) => {
                    const isMet = item.current >= item.target;
                    return (
                        <List.Item key={item.id} style={{ padding: '12px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text strong>{item.title}</Text>
                                <Badge
                                    status={isMet ? 'success' : 'warning'}
                                    text={isMet ? 'Hədəfə çatılıb' : 'Gərgin'}
                                />
                            </div>
                            <Progress
                                percent={item.current}
                                success={{ percent: item.current >= item.target ? item.target : 0 }}
                                status={item.current >= item.target ? 'success' : 'active'}
                                strokeColor={item.current >= item.target ? '#52c41a' : '#1677ff'}
                            />
                        </List.Item>
                    );
                }}
            />
        </Card>
    );
}
