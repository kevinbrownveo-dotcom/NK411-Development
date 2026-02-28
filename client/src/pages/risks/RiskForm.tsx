import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, message, Switch, Divider, Typography } from 'antd';
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
  const [showFinancial, setShowFinancial] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (record) {
      form.setFieldsValue(record);
      if (record.has_financial_assessment) {
        setShowFinancial(true);
        api.get(`${apiPath}/${record.id}/financial`).then(res => {
          if (res.data) {
            form.setFieldsValue({
              financial: res.data
            });
          }
        }).catch(() => {});
      } else {
        setShowFinancial(false);
      }
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
        await api.put(`${apiPath}/${record.id}`, { ...payload, has_financial_assessment: showFinancial });
        if (showFinancial) {
          const finValues = form.getFieldValue('financial');
          await api.post(`${apiPath}/${record.id}/financial`, finValues);
        }
        message.success('Risk yeniləndi');
      } else {
        const createPayload = {
          ...payload,
          has_financial_assessment: showFinancial,
          financial_assessment: showFinancial ? values.financial : null
        };
        await api.post(apiPath, createPayload);
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

        <Divider orientation="left">Maliyyə Riski (Financial Exposure)</Divider>
        <Form.Item label="Maliyyə qiymətləndirilməsini aktivləşdir">
          <Switch checked={showFinancial} onChange={setShowFinancial} />
        </Form.Item>

        {showFinancial && (
          <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
              NK-411 Qanun §4.2.3.5 üzrə kəmiyyət analizi
            </Typography.Text>

            <Form.Item name={['financial', 'asset_monetary_value']} label="Aktivin Maliyyə Dəyəri (AV - AZN)" rules={[{ required: showFinancial }]}>
              <InputNumber min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name={['financial', 'exposure_factor']} label="Təsir Faktoru (EF - %)" tooltip="Təhdid baş verdikdə aktivin itirilən dəyər faizi">
              <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} placeholder="Məsələn: 0.1 (10%)" />
            </Form.Item>

            <Form.Item name={['financial', 'annualized_rate_of_occurrence']} label="İllik Başvermə Tezliyi (ARO)" tooltip="İldə neçə dəfə baş verməsi gözlənilir">
              <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>

            {record && record.total_ale_value && (
              <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                Cari İllik Maliyyə Riski (ALE): {Number(record.total_ale_value).toLocaleString()} AZN
              </div>
            )}
          </div>
        )}
      </Form>
    </Modal>
  );
}