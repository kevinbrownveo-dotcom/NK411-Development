import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Layout } from 'antd';
import { LockOutlined, MailOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError('');
    try {
      await login(values.email, values.password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Giriş zamanı xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <DatabaseOutlined style={{ fontSize: 48, color: '#1677ff' }} />
          <Title level={3} style={{ marginTop: 16, marginBottom: 4 }}>
            Risklər Reyestri
          </Title>
          <Text type="secondary">İnformasiya Təhlükəsizliyi Riskləri Portalı</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        <Form onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="email" rules={[{ required: true, message: 'Email daxil edin' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Şifrə daxil edin' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Şifrə" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Daxil ol
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Layout>
  );
}
