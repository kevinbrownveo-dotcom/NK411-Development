import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, theme } from 'antd';
import {
  DashboardOutlined, SafetyOutlined, BugOutlined, ExclamationCircleOutlined,
  AlertOutlined, ToolOutlined, FileProtectOutlined, AuditOutlined,
  DatabaseOutlined, SwapOutlined, LogoutOutlined, UserOutlined,
  LaptopOutlined, NodeIndexOutlined,
  TeamOutlined, SafetyCertificateOutlined, ApiOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Sistem İdarəçisi',
  risk_manager: 'Risk Meneceri',
  asset_owner: 'Aktiv Sahibi',
  incident_coordinator: 'İnsident Koordinatoru',
  auditor: 'Auditor',
  dxeit_rep: 'DXƏIT Nümayəndəsi',
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isAdmin } = usePermission();
  const { token: themeToken } = theme.useToken();

  const baseMenuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/assets', icon: <LaptopOutlined />, label: 'Aktivlər' },
    { key: '/assets-map', icon: <NodeIndexOutlined />, label: 'Aktiv Xəritəsi (D3)' },
    { key: '/threats', icon: <AlertOutlined />, label: 'Təhdidlər' },
    { key: '/vulnerabilities', icon: <BugOutlined />, label: 'Boşluqlar' },
    { key: '/risks', icon: <ExclamationCircleOutlined />, label: 'Risqlər' },
    { key: '/incidents', icon: <SafetyOutlined />, label: 'İnsidentlər' },
    { key: '/solutions', icon: <ToolOutlined />, label: 'Həllər' },
    { key: '/requirements', icon: <FileProtectOutlined />, label: 'Tələblər və Hədlər' },
    { key: '/reconciliations', icon: <SwapOutlined />, label: 'Uzlaşdırma' },
    { key: '/audit', icon: <AuditOutlined />, label: 'Audit Jurnalı' },
  ];

  const adminMenuItems = isAdmin() ? [
    { type: 'divider' as const },
    {
      key: 'admin',
      icon: <SettingOutlined />,
      label: 'Admin Panel',
      children: [
        { key: '/admin/users', icon: <TeamOutlined />, label: 'İstifadəçilər' },
        { key: '/admin/roles', icon: <SafetyCertificateOutlined />, label: 'Rollar & İcazələr' },
        { key: '/admin/ldap', icon: <ApiOutlined />, label: 'LDAP / AD' },
      ],
    },
  ] : [];

  const menuItems = [...baseMenuItems, ...adminMenuItems];

  const userMenuItems = [
    {
      key: 'role',
      label: <Text type="secondary">{ROLE_LABELS[user?.role || ''] || user?.role}</Text>,
      disabled: true,
    },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Çıxış', danger: true },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: themeToken.colorBgContainer }}
      >
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
        }}>
          <DatabaseOutlined style={{ fontSize: 24, color: themeToken.colorPrimary }} />
          {!collapsed && (
            <Text strong style={{ marginLeft: 8, fontSize: 14 }}>Risklər Reyestri</Text>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: themeToken.colorBgContainer,
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
        }}>
          <Dropdown menu={{
            items: userMenuItems,
            onClick: ({ key }) => { if (key === 'logout') logout(); },
          }}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <Text>{user?.fullName || user?.full_name}</Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
