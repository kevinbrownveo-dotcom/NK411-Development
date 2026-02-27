import nodemailer from 'nodemailer';
import { logger } from './logger';

interface MailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

class MailService {
    private transporter: nodemailer.Transporter | null = null;
    private isConfigured = false;

    constructor() {
        this.init();
    }

    private init() {
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

        if (!SMTP_HOST || !SMTP_PORT) {
            logger.warn('SMTP konfiqurasiyası tapılmadı. Email bildirişləri deaktiv edildi.');
            return;
        }

        this.transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT, 10),
            secure: parseInt(SMTP_PORT, 10) === 465, // 465 üçün true, 587 üçün false
            auth: (SMTP_USER && SMTP_PASS) ? {
                user: SMTP_USER,
                pass: SMTP_PASS,
            } : undefined,
        });

        this.isConfigured = true;
        logger.info(`Mail xidməti aktivləşdirildi: ${SMTP_HOST}:${SMTP_PORT}`);
    }

    public async sendMail(options: MailOptions): Promise<boolean> {
        if (!this.isConfigured || !this.transporter) {
            logger.warn(`Mail göndərilmədi (SMTP konfiqurasiya yoxdur): ${options.subject} -> ${options.to}`);
            return false;
        }

        try {
            await this.transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@risk-registry.az',
                ...options,
            });
            logger.info(`Mail uğurla göndərildi: ${options.subject} -> ${options.to}`);
            return true;
        } catch (error) {
            logger.error(`Mail göndərilərkən xəta: ${options.subject} -> ${options.to}`, error);
            return false;
        }
    }

    // --- Şablonlar ---

    public async sendPasswordResetNotification(to: string, ip: string): Promise<void> {
        await this.sendMail({
            to,
            subject: 'Profil şifrəniz dəyişdirildi',
            text: `Sizin profil şifrəniz yenilənmişdir.\nIP: ${ip}\nVaxt: ${new Date().toLocaleString('az-AZ')}\nƏgər bunu siz etməmisinizsə, dərhal adminlə əlaqə saxlayın.`,
        });
    }

    public async sendAccountLockNotification(to: string, ip: string, minutes: number): Promise<void> {
        await this.sendMail({
            to,
            subject: 'Hesabınız müvəqqəti kilidləndi',
            text: `Çox sayda uğursuz giriş cəhdinə görə hesabınız ${minutes} dəqiqəliyində kilidləndi.\nIP: ${ip}\nVaxt: ${new Date().toLocaleString('az-AZ')}`,
        });
    }
}

export const mailService = new MailService();
