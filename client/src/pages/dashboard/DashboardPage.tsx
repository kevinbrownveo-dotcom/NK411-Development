import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Tag, Spin, Typography } from 'antd';
import {
  ExclamationCircleOutlined, AlertOutlined, BugOutlined,
  LaptopOutlined, SafetyOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import { DashboardStats, KpiData } from '../../types';
import FieldLabelWithHelp from '../../components/common/FieldLabelWithHelp';

const { Title } = Typography;

const PRIORITY_COLORS: Record<string, string> = {
  kritik: '#f5222d',
  yüksək: '#fa8c16',
  orta: '#faad14',
  aşağı: '#52c41a',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/kpi'),
    ]).then(([statsRes, kpiRes]) => {
      setStats(statsRes.data);
      setKpi(kpiRes.data);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const kpiColor = (pct: number | null) => {
    if (pct === null) return '#d9d9d9';
    if (pct >= 80) return '#52c41a';
    if (pct >= 60) return '#faad14';
    return '#f5222d';
  };

  return (
    <div>
      <Title level={3}>Dashboard</Title>

      {/* Ümumi sayğaclar */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Ümumi Risklər"
              value={stats?.risks.total || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Aktiv Aktivlər"
              value={stats?.assets.activeCount || 0}
              prefix={<LaptopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Açıq Boşluqlar"
              value={stats?.vulnerabilities.openCount || 0}
              prefix={<BugOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Təhdidlər"
              value={stats?.threats.totalCount || 0}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* KPI kartları — PATCH-07 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12}>
          <Card title={<FieldLabelWithHelp fieldKey="dashboard.kpi" label="KPI-1: Qalıq Risk vs Tolerans" />}>
            <Statistic
              value={kpi?.kpi1.percentage ?? '—'}
              suffix="%"
              valueStyle={{ color: kpiColor(kpi?.kpi1.percentage ?? null), fontSize: 36 }}
            />
            <p style={{ marginTop: 8, color: '#888' }}>
              {kpi?.kpi1.exceeding || 0} risk toleransı aşır / {kpi?.kpi1.total || 0} ümumi
            </p>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title={<FieldLabelWithHelp fieldKey="dashboard.kpi" label="KPI-2: İnsident ↔ Qalıq Risk Uyğunluğu" />}>
            <Statistic
              value={kpi?.kpi2.percentage ?? '—'}
              suffix="%"
              valueStyle={{ color: kpiColor(kpi?.kpi2.percentage ?? null), fontSize: 36 }}
            />
            <p style={{ marginTop: 8, color: '#888' }}>
              {kpi?.kpi2.inconsistent || 0} uyğunsuz / {kpi?.kpi2.total || 0} ümumi
            </p>
          </Card>
        </Col>
      </Row>

      {/* Risk prioritet paylaşımı */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="Risk Prioritetləri">
            <Row gutter={16}>
              {stats?.risks.byPriority?.map((item: any) => (
                <Col key={item.priority} span={6}>
                  <Tag color={PRIORITY_COLORS[item.priority] || '#d9d9d9'} style={{ fontSize: 16, padding: '4px 12px' }}>
                    {item.priority}: {item.count}
                  </Tag>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
