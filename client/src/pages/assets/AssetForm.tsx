import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import api from '../../services/api';
import { Asset } from '../../types';

interface AssetFormProps {
  visible: boolean;
  record: Asset | null;
  onClose: () => void;
  onSuccess: () => void;
  apiPath: string;
}

export default function AssetForm({ visible, record, onClose, onSuccess, apiPath }: AssetFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (record) {
      form.setFieldsValue({
        ...record,
        last_review: record.last_review ? dayjs(record.last_review) : undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        category: 'əsas',
        sub_category: 'informasiya',
        value: 3,
        criticality: 'orta',
        status: 'aktiv',
        last_review: dayjs(),
      });
    }
  }, [visible, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        ...values,
        last_review: values.last_review?.format('YYYY-MM-DD'),
      };

      if (record) {
        await api.put(`${apiPath}/${record.id}`, payload);
        message.success('Aktiv yeniləndi');
      } else {
        await api.post(apiPath, payload);
        message.success('Aktiv yaradıldı');
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
      title={record ? 'Aktivi redaktə et' : 'Yeni aktiv'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={720}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Ad" rules={[{ required: true, message: 'Ad məcburidir' }]}>
          <Input />
        </Form.Item>

        <Form.Item name="category" label="Kateqoriya" rules={[{ required: true }]}> 
          <Select
            options={[
              { value: 'əsas', label: 'əsas' },
              { value: 'dəstəkləyici', label: 'dəstəkləyici' },
            ]}
          />
        </Form.Item>

        <Form.Item name="sub_category" label="Alt kateqoriya" rules={[{ required: true }]}> 
          <Select
            options={[
              { value: 'informasiya', label: 'informasiya' },
              { value: 'hardware', label: 'hardware' },
              { value: 'software', label: 'software' },
              { value: 'şəbəkə', label: 'şəbəkə' },
              { value: 'insan', label: 'insan' },
              { value: 'fiziki', label: 'fiziki' },
            ]}
          />
        </Form.Item>

        <Form.Item name="value" label="Dəyər (1-5)" rules={[{ required: true }]}> 
          <InputNumber min={1} max={5} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="criticality" label="Kritiklik" rules={[{ required: true }]}> 
          <Select
            options={[
              { value: 'çox_aşağı', label: 'çox_aşağı' },
              { value: 'aşağı', label: 'aşağı' },
              { value: 'orta', label: 'orta' },
              { value: 'yüksək', label: 'yüksək' },
              { value: 'kritik', label: 'kritik' },
            ]}
          />
        </Form.Item>

        <Form.Item name="location" label="Yerləşmə" rules={[{ required: true }]}> 
          <Input />
        </Form.Item>

        <Form.Item name="status" label="Status" rules={[{ required: true }]}> 
          <Select
            options={[
              { value: 'aktiv', label: 'aktiv' },
              { value: 'planlaşdırılan', label: 'planlaşdırılan' },
              { value: 'köhnəlmiş', label: 'köhnəlmiş' },
              { value: 'ləğv_edilmiş', label: 'ləğv_edilmiş' },
            ]}
          />
        </Form.Item>

        <Form.Item name="last_review" label="Son baxış tarixi" rules={[{ required: true }]}> 
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item name="description" label="Təsvir">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
