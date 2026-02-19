import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Space, Card, Typography, Modal, Form, Input,
  Select, Tag, Popconfirm, message, Switch, Tooltip, Badge, Dropdown,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined,
  UnlockOutlined, KeyOutlined, ReloadOutlined, MoreOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { adminApi } from '../../services/api';
import type { User, Role } from '../../types';
import { validatePassword } from '../../utils/passwordPolicy';

const { Title, Text } = Typography;
const { Option } = Select;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwUser, setPwUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [pwForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        adminApi.getUsers({ page, limit: 20, search }),
        adminApi.getRoles(),
      ]);
      setUsers(usersRes.data.data);
      setTotal(usersRes.data.pagination.total);
      setRoles(rolesRes.data);
    } catch {
      message.error('Məlumatlar yüklənərkən xəta');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditUser(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (user: User) => {
    setEditUser(user);
    form.setFieldsValue({
      email: user.email, full_name: user.fullName || user.full_name,
      role_id: user.role_id, department: user.department, position: user.position,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editUser) {
        await adminApi.updateUser(editUser.id, values);
        message.success('İstifadəçi yeniləndi');
      } else {
        const pwResult = validatePassword(values.password);
        if (!pwResult.valid) { message.error(pwResult.message); return; }
        await adminApi.createUser(values);
        message.success('İstifadəçi yaradıldı');
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Xəta baş verdi');
    }
  };

  const handleDelete = async (user: User) => {
    try {
      await adminApi.deleteUser(user.id);
      message.success('İstifadəçi deaktiv edildi');
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Xəta baş verdi');
    }
  };

  const handleToggleActive = async (user: User, is_active: boolean) => {
    try {
      await adminApi.updateUser(user.id, { is_active });
      message.success(is_active ? 'Aktiv edildi' : 'Deaktiv edildi');
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Xəta baş verdi');
    }
  };

  const handleUnlock = async (user: User) => {
    try {
      await adminApi.unlockUser(user.id);
      message.success('Hesab kilidindən açıldı');
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Xəta baş verdi');
    }
  };

  const handleResetPw = async () => {
    try {
      const values = await pwForm.validateFields();
      const res = await adminApi.resetPassword(pwUser!.id, values.new_password);
      if (res.data.temporary_password) {
        Modal.success({
          title: 'Şifrə Sıfırlandı',
          content: (
            <div>
              <Text>Müvəqqəti şifrə:</Text>
              <br />
              <Text strong code copyable>{res.data.temporary_password}</Text>
              <br />
              <Text type="secondary">İstifadəçiyə bildirin — ilk girişdə dəyişdirsin.</Text>
            </div>
          ),
        });
      } else {
        message.success('Şifrə sıfırlandı');
      }
      setPwModalOpen(false);
      pwForm.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Xəta baş verdi');
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Ad', dataIndex: 'full_name', key: 'name',
      render: (_, r) => <Space direction="vertical" size={0}><Text strong>{r.fullName || r.full_name}</Text><Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text></Space>,
    },
    {
      title: 'Rol', key: 'role',
      render: (_, r) => <Tag color="blue">{r.role_label || r.role_name || r.role}</Tag>,
    },
    { title: 'Şöbə', dataIndex: 'department', key: 'department', responsive: ['lg'] as any },
    {
      title: 'Auth', dataIndex: 'auth_source', key: 'auth',
      render: (v) => <Tag color={v === 'ldap' ? 'purple' : 'default'}>{v?.toUpperCase() || 'LOCAL'}</Tag>,
      responsive: ['lg'] as any,
    },
    {
      title: 'Status', key: 'status',
      render: (_, r) => (
        <Space>
          <Switch size="small" checked={r.is_active} onChange={(v) => handleToggleActive(r, v)} />
          {r.locked_until && new Date(r.locked_until) > new Date() && (
            <Tooltip title={`Kilit: ${dayjs(r.locked_until).format('HH:mm')}`}>
              <Badge status="error" text="Kilitli" />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Son Giriş', dataIndex: 'last_login', key: 'last_login',
      render: (v) => v ? dayjs(v).format('DD.MM.YYYY HH:mm') : '—',
      responsive: ['xl'] as any,
    },
    {
      title: '', key: 'actions',
      render: (_, r) => (
        <Dropdown menu={{
          items: [
            { key: 'edit', icon: <EditOutlined />, label: 'Redaktə et', onClick: () => openEdit(r) },
            { key: 'pw', icon: <KeyOutlined />, label: 'Şifrə sıfırla', onClick: () => { setPwUser(r); setPwModalOpen(true); } },
            r.locked_until && new Date(r.locked_until) > new Date()
              ? { key: 'unlock', icon: <UnlockOutlined />, label: 'Kilidi aç', onClick: () => handleUnlock(r) }
              : null,
            { type: 'divider' as const },
            { key: 'delete', icon: <DeleteOutlined />, label: r.is_active ? 'Deaktiv et' : 'Aktiv et', danger: r.is_active, onClick: () => r.is_active ? handleDelete(r) : handleToggleActive(r, true) },
          ].filter(Boolean),
        }}>
          <Button icon={<MoreOutlined />} size="small" />
        </Dropdown>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Title level={4} style={{ margin: 0 }}>İstifadəçi İdarəetməsi</Title>
        <Space>
          <Input.Search placeholder="Axtar..." allowClear onSearch={setSearch} style={{ width: 220 }} />
          <Button icon={<ReloadOutlined />} onClick={load} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Yeni İstifadəçi</Button>
        </Space>
      </Space>

      <Table
        rowKey="id"
        dataSource={users}
        columns={columns}
        loading={loading}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (t) => `Cəmi ${t}` }}
        size="small"
      />

      {/* Yaratma / Redaktə Modalı */}
      <Modal
        title={editUser ? 'İstifadəçini Redaktə Et' : 'Yeni İstifadəçi Yarat'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editUser ? 'Yadda saxla' : 'Yarat'}
        cancelText="Ləğv et"
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editUser && (
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Düzgün email daxil edin' }]}>
              <Input />
            </Form.Item>
          )}
          {!editUser && (
            <Form.Item name="password" label="Şifrə" rules={[{ required: true, message: 'Şifrə tələb olunur' }]}
              extra="Min 8 simvol, böyük/kiçik hərf, rəqəm və xüsusi simvol (@$!%*?&_-#)">
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="full_name" label="Ad Soyad" rules={[{ required: true, message: 'Ad tələb olunur' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role_id" label="Rol">
            <Select placeholder="Rol seçin" allowClear>
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
          <Form.Item name="department" label="Şöbə">
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Vəzifə">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Şifrə Sıfırlama Modalı */}
      <Modal
        title={`Şifrə Sıfırla: ${pwUser?.fullName || pwUser?.full_name}`}
        open={pwModalOpen}
        onOk={handleResetPw}
        onCancel={() => { setPwModalOpen(false); pwForm.resetFields(); }}
        okText="Sıfırla"
        cancelText="Ləğv et"
      >
        <Form form={pwForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="new_password"
            label="Yeni Şifrə"
            extra="Boş buraxsanız avtomatik güclü şifrə yaradılacaq"
          >
            <Input.Password placeholder="Boş buraxın — avtomatik yaratmaq üçün" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
