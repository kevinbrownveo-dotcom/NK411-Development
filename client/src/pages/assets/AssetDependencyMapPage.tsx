import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, Button, Typography, message, Empty } from 'antd';
import { ReloadOutlined, NodeIndexOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;

type NodeItem = {
  id: string;
  name: string;
  asset_code: string;
  criticality: string;
  category: string;
};

type LinkItem = {
  source: string;
  target: string;
  count: number;
};

const NODE_COLORS: Record<string, string> = {
  kritik: '#ef4444',
  yüksək: '#f97316',
  orta: '#f59e0b',
  aşağı: '#22c55e',
  çox_aşağı: '#3b82f6',
};

export default function AssetDependencyMapPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);

  const graphSummary = useMemo(() => ({
    nodeCount: nodes.length,
    linkCount: links.length,
  }), [nodes.length, links.length]);

  const fetchMap = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/assets/dependency-map');
      setNodes(data.nodes || []);
      setLinks(data.links || []);
    } catch {
      message.error('Asılılıq xəritəsi yüklənə bilmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMap();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const width = 1100;
    const height = 620;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(35));

    const link = svg
      .append('g')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.55)
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke-width', (d) => Math.max(1, Math.min(4, d.count)));

    const node = svg
      .append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', 14)
      .attr('fill', (d) => NODE_COLORS[d.criticality] || '#6b7280')
      .call(d3.drag<SVGCircleElement, NodeItem>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    node.append('title').text((d) => `${d.asset_code} — ${d.name}\n${d.criticality}`);

    const labels = svg
      .append('g')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d) => d.asset_code)
      .attr('font-size', 10)
      .attr('fill', '#111827')
      .attr('text-anchor', 'middle')
      .attr('dy', 28);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  if (!nodes.length && !loading) {
    return (
      <Card>
        <Title level={3} style={{ marginTop: 0 }}><NodeIndexOutlined /> Aktiv Asılılıq Xəritəsi</Title>
        <Empty description="Xəritə üçün hələ data yoxdur" />
      </Card>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}><NodeIndexOutlined /> Aktiv Asılılıq Xəritəsi</Title>
          <Text type="secondary">{graphSummary.nodeCount} aktiv, {graphSummary.linkCount} əlaqə</Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchMap}>Yenilə</Button>
      </div>

      <Card bodyStyle={{ padding: 8 }}>
        <svg ref={svgRef} style={{ width: '100%', height: 620 }} />
      </Card>
    </div>
  );
}
