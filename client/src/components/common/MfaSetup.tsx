import React, { useState } from 'react';
import { Card, Button, Typography, Input, message, Alert, Space, Steps, List, Divider } from 'antd';
import { SafetyCertificateOutlined, QrcodeOutlined, KeyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const { Title, Text, Paragraph } = Typography;

export default function MfaSetup() {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [qrUrl, setQrUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState('');

    const initMfaSetup = async () => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/mfa/setup');
            setQrUrl(data.qrCodeUrl);
            setSecret(data.secret);
            setCurrentStep(1);
        } catch (err: any) {
            message.error(err.response?.data?.error || 'MFA hazırlığı zamanı xəta baş verdi');
        } finally {
            setLoading(false);
        }
    };

    const confirmMfa = async () => {
        if (!code || code.length !== 6) {
            message.warning('6 rəqəmli kodu daxil edin');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/auth/mfa/confirm', { code });
            setBackupCodes(data.backupCodes);
            setCurrentStep(2);
            message.success('Təbrik edirik, MFA uğurla aktivləşdirildi!');
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Kod yalnışdır və ya xəta baş verdi');
        } finally {
            setLoading(false);
        }
    };

    const disableMfa = async () => {
        if (!window.confirm('MFA-nı ləğv etmək istədiyinizə əminsiniz?')) return;
        setLoading(true);
        try {
            await api.post('/auth/mfa/disable');
            message.success('MFA ləğv edildi.');
            window.location.reload(); // Re-fetch user context
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Xəta baş verdi');
        } finally {
            setLoading(false);
        }
    };

    // Əgər istifadəçinin MFA-sı artıq aktivdirsə (API-dan gələn user.mfa_enabled oxunur, lakin mfa_enabled user obyektdə yoxdursa getAuth()-dan alınmalıdır, amma hələlik UI-nı idarə edək)
    // Biz sadəcə Setup flow-u veririk.

    return (
        <Card>
            <Title level={5}>
                <SafetyCertificateOutlined /> İkimərhələli Təsdiqləmə (MFA)
            </Title>

            {user?.mfa_enabled ? (
                <Alert
                    message="MFA Aktivdir"
                    description="Hesabınız İkimərhələli Təsdiqləmə (Google Authenticator) ilə qorunur."
                    type="success"
                    showIcon
                    action={
                        <Button size="small" danger onClick={disableMfa} loading={loading}>
                            Ləğv et
                        </Button>
                    }
                />
            ) : (
                <>
                    <Paragraph type="secondary">
                        Hesabınızın təhlükəsizliyini artırmaq üçün İkimərhələli Təsdiqləməni (TOTP) aktivləşdirin.
                    </Paragraph>

                    {currentStep === 0 && (
                        <Button type="primary" onClick={initMfaSetup} loading={loading} icon={<QrcodeOutlined />}>
                            MFA Aktivləşdirməyə Başla
                        </Button>
                    )}

                    {currentStep > 0 && (
                        <Steps
                            current={currentStep - 1}
                            items={[
                                { title: 'QR Kod Oxut' },
                                { title: 'Kodu Təsdiqlə' },
                                { title: 'Ehtiyat Kodlar' },
                            ]}
                            style={{ padding: '24px 0' }}
                        />
                    )}

                    {currentStep === 1 && (
                        <Space direction="vertical" size="large" style={{ width: '100%', alignItems: 'center' }}>
                            <Alert message="Google Authenticator və ya Microsoft Authenticator tətbiqi ilə bu QR kodu oxudun." type="info" />
                            {qrUrl && <img src={qrUrl} alt="MFA QR Code" style={{ border: '1px solid #d9d9d9', padding: 8, borderRadius: 8 }} />}
                            <Text type="secondary">Və ya manual olaraq bu gizli açarı daxil edin:</Text>
                            <Paragraph copyable style={{ letterSpacing: 2, background: '#f5f5f5', padding: '4px 8px', borderRadius: 4 }}>
                                <Text strong>{secret}</Text>
                            </Paragraph>

                            <Divider />

                            <Title level={5}>Tətbiqdəki 6 rəqəmli kodu daxil edin</Title>
                            <Input
                                placeholder="000000"
                                maxLength={6}
                                value={code}
                                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', width: 200 }}
                            />
                            <Space>
                                <Button onClick={() => setCurrentStep(0)}>İmtina et</Button>
                                <Button type="primary" onClick={confirmMfa} loading={loading} disabled={code.length !== 6}>
                                    Təsdiqlə
                                </Button>
                            </Space>
                        </Space>
                    )}

                    {currentStep === 2 && (
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Alert
                                message="MFA Aktivləşdirildi!"
                                description="Zəhmət olmasa aşağıdakı ehtiyat kodlarını kopyalayıb təhlükəsiz yerdə saxlayın. Telefonunuzu itirdikdə bunlardan istifadə edə bilərsiniz. Hər kod yalnız bir dəfə istifadə edilə bilər."
                                type="success"
                                showIcon
                                icon={<CheckCircleOutlined />}
                            />
                            <Card size="small" style={{ background: '#fafafa' }}>
                                <List
                                    grid={{ gutter: 16, column: 2 }}
                                    dataSource={backupCodes}
                                    renderItem={item => (
                                        <List.Item>
                                            <Text code copyable style={{ fontSize: '1.1rem', letterSpacing: 2 }}>{item}</Text>
                                        </List.Item>
                                    )}
                                />
                            </Card>
                            <Button type="primary" block onClick={() => window.location.reload()}>
                                Başa Düşdüm, Davam et
                            </Button>
                        </Space>
                    )}
                </>
            )}
        </Card>
    );
}
