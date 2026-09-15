import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const encryptionKey = () => {
  const configured = process.env.ENCRYPTION_KEY;
  if (!configured) throw new Error('ENCRYPTION_KEY es obligatoria para cifrar datos sensibles');
  return crypto.createHash('sha256').update(configured).digest();
};

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password: string, stored: string): boolean {
  return bcrypt.compareSync(password, stored);
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}.${cipher.getAuthTag().toString('hex')}.${encrypted.toString('hex')}`;
}

export function decryptSecret(value: string): string {
  const [ivHex, tagHex, encryptedHex] = value.split('.');
  if (!ivHex || !tagHex || !encryptedHex) throw new Error('Secreto cifrado inválido');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
}

export function verifyTotp(code: unknown): boolean {
  return typeof code === 'string' && /^\d{6}$/.test(code) && code === process.env.DEV_TOTP_CODE;
}
