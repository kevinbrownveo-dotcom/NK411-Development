import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import api from '../../services/api';
import { Threshold } from '../../types';

interface ThresholdFormProps {
    visible: boolean;
    record: Threshold | null;
    onClose: () => void;
    onSuccess: () => void;
    apiPath: string;
}

const THRESHOLD_TYPES = [
    { value: 'MAO', label: 'MAO' },
    { value: 'MBCO', label: 'MBCO' },
    { value: 'Maturity', label: 'Maturity' },
    { value: 'EAL', label: 'EAL' },
    { value: 'SLA', label: 'SLA' },
    { value: 'OLA', label: 'OLA' },
    { value: 'CIA', label: 'CIA' },
    { value: 'Reliability', label: 'Etibarlılıq' },
    { value: 'Priority', label: 'Prioritet' },
    { value: 'Criticality', label: 'Kritiklik' },
    { value: 'Regime', label: 'Rejim' },
    { value: 'DocumentationProtection', label: 'Sənəd Qoruması' },
    { value: 'Effectiveness', label: 'Effektivlik' },
];

const APPLIES_TO_TYPES = [
    { value: 'proses', label: 'Proses' },
    { value: 'servis', label: 'Servis' },
    { value: 'aktiv', label: 'Aktiv' },
    { value: 'rol', label: 'Rol' },
    { value: 'sənəd_reyestri', label: 'Sənəd Reyestri' },
    { value: 'bölmə', label: 'Bölmə' },
    { value: 'idarəetmə_aləti', label: 'İdarəetmə Aləti' },
    { value: 'texniki_alət', label: 'Texniki Alət' },
];

const REVIEW_FREQ = [
    { value: 'rüblük', label: 'Rüblük' },
    { value: 'yarımillik', label: 'Yarımillik' },
    { value: 'illik', label: 'İllik' },
];

export default function ThresholdForm({ visible, record, onClose, onSuccess, apiPath }: ThresholdFormProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible) return;
        if (record) {
            form.setFieldsValue(record);
        } else {
            form.resetFields();
            form.setFieldsValue({
                threshold_type: 'SLA',
                applies_to_type: 'servis',
                review_frequency: 'illik',
            });
        }
    }, [visible, record, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const payload = {
                ...values,
                applies_to_id: values.applies_to_id || null,
                unit: values.unit || null,
                evidence_link: values.evidence_link || null,
                owner_role: values.owner_role || null,
                review_frequency: values.review_frequency || null,
            };

            if (record) {
                await api.put(`${apiPath}/${record.id}`, payload);
                message.success('Həd yeniləndi');
            } else {
                await api.post(apiPath, payload);
                message.success('Həd yaradıldı');
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
            title={record ? 'Hədi redaktə et' : 'Yeni həd'}
            open={visible}
            onCancel={onClose}
            onOk={handleSubmit}
            confirmLoading={loading}
            width={700}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Form.Item name="threshold_type" label="Həd növü" rules={[{ required: true }]}>
                    <Select options={THRESHOLD_TYPES} />
                </Form.Item>

                <Form.Item name="applies_to_type" label="Tətbiq olunur" rules={[{ required: true }]}>
                    <Select options={APPLIES_TO_TYPES} />
                </Form.Item>

                <Form.Item name="value" label="Dəyər" rules={[{ required: true }]}>
                    <Input placeholder="Məs: 99.9%, 4 saat, level-3" />
                </Form.Item>

                <Form.Item name="unit" label="Vahid">
                    <Input placeholder="%, hours, days, level" />
                </Form.Item>

                <Form.Item name="owner_role" label="Sahibi (rol)">
                    <Input />
                </Form.Item>

                <Form.Item name="review_frequency" label="Nəzərdən keçirmə tezliyi">
                    <Select allowClear options={REVIEW_FREQ} />
                </Form.Item>

                <Form.Item name="evidence_link" label="Sübut linki">
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    );
}
