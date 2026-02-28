import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Switch, Steps, Tag, message } from 'antd';
import dayjs from 'dayjs';
import api from '../../services/api';
import { Incident } from '../../types';

interface IncidentFormProps {
  visible: boolean;
  record: Incident | null;
  onClose: () => void;
  onSuccess: () => void;
  apiPath: string;
}

// Annex §6.1.5 — 13 ardıcıl mərhələ
const PHASE_LABELS: Record<string, string> = {
  detect: '1. Aşkarlama',
  notify: '2. Bildiriş',
  monitor: '3. Monitorinq',
  assess: '4. Qiymətləndirmə',
  block: '5. Bloklama',
  restore: '6. Bərpa',
  change: '7. Dəyişiklik idarəetmə',
  update_info: '8. Məlumat yeniləmə',
  improve: '9. Təkmilləşdirmə',
  failover: '10. Ehtiyat keçid',
  rollback: '11. Geri qaytarma',
  evidence: '12. Sübut toplama',
  anticrisis: '13. Anti-böhran',
};

const PHASE_ORDER = Object.keys(PHASE_LABELS);

export default function IncidentForm({ visible, record, onClose, onSuccess, apiPath }: IncidentFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [risks, setRisks] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    if (!visible) return;

    api.get('/risks', { params: { page: 1, limit: 200 } })
      .then((res) => {
        const options = (res.data.data || []).map((risk: any) => ({
          value: risk.id,
          label: `${risk.risk_code} — ${risk.name}`,
        }));
        setRisks(options);
      })
      .catch(() => setRisks([]));

    if (record) {
      form.setFieldsValue({
        ...record,
        detection_datetime: record.detection_datetime ? dayjs(record.detection_datetime) : undefined,
        occurrence_datetime: (record as any).occurrence_datetime ? dayjs((record as any).occurrence_datetime) : undefined,
        resolution_datetime: (record as any).resolution_datetime ? dayjs((record as any).resolution_datetime) : undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        type: 'digər',
        severity: 'P3_orta',
        detection_datetime: dayjs(),
        notify_dxeit: false,
        status: 'yeni',
      });
    }
  }, [visible, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        ...values,
        detection_datetime: values.detection_datetime?.toISOString(),
        occurrence_datetime: values.occurrence_datetime ? values.occurrence_datetime.toISOString() : null,
        resolution_datetime: values.resolution_datetime ? values.resolution_datetime.toISOString() : null,
        response_option: values.response_option || null,
        impact_law: values.impact_law || null,
        root_cause: values.root_cause || null,
        risk_id: values.risk_id || null,
      };

      if (record) {
        await api.put(`${apiPath}/${record.id}`, payload);
        message.success('İnsident yeniləndi');
      } else {
        await api.post(apiPath, payload);
        message.success('İnsident yaradıldı');
      }
      onSuccess();
    } catch (error) {
      if ((error as any)?.errorFields) return;
      message.error('Yadda saxlama zamanı xəta');
    } finally {
      setLoading(false);
    }
  };

  // Current phase index for Steps indicator
  const currentPhase = (record as any)?.response_phase || 'detect';
  const currentPhaseIdx = PHASE_ORDER.indexOf(currentPhase);

  return (
    <Modal
      title={record ? 'İnsidenti redaktə et' : 'Yeni insident'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={860}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        {/* ── 13-Phase Progress Indicator (Annex §6.1.5) ── */}
        {record && (
          <div style={{ marginBottom: 24, overflowX: 'auto' }}>
            <Tag color="blue" style={{ marginBottom: 8 }}>
              Cari mərhələ: {PHASE_LABELS[currentPhase] || currentPhase}
            </Tag>
            <Steps
              size="small"
              current={currentPhaseIdx >= 0 ? currentPhaseIdx : 0}
              items={PHASE_ORDER.map((key) => ({
                title: PHASE_LABELS[key],
              }))}
              direction="vertical"
              style={{ maxHeight: 260, overflowY: 'auto' }}
            />
          </div>
        )}

        <Form.Item name="title" label="Başlıq" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="description" label="Təsvir" rules={[{ required: true }]}>
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item name="risk_id" label="Risk">
          <Select allowClear options={risks} />
        </Form.Item>

        <Form.Item name="type" label="Növ" rules={[{ required: true }]}>
          <Select options={[
            { value: 'kiberhücum', label: 'kiberhücum' },
            { value: 'məlumat_sızması', label: 'məlumat_sızması' },
            { value: 'sistem_çöküşü', label: 'sistem_çöküşü' },
            { value: 'uyğunsuzluq', label: 'uyğunsuzluq' },
            { value: 'fiziki', label: 'fiziki' },
            { value: 'digər', label: 'digər' },
          ]} />
        </Form.Item>

        <Form.Item name="severity" label="Ciddilik" rules={[{ required: true }]}>
          <Select options={[
            { value: 'P1_kritik', label: 'P1_kritik' },
            { value: 'P2_yüksək', label: 'P2_yüksək' },
            { value: 'P3_orta', label: 'P3_orta' },
            { value: 'P4_aşağı', label: 'P4_aşağı' },
          ]} />
        </Form.Item>

        <Form.Item name="impact_law" label="Qanun təsiri">
          <Select allowClear options={[
            { value: 'çox_aşağı', label: 'çox_aşağı' },
            { value: 'aşağı', label: 'aşağı' },
            { value: 'orta', label: 'orta' },
            { value: 'yüksək', label: 'yüksək' },
            { value: 'kritik', label: 'kritik' },
          ]} />
        </Form.Item>

        <Form.Item name="response_option" label="Reaksiya seçimi">
          <Select allowClear options={[
            { value: 'aşkarlama', label: 'aşkarlama' },
            { value: 'bloklama', label: 'bloklama' },
            { value: 'bərpaetmə', label: 'bərpaetmə' },
            { value: 'anti_böhran', label: 'anti_böhran' },
            { value: 'sübut_toplama', label: 'sübut_toplama' },
            { value: 'ehtiyat_varianta_keçmə', label: 'ehtiyat_varianta_keçmə' },
          ]} />
        </Form.Item>

        <Form.Item name="detection_datetime" label="Aşkarlanma vaxtı" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
        </Form.Item>

        <Form.Item name="occurrence_datetime" label="Başvermə vaxtı">
          <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
        </Form.Item>

        <Form.Item name="resolution_datetime" label="Həll vaxtı">
          <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
        </Form.Item>

        <Form.Item name="root_cause" label="Kök səbəb">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
          <Select options={[
            { value: 'yeni', label: 'yeni' },
            { value: 'kateqoriyalaşdırılır', label: 'kateqoriyalaşdırılır' },
            { value: 'planlaşdırılır', label: 'planlaşdırılır' },
            { value: 'həll_edilir', label: 'həll_edilir' },
            { value: 'bağlı', label: 'bağlı' },
            { value: 'analiz', label: 'analiz' },
          ]} />
        </Form.Item>

        <Form.Item name="notify_dxeit" label="DXƏIT bildirimi" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}