import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, message } from 'antd';
import api from '../../services/api';
import { Risk } from '../../types';

interface RiskFormProps {
  visible: boolean;
  record: Risk | null;
  onClose: () => void;
  onSuccess: () => void;
  apiPath: string;
}

export default function RiskForm({ visible, record, onClose, onSuccess, apiPath }: RiskFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
      form.setFieldsValue({
        category: 'operativ',
        probability_factor: 3,
        technical_impact: 3,
        business_impact: 3,
        status: 'açıq',
        treatment_option: 'azalt',
      });
    }
  }, [visible, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        ...values,
        description: values.description || null,
        asset_value: values.asset_value ?? null,
        statistical_probability: values.statistical_probability ?? null,
        treatment_option: values.treatment_option || null,
        treatment_method: values.treatment_method || null,
        residual_risk_score: values.residual_risk_score ?? null,
        appetite_threshold: values.appetite_threshold ?? null,
      };

      if (record) {
        await api.put(`${apiPath}/${record.id}`, payload);
        message.success('Risk yeniləndi');
      } else {
        await api.post(apiPath, payload);
        message.success('Risk yaradıldı');
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
      title={record ? 'Riski redaktə et' : 'Yeni risk'}
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

        <Form.Item name="category" label="Kateqoriya" rules={[{ required: true }]}>
          <Select options={[
            { value: 'strateji', label: 'strateji' },
            { value: 'operativ', label: 'operativ' },
            { value: 'texniki', label: 'texniki' },
            { value: 'uyğunluq', label: 'uyğunluq' },
            { value: 'reputasiya', label: 'reputasiya' },
            { value: 'fiziki', label: 'fiziki' },
          ]} />
        </Form.Item>

        <Form.Item name="description" label="Təsvir">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item name="asset_value" label="Aktiv dəyəri">
          <InputNumber min={1} max={5} step={0.01} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="probability_factor" label="Ehtimal faktoru (1-5)" rules={[{ required: true }]}>
          <InputNumber min={1} max={5} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="statistical_probability" label="Statistik ehtimal (%)">
          <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="technical_impact" label="Texniki təsir (1-5)" rules={[{ required: true }]}>
          <InputNumber min={1} max={5} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="business_impact" label="Biznes təsiri (1-5)" rules={[{ required: true }]}>
          <InputNumber min={1} max={5} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="treatment_option" label="Emal seçimi">
          <Select allowClear options={[
            { value: 'qarşısını_al', label: 'qarşısını_al' },
            { value: 'azalt', label: 'azalt' },
            { value: 'başqa_tərəfə_ötür', label: 'başqa_tərəfə_ötür' },
            { value: 'qəbul_et', label: 'qəbul_et' },
          ]} />
        </Form.Item>

        <Form.Item name="treatment_method" label="Emal metodu">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="residual_risk_score" label="Qalıq risk skoru">
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="appetite_threshold" label="Risk apetiti həddi">
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
          <Select options={[
            { value: 'açıq', label: 'açıq' },
            { value: 'emalda', label: 'emalda' },
            { value: 'həll_edilib', label: 'həll_edilib' },
            { value: 'qəbul_edilib', label: 'qəbul_edilib' },
            { value: 'bağlı', label: 'bağlı' },
          ]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}