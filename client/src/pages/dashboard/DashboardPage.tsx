import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Tag, Spin, Typography } from 'antd';
import {
  ExclamationCircleOutlined, AlertOutlined, BugOutlined,
  LaptopOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import { DashboardStats, KpiData } from '../../types';
import FieldLabelWithHelp from '../../components/common/FieldLabelWithHelp';
import DetailedKpiPanel from './DetailedKpiPanel';
import SmartTargetsWidget from './SmartTargetsWidget';

const { Title } = Typography;

const PRIORITY_COLORS: Record<string, string> = {
  kritik: '#f5222d',
  yüksək: '#fa8c16',
  orta: '#faad14',
  aşağı: '#52c41a',
};

// Risk Heat Map rəng matriksi (ehtimal × təsir → rəng)
function heatMapColor(prob: number, impact: number): string {
  const score = prob * impact;
  if (score >= 15) return '#f5222d';   // Kritik — qırmızı
  if (score >= 10) return '#fa541c';   // Yüksək — narıncı-qırmızı
  if (score >= 5) return '#faad14';   // Orta — sarı
  return '#52c41a';                     // Aşağı — yaşıl
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [kpiDetailed, setKpiDetailed] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/kpi'),
      api.get('/dashboard/kpi-detailed'),
    ]).then(([statsRes, kpiRes, detailedRes]) => {
      setStats(statsRes.data);
      setKpi(kpiRes.data);
      setKpiDetailed(detailedRes.data);
    }).catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const kpiColor = (pct: number | null) => {
    if (pct === null) return '#d9d9d9';
    if (pct >= 80) return '#52c41a';
    if (pct >= 60) return '#faad14';
    return '#f5222d';
  };

  // Heat map hazırlığı — 5×5 matris
  const heatMapGrid: Record<string, number> = {};
  stats?.heatMap?.forEach((item: any) => {
    const key = `${item.probability_factor}-${item.impact_max}`;
    heatMapGrid[key] = parseInt(item.count) || 0;
  });

  const probLabels = ['5 — Çox yüksək', '4 — Yüksək', '3 — Orta', '2 — Aşağı', '1 — Çox aşağı'];
  const impactLabels = ['1', '2', '3', '4', '5'];

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

      {/* KPI kartları */}
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

      {/* Risk Heat Map — 5×5 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="Risk Heat Map (Ehtimal × Təsir)">
            <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(5, 1fr)', gap: 2 }}>
              {/* Header row */}
              <div style={{ padding: 4, fontWeight: 600, textAlign: 'center' }}></div>
              {impactLabels.map((l) => (
                <div key={`h-${l}`} style={{ padding: 4, fontWeight: 600, textAlign: 'center', fontSize: 12 }}>
                  Təsir {l}
                </div>
              ))}
              {/* Data rows (top=5, bottom=1) */}
              {[5, 4, 3, 2, 1].map((prob, pi) => (
                <React.Fragment key={`row-${prob}`}>
                  <div style={{ padding: '8px 6px', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                    {probLabels[pi]}
                  </div>
                  {[1, 2, 3, 4, 5].map((impact) => {
                    const count = heatMapGrid[`${prob}-${impact}`] || 0;
                    return (
                      <div
                        key={`${prob}-${impact}`}
                        style={{
                          backgroundColor: count > 0 ? heatMapColor(prob, impact) : '#f0f0f0',
                          color: count > 0 ? '#fff' : '#999',
                          borderRadius: 4,
                          padding: 8,
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: 16,
                          minHeight: 44,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {count || '—'}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </Card>
        </Col>

        {/* Risk Prioritet + İnsident Status yan panel */}
        <Col xs={24} lg={10}>
          <Card title="Risk Prioritetləri" style={{ marginBottom: 16 }}>
            <Row gutter={[8, 8]}>
              {stats?.risks.byPriority?.map((item: any) => (
                <Col key={item.priority} span={12}>
                  <Tag color={PRIORITY_COLORS[item.priority] || '#d9d9d9'} style={{ fontSize: 16, padding: '6px 16px', width: '100%', textAlign: 'center' }}>
                    {item.priority}: {item.count}
                  </Tag>
                </Col>
              ))}
            </Row>
          </Card>
          <Card title="İnsident Statusları">
            <Row gutter={[8, 8]}>
              {stats?.incidents.byStatus?.map((item: any) => (
                <Col key={item.status} span={12}>
                  <Tag color={item.status === 'bağlı' ? 'green' : item.status === 'yeni' ? 'red' : 'processing'} style={{ fontSize: 14, padding: '4px 12px', width: '100%', textAlign: 'center' }}>
                    {item.status}: {item.count}
                  </Tag>
                </Col>
              ))}
              {(!stats?.incidents.byStatus || stats.incidents.byStatus.length === 0) && (
                <Col span={24}><p style={{ color: '#999' }}>Hələ heç bir insident yoxdur</p></Col>
              )}
            </Row>
          </Card>
          <SmartTargetsWidget kpi1Percent={kpi?.kpi1?.percentage ?? null} detailedData={kpiDetailed} />
        </Col>
      </Row>

      {/* §10.2 Detailed 10+ KPI Progress Indikatorları */}
      <DetailedKpiPanel data={kpiDetailed} loading={loading} />
    </div>
  );
}

