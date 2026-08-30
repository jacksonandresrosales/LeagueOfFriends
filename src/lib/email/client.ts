import { Resend } from 'resend';

function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('Falta la configuración de RESEND_API_KEY en el servidor.');
  }
  return key;
}

let resendInstance: Resend | null = null;

export function getResendClient(): Resend {
  if (resendInstance) return resendInstance;
  resendInstance = new Resend(getResendApiKey());
  return resendInstance;
}
