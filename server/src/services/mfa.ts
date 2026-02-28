import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const APP_NAME = 'NK411 Risk Registry';

export interface MfaSetupResult {
    secret: string;      // base32 encoded secret
    qrCodeUrl: string;   // data:image/png;base64,...
    otpauthUrl: string;  // otpauth://totp/...
}

/**
 * Generate a new TOTP secret + QR code for first-time MFA setup
 */
export function generateMfaSecret(userEmail: string): Promise<MfaSetupResult> {
    const secret = speakeasy.generateSecret({
        name: `${APP_NAME} (${userEmail})`,
        issuer: APP_NAME,
        length: 32,
    });

    return QRCode.toDataURL(secret.otpauth_url || '')
        .then(qrCodeUrl => ({
            secret: secret.base32,
            qrCodeUrl,
            otpauthUrl: secret.otpauth_url || '',
        }));
}

/**
 * Verify a TOTP token against a secret
 * @param secret - base32 encoded secret
 * @param token - 6-digit TOTP code from authenticator app
 * @param window - time steps to allow (default 1 = ±30 seconds)
 */
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window,
    });
}

/**
 * Generate backup codes (one-time recovery codes)
 * Returns both plaintext (for user) and hashed (for DB storage)
 */
export function generateBackupCodes(count: number = 8): { plain: string[]; hashed: string[] } {
    const crypto = require('crypto');
    const codes: string[] = [];
    const hashed: string[] = [];

    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F1B2C9"
        codes.push(code);
        hashed.push(crypto.createHash('sha256').update(code).digest('hex'));
    }

    return { plain: codes, hashed };
}

/**
 * Verify a backup code against stored hashes
 * Returns the index of the matching code (to mark as used), or -1
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): number {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
    return hashedCodes.indexOf(hash);
}
