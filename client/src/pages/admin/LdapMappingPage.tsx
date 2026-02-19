import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Space, Card, Typography, Modal, Form, Input,
  Select, Tag, Popconfirm, message, Alert, Badge,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ApiOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminApi } from '../../services/api';
import type { LdapGroupMapping, Role } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;

export default function LdapMappingPage() {
  const [mappings, setMappings] = useState<LdapGroupMapping[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ available?: boolean; message?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mapRes, roleRes] = await Promise.all([adminApi.getLdapMappings(), adminApi.getRoles()]);
      setMappings(mapRes.data);
      setRoles(roleRes.data);
    } catch {
      message.error('Məlumatlar yüklənərkən xəta');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await adminApi.testLdap();
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({ available: false, message: err.response?.data?.error || 'Bağlantı xətası' });
    } finally {
      setTesting(false);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await adminApi.createLdapMapping(values);
      message.success('LDAP mapping yaradıldı');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Xəta baş verdi');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteLdapMapping(id);
      message.success('Mapping silindi');
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Xəta baş verdi');
    }
  };

  const columns: ColumnsType<LdapGroupMapping> = [
    {
      title: 'LDAP Qrup DN', key: 'dn',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text code style={{ fontSize: 12 }}>{r.ldap_group_dn}</Text>
          {r.ldap_group_label && <Text type="secondary" style={{ fontSize: 12 }}>{r.ldap_group_label}</Text>}
        </Space>
      ),
    },
    {
      title: 'Sistem Rolu', key: 'role',
      render: (_, r) => <Tag color="blue">{r.role_label || r.role_name}</Tag>,
    },
    {
      title: '', key: 'actions',
      render: (_, r) => (
        <Popconfirm title="Bu mappingi silirsiniz?" onConfirm={() => handleDelete(r.id)} okText="Bəli" cancelText="Xeyr">
          <Button icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Title level={4} style={{ margin: 0 }}>LDAP / Active Directory İnteqrasiyası</Title>
        <Space>
          <Button icon={<ApiOutlined />} loading={testing} onClick={handleTest}>Bağlantı Testi</Button>
          <Button icon={<ReloadOutlined />} onClick={load} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
            Mapping Əlavə Et
          </Button>
        </Space>
      </Space>

      {testResult && (
        <Alert
          style={{ marginBottom: 16 }}
          type={testResult.available ? 'success' : 'error'}
          icon={testResult.available ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          message={testResult.message}
          showIcon
          closable
          onClose={() => setTestResult(null)}
        />
      )}

      <Alert
        type="info"
        message="LDAP Hibrid Rejim"
        description={
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>LDAP aktiv olduqda (<Text code>LDAP_ENABLED=true</Text>) istifadəçilər AD hesabı ilə daxil ola bilər</li>
            <li>LDAP əlçatmaz olduqda lokal şifrə avtomatik aktivləşir</li>
            <li>AD qrupunu aşağıdakı cədvəldə sistem roluna bind edin — giriş zamanı avtomatik tətbiq olunur</li>
          </ul>
        }
        style={{ marginBottom: 16 }}
      />

      <Table
        rowKey="id"
        dataSource={mappings}
        columns={columns}
        loading={loading}
        size="small"
        locale={{ emptyText: 'Hələ ki heç bir LDAP qrup mappingi yoxdur' }}
      />

      <Modal
        title="Yeni LDAP Qrup Mappingi"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        okText="Yarat"
        cancelText="Ləğv et"
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="ldap_group_dn"
            label="LDAP Qrup DN"
            rules={[{ required: true, message: 'Qrup DN tələb olunur' }]}
            extra="Misal: CN=RiskManagers,OU=Groups,DC=company,DC=com"
          >
            <Input placeholder="CN=GroupName,OU=Groups,DC=example,DC=com" />
          </Form.Item>
          <Form.Item name="ldap_group_label" label="Görünən Ad (istəyə bağlı)">
            <Input placeholder="məs. Risk Menecer Qrupu" />
          </Form.Item>
          <Form.Item name="role_id" label="Sistem Rolu" rules={[{ required: true, message: 'Rol seçin' }]}>
            <Select placeholder="Rolu seçin">
              {roles.map((r) => (
                <Option key={r.id} value={r.id}>
                  <Tag color={r.is_system ? 'blue' : 'green'} style={{ marginRight: 6 }}>
                    {r.is_system ? 'Sistem' : 'Xüsusi'}
                  </Tag>
                  {r.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
