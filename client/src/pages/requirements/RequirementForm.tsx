import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import api from '../../services/api';
import { Requirement } from '../../types';
import FieldLabelWithHelp from '../../components/common/FieldLabelWithHelp';

interface RequirementFormProps {
  visible: boolean;
  record: Requirement | null;
  onClose: () => void;
  onSuccess: () => void;
  apiPath: string;
}

const ACTIVITY_AREA_OPTIONS = [
  'ict', 'odeme_sistemleri', 'kritik_infra', 'elektron_hokumet', 'cloud',
  'network_ops', 'soc', 'data_center', 'finance_it', 'human_resources_it',
  'governance', 'compliance', 'identity_access', 'application_security',
  'incident_response', 'business_continuity',
].map((value) => ({ value, label: value }));

export default function RequirementForm({ visible, record, onClose, onSuccess, apiPath }: RequirementFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
      form.setFieldsValue({
        req_category: 'normativ_akt',
        source_type: 'normativ_akt',
        review_frequency: 'illik',
        status: 'draft',
        activity_area: [],
      });
    }
  }, [visible, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (record) {
        await api.put(`${apiPath}/${record.id}`, values);
        message.success('Tələb yeniləndi');
      } else {
        await api.post(apiPath, values);
        message.success('Tələb yaradıldı');
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
      title={record ? 'Tələbi redaktə et' : 'Yeni tələb'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={780}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="req_title" label="Başlıq" rules={[{ required: true }]}> 
          <Input />
        </Form.Item>

        <Form.Item name="req_description" label="Təsvir" rules={[{ required: true }]}> 
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item name="req_category" label="Kateqoriya" rules={[{ required: true }]}> 
          <Select options={[
            { value: 'normativ_akt', label: 'normativ_akt' },
            { value: 'standart', label: 'standart' },
            { value: 'müqavilə', label: 'müqavilə' },
            { value: 'öhdəlik', label: 'öhdəlik' },
            { value: 'qabaqcıl_təcrübə', label: 'qabaqcıl_təcrübə' },
            { value: 'praktik_tələbat', label: 'praktik_tələbat' },
          ]} />
        </Form.Item>

        <Form.Item name="source_type" label={<FieldLabelWithHelp fieldKey="requirements.source_type" label="Mənbə növü" required />} rules={[{ required: true }]}> 
          <Select options={[
            { value: 'normativ_akt', label: 'normativ_akt' },
            { value: 'standart', label: 'standart' },
            { value: 'müqavilə', label: 'müqavilə' },
            { value: 'öhdəlik', label: 'öhdəlik' },
            { value: 'qabaqcıl_təcrübə', label: 'qabaqcıl_təcrübə' },
            { value: 'praktik_tələbat', label: 'praktik_tələbat' },
          ]} />
        </Form.Item>

        <Form.Item name="source_ref" label="Mənbə ref" rules={[{ required: true }]}> 
          <Input />
        </Form.Item>

        <Form.Item name="activity_area" label={<FieldLabelWithHelp fieldKey="requirements.activity_area" label="Fəaliyyət sahəsi" required />} rules={[{ required: true, type: 'array', min: 1 }]}> 
          <Select mode="multiple" options={ACTIVITY_AREA_OPTIONS} />
        </Form.Item>

        <Form.Item name="owner_role" label="Məsul rol" rules={[{ required: true }]}> 
          <Input />
        </Form.Item>

        <Form.Item name="review_frequency" label="Baxış tezliyi" rules={[{ required: true }]}> 
          <Select options={[
            { value: 'rüblük', label: 'rüblük' },
            { value: 'yarımillik', label: 'yarımillik' },
            { value: 'illik', label: 'illik' },
          ]} />
        </Form.Item>

        <Form.Item name="status" label="Status" rules={[{ required: true }]}> 
          <Select options={[
            { value: 'draft', label: 'draft' },
            { value: 'aktiv', label: 'aktiv' },
            { value: 'köhnəlmiş', label: 'köhnəlmiş' },
          ]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
