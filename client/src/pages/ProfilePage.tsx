import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { validatePassword } from '../utils/passwordPolicy';
import MfaSetup from '../components/common/MfaSetup';

const { Title } = Typography;

export default function ProfilePage() {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        full_name: user.fullName,
        department: user.department,
        position: user.position,
      });
    }
  }, [user, form]);

  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      await api.put('/auth/profile', values);
      message.success('Profil məlumatları yeniləndi. Dəyişikliklərin tam tətbiqi üçün sistemə yenidən daxil olmaq lazım gələ bilər.');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Profil yenilənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (values: any) => {
    if (values.new_password !== values.confirm_password) {
      message.error('Yeni şifrə və təkrarı uyğun gəlmir');
      return;
    }

    setPwLoading(true);
    try {
      await api.put('/auth/profile/password', {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      message.success('Şifrəniz uğurla yeniləndi');
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Şifrə yenilənərkən xəta baş verdi');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={3}>
        <UserOutlined /> Profil Ayarları
      </Title>

      <Card style={{ marginBottom: 24 }}>
        <Title level={5}>Şəxsi Məlumatlar</Title>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateProfile}
        >
          <Form.Item label="Email">
            <Input value={user?.email} disabled />
          </Form.Item>

          <Form.Item label="Rol">
            <Input value={user?.role} disabled />
          </Form.Item>

          <Form.Item
            name="full_name"
            label="Ad və Soyad"
            rules={[{ required: true, message: 'Ad və soyad daxil edilməlidir' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="department" label="Şöbə">
            <Input />
          </Form.Item>

          <Form.Item name="position" label="Vəzifə">
            <Input />
          </Form.Item>

          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            Yadda Saxla
          </Button>
        </Form>
      </Card>

      <div style={{ marginBottom: 24 }}>
        <MfaSetup />
      </div>

      <Card>
        <Title level={5}>
          <LockOutlined /> Şifrəni Dəyişdir
        </Title>
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleUpdatePassword}
        >
          <Form.Item
            name="current_password"
            label="Cari Şifrə"
            rules={[{ required: true, message: 'Cari şifrəni daxil edin' }]}
          >
            <Input.Password />
          </Form.Item>

          <Divider />

          <Form.Item
            name="new_password"
            label="Yeni Şifrə"
            rules={[
              { required: true, message: 'Yeni şifrəni daxil edin' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const check = validatePassword(value); // Utils-dan funksiya
                  return check.valid ? Promise.resolve() : Promise.reject(new Error(check.message));
                }
              }
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="Yeni Şifrə (təkrar)"
            dependencies={['new_password']}
            rules={[
              { required: true, message: 'Yeni şifrəni təkrar daxil edin' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Şifrələr uyğun gəlmir!'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={pwLoading}>
            Şifrəni Yenilə
          </Button>
        </Form>
      </Card>
    </div>
  );
}
