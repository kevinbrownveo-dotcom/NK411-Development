import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, message } from 'antd';
import api from '../../services/api';
import { Threat } from '../../types';
import FieldLabelWithHelp from '../../components/common/FieldLabelWithHelp';

interface ThreatFormProps {
  visible: boolean;
  record: Threat | null;
  onClose: () => void;
  onSuccess: () => void;
  apiPath: string;
}

export default function ThreatForm({ visible, record, onClose, onSuccess, apiPath }: ThreatFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [requirements, setRequirements] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    if (!visible) return;

    api.get('/requirements', { params: { page: 1, limit: 200 } })
      .then((res) => {
        const options = (res.data.data || []).map((r: any) => ({
          value: r.id,
          label: `${r.req_code} — ${r.req_title}`,
        }));
        setRequirements(options);
      })
      .catch(() => setRequirements([]));

    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
      form.setFieldsValue({
        category: 'texniki',
        source: 'kənardan',
        intentionality: 'qərəzli',
        severity: 'orta',
        probability: 50,
        severity_law: 'orta',
        probability_band_law: 'p41_60',
        purpose: [],
      });
    }
  }, [visible, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        ...values,
        violated_activity_area: values.violated_activity_area || null,
      };

      if (record) {
        await api.put(`${apiPath}/${record.id}`, payload);
        message.success('Təhdid yeniləndi');
      } else {
        await api.post(apiPath, payload);
        message.success('Təhdid yaradıldı');
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
      title={record ? 'Təhdidi redaktə et' : 'Yeni təhdid'}
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

        <Form.Item name="category" label={<FieldLabelWithHelp fieldKey="threats.category" label="Kateqoriya" required />} rules={[{ required: true }]}>
          <Select options={[
            { value: 'texniki', label: 'texniki' },
            { value: 'fiziki', label: 'fiziki' },
            { value: 'insani', label: 'insani' },
            { value: 'prosessual', label: 'prosessual' },
            { value: 'xarici', label: 'xarici' },
          ]} />
        </Form.Item>

        <Form.Item name="source" label={<FieldLabelWithHelp fieldKey="threats.source" label="Mənbə" required />} rules={[{ required: true }]}>
          <Select options={[
            { value: 'kənardan', label: 'kənardan' },
            { value: 'daxildən', label: 'daxildən' },
            { value: 'hər_ikisi', label: 'hər_ikisi' },
          ]} />
        </Form.Item>

        <Form.Item name="purpose" label={<FieldLabelWithHelp fieldKey="threats.purpose" label="Məqsəd (multi)" required />} rules={[{ required: true, message: 'Ən azı 1 məqsəd seçin' }]}>
          <Select mode="tags" tokenSeparators={[',']} />
        </Form.Item>

        <Form.Item name="target_type" label={<FieldLabelWithHelp fieldKey="threats.target_type" label="Hədəf tipi" required />} rules={[{ required: true }]}> 
          <Select options={[
            { value: 'struktur', label: 'struktur' },
            { value: 'infrastruktur_komponenti', label: 'infrastruktur_komponenti' },
            { value: 'konfiqurasiya', label: 'konfiqurasiya' },
            { value: 'proses', label: 'proses' },
            { value: 'subyekt', label: 'subyekt' },
          ]} />
        </Form.Item>

        <Form.Item name="intentionality" label={<FieldLabelWithHelp fieldKey="threats.intentionality" label="Niyyət" required />} rules={[{ required: true }]}> 
          <Select options={[
            { value: 'qərəzli', label: 'qərəzli' },
            { value: 'təsadüfi', label: 'təsadüfi' },
            { value: 'axın_üzrə', label: 'axın_üzrə' },
          ]} />
        </Form.Item>

        <Form.Item name="severity" label={<FieldLabelWithHelp fieldKey="threats.severity" label="Ciddilik" required />} rules={[{ required: true }]}> 
          <Select options={[
            { value: 'çox_aşağı', label: 'çox_aşağı' },
            { value: 'aşağı', label: 'aşağı' },
            { value: 'orta', label: 'orta' },
            { value: 'yüksək', label: 'yüksək' },
            { value: 'kritik', label: 'kritik' },
          ]} />
        </Form.Item>

        <Form.Item name="probability" label="Ehtimal (0-100)" rules={[{ required: true }]}> 
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="severity_law" label="Qanun ciddiliyi" rules={[{ required: true }]}> 
          <Select options={[
            { value: 'çox_aşağı', label: 'çox_aşağı' },
            { value: 'aşağı', label: 'aşağı' },
            { value: 'orta', label: 'orta' },
            { value: 'yüksək', label: 'yüksək' },
            { value: 'kritik', label: 'kritik' },
          ]} />
        </Form.Item>

        <Form.Item name="probability_band_law" label={<FieldLabelWithHelp fieldKey="threats.probability_band_law" label="Probability band" required />} rules={[{ required: true }]}> 
          <Select options={[
            { value: 'p01_20', label: 'p01_20' },
            { value: 'p21_40', label: 'p21_40' },
            { value: 'p41_60', label: 'p41_60' },
            { value: 'p61_80', label: 'p61_80' },
            { value: 'p81_100', label: 'p81_100' },
          ]} />
        </Form.Item>

        <Form.Item name="violated_requirement_id" label="Pozulan tələb">
          <Select allowClear options={requirements} />
        </Form.Item>

        <Form.Item name="realization_tech" label={<FieldLabelWithHelp fieldKey="threats.realization_tech" label="Reallaşma texnikası" />}>
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
