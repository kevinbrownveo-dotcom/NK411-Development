import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, message } from 'antd';
import api from '../../services/api';
import { Solution } from '../../types';

interface SolutionFormProps {
  visible: boolean;
  record: Solution | null;
  onClose: () => void;
  onSuccess: () => void;
  apiPath: string;
}

export default function SolutionForm({ visible, record, onClose, onSuccess, apiPath }: SolutionFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
      form.setFieldsValue({
        type: 'qabaqlayıcı',
        solution_kind: 'texniki',
        is_ai: false,
        is_certified: false,
        source: 'daxili',
      });
    }
  }, [visible, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        ...values,
        technology: values.technology || null,
        effectiveness: values.effectiveness ?? null,
        cost_level: values.cost_level || null,
        certification_link: values.certification_link || null,
        description: values.description || null,
        playbook: values.playbook || null,
      };

      if (record) {
        await api.put(`${apiPath}/${record.id}`, payload);
        message.success('Həll yeniləndi');
      } else {
        await api.post(apiPath, payload);
        message.success('Həll yaradıldı');
      }
      onSuccess();
    } catch (error) {
      if ((error as any)?.errorFields) return;
      message.error('Yadda saxlama zamanı xəta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={record ? 'Həlli redaktə et' : 'Yeni həll'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={760}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Ad" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="type" label="Növ" rules={[{ required: true }]}>
          <Select options={[
            { value: 'qabaqlayıcı', label: 'qabaqlayıcı' },
            { value: 'nəzarətedici', label: 'nəzarətedici' },
            { value: 'təshihedici', label: 'təshihedici' },
            { value: 'bərpaedici', label: 'bərpaedici' },
          ]} />
        </Form.Item>

        <Form.Item name="solution_kind" label="Xarakter" rules={[{ required: true }]}>
          <Select options={[
            { value: 'texniki', label: 'texniki' },
            { value: 'təşkilati', label: 'təşkilati' },
          ]} />
        </Form.Item>

        <Form.Item name="technology" label="Texnologiya">
          <Select allowClear options={[
            { value: 'SIEM', label: 'SIEM' },
            { value: 'DLP', label: 'DLP' },
            { value: 'UEBA', label: 'UEBA' },
            { value: 'Firewall', label: 'Firewall' },
            { value: 'EDR', label: 'EDR' },
            { value: 'WAF', label: 'WAF' },
            { value: 'Şifrələmə', label: 'Şifrələmə' },
            { value: 'Digər', label: 'Digər' },
          ]} />
        </Form.Item>

        <Form.Item name="effectiveness" label="Effektivlik (1-10)">
          <InputNumber min={1} max={10} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="cost_level" label="Xərc səviyyəsi">
          <Select allowClear options={[
            { value: 'aşağı', label: 'aşağı' },
            { value: 'orta', label: 'orta' },
            { value: 'yüksək', label: 'yüksək' },
          ]} />
        </Form.Item>

        <Form.Item name="source" label="Mənbə" rules={[{ required: true }]}>
          <Select options={[
            { value: 'dxeit_kataloqu', label: 'dxeit_kataloqu' },
            { value: 'daxili', label: 'daxili' },
            { value: 'vendor', label: 'vendor' },
          ]} />
        </Form.Item>

        <Form.Item name="description" label="Təsvir">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item name="playbook" label="Playbook">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="certification_link" label="Sertifikasiya linki">
          <Input />
        </Form.Item>

        <Form.Item name="is_ai" label="Süni intellekt" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="is_certified" label="Sertifikatlı" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}