import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import api from '../../services/api';
import { Consequence } from '../../types';

interface ConsequenceFormProps {
    visible: boolean;
    record: Consequence | null;
    onClose: () => void;
    onSuccess: () => void;
    apiPath: string;
}

const SEVERITY_OPTIONS = [
    { value: 'çox_aşağı', label: 'Çox aşağı' },
    { value: 'aşağı', label: 'Aşağı' },
    { value: 'orta', label: 'Orta' },
    { value: 'yüksək', label: 'Yüksək' },
    { value: 'kritik', label: 'Kritik' },
];

const PROBABILITY_OPTIONS = [
    { value: 'p01_20', label: '1-20%' },
    { value: 'p21_40', label: '21-40%' },
    { value: 'p41_60', label: '41-60%' },
    { value: 'p61_80', label: '61-80%' },
    { value: 'p81_100', label: '81-100%' },
];

const CATEGORY_OPTIONS = [
    { value: 'continuity', label: 'Davamlılıq' },
    { value: 'reputasiya', label: 'Reputasiya' },
    { value: 'maliyyə', label: 'Maliyyə' },
    { value: 'hüquqi', label: 'Hüquqi' },
    { value: 'əməliyyat', label: 'Əməliyyat' },
    { value: 'texnoloji', label: 'Texnoloji' },
    { value: 'insan', label: 'İnsan' },
];

export default function ConsequenceForm({ visible, record, onClose, onSuccess, apiPath }: ConsequenceFormProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [risks, setRisks] = useState<{ id: string; risk_code: string; name: string }[]>([]);

    useEffect(() => {
        if (visible) {
            api.get('/risks', { params: { limit: 100 } }).then((res) => setRisks(res.data.data || [])).catch(() => { });
        }
    }, [visible]);

    useEffect(() => {
        if (!visible) return;
        if (record) {
            form.setFieldsValue(record);
        } else {
            form.resetFields();
            form.setFieldsValue({
                consequence_category: 'əməliyyat',
                severity_law: 'orta',
                probability_band_law: 'p41_60',
            });
        }
    }, [visible, record, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const payload = {
                ...values,
                related_threat_id: values.related_threat_id || null,
                related_requirement_id: values.related_requirement_id || null,
                evidence: values.evidence || null,
            };

            if (record) {
                await api.put(`${apiPath}/${record.id}`, payload);
                message.success('Fəsad yeniləndi');
            } else {
                await api.post(apiPath, payload);
                message.success('Fəsad yaradıldı');
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
            title={record ? 'Fəsadı redaktə et' : 'Yeni fəsad'}
            open={visible}
            onCancel={onClose}
            onOk={handleSubmit}
            confirmLoading={loading}
            width={700}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Form.Item name="risk_id" label="Risk" rules={[{ required: true }]}>
                    <Select
                        showSearch
                        optionFilterProp="label"
                        options={risks.map((r) => ({ value: r.id, label: `${r.risk_code} — ${r.name}` }))}
                    />
                </Form.Item>

                <Form.Item name="consequence_category" label="Fəsad kateqoriyası" rules={[{ required: true }]}>
                    <Select options={CATEGORY_OPTIONS} />
                </Form.Item>

                <Form.Item name="consequence_description" label="Təsvir" rules={[{ required: true }]}>
                    <Input.TextArea rows={3} />
                </Form.Item>

                <Form.Item name="probability_band_law" label="Ehtimal zolağı" rules={[{ required: true }]}>
                    <Select options={PROBABILITY_OPTIONS} />
                </Form.Item>

                <Form.Item name="severity_law" label="Ciddilik (hüquqi)" rules={[{ required: true }]}>
                    <Select options={SEVERITY_OPTIONS} />
                </Form.Item>

                <Form.Item name="evidence" label="Sübut / Əsas">
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    );
}
