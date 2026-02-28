import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Layout, Space } from 'antd';
import { LockOutlined, MailOutlined, DatabaseOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login, verifyMfa } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Epic 4.2: MFA States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const onFinish = async (values: any) => {
    setLoading(true);
    setError('');
    try {
      if (mfaRequired) {
        await verifyMfa(tempToken, values.code);
      } else {
        const result = await login(values.email, values.password);
        if (result?.mfaRequired) {
          setMfaRequired(true);
          setTempToken(result.tempToken!);
          return;
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.error
        || err.message
        || 'Giriş zamanı xəta baş verdi';
      setError(msg);
      console.error('Login error:', err);
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

        {!mfaRequired ? (
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
        ) : (
          <Form onFinish={onFinish} layout="vertical" size="large">
            <Alert message="İkimərhələli Təsdiqləmə (MFA) aktivdir. Google Authenticator tətbiqindəki 6 rəqəmli kodu daxil edin." type="info" showIcon style={{ marginBottom: 16 }} />
            <Form.Item name="code" rules={[{ required: true, message: 'Kodu daxil edin' }, { len: 6, message: 'Kod 6 rəqəmli olmalıdır' }]}>
              <Input prefix={<SafetyCertificateOutlined />} placeholder="000000" autoComplete="one-time-code" maxLength={6} style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }} />
            </Form.Item>
            <Form.Item>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Təsdiqlə
                </Button>
                <Button type="link" onClick={() => { setMfaRequired(false); setTempToken(''); }} block>
                  Geri qayıt
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Card>
    </Layout>
  );
}
