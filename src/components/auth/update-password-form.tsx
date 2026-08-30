'use client';

import { ArrowLeft, ArrowRight, Check, EnvelopeSimple, Eye, EyeSlash, Key, LockKey, ShieldCheck } from '@phosphor-icons/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export function UpdatePasswordForm() {
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function handleOtpChange(index: number, value: string) {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);

    const nextFocusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextFocusIndex]?.focus();
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !email.includes('@')) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/send-recovery-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar el código.');
      } else {
        setStep('code');
        setResendCooldown(60);
        setMessage(`Código de 6 dígitos enviado a ${email}.`);
      }
    } catch {
      setError('Error al contactar el servicio de correo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Ingresa el código de 6 dígitos completo.');
      return;
    }

    if (!password || password.length < 6) {
      setError('La contraseña debe tener al minímo 6 caracteres.');
      return;
    }

    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo restablecer la contraseña.');
      } else {
        setStep('success');
        setMessage('¡Contraseña actualizada exitosamente!');
      }
    } catch {
      setError('Error al procesar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page-single">
      <section className="auth-form-panel" aria-labelledby="password-title">
        <div className="auth-form-wrap">
          <Link className="brand" href="/login">
            <span className="brand-mark">LF</span>
            <span className="brand-name">LEAGUE<br />OF FRIENDS</span>
          </Link>
          <p className="eyebrow" style={{ marginTop: '24px' }}>Seguridad de la cuenta</p>
          <h1 id="password-title">
            {step === 'success' ? '¡Todo Listo!' : step === 'code' ? 'Código y Contraseña' : 'Recuperar Cuenta'}
          </h1>
          <p className="auth-description">
            {step === 'success'
              ? 'Tu contraseña ha sido restablecida. Ya puedes ingresar a la plataforma.'
              : step === 'code'
                ? `Ingresa el código de 6 dígitos enviado a ${email} y tu nueva contraseña.`
                : 'Ingresa tu correo para recibir un código de verificación de 6 dígitos.'}
          </p>

          {message ? (
            <div className="auth-feedback" role="status">
              <ShieldCheck size={16} weight="bold" />
              <span>{message}</span>
            </div>
          ) : null}

          {error ? (
            <div className="auth-feedback is-error" role="alert">
              <ShieldCheck size={16} weight="bold" />
              <span>{error}</span>
            </div>
          ) : null}

          {step === 'email' ? (
            <form className="auth-form" onSubmit={handleSendCode}>
              <div className="field-group">
                <label className="eyebrow" htmlFor="reset-email">
                  Correo electrónico
                </label>
                <div className="auth-input">
                  <EnvelopeSimple size={18} weight="bold" />
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button className="auth-submit" type="submit" disabled={submitting}>
                <span>{submitting ? 'Enviando código...' : 'Enviar código de 6 dígitos'}</span>
                <ArrowRight size={18} weight="bold" />
              </button>
            </form>
          ) : step === 'code' ? (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <div className="field-group">
                <label className="eyebrow" htmlFor="otp-0">
                  Código de 6 dígitos
                </label>
                <div className="otp-inputs">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={idx === 0 ? handleOtpPaste : undefined}
                      className="otp-box"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label className="eyebrow" htmlFor="new-password">
                  Nueva contraseña
                </label>
                <div className="auth-input">
                  <LockKey size={18} weight="bold" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label className="eyebrow" htmlFor="new-confirmation">
                  Confirmar nueva contraseña
                </label>
                <div className="auth-input">
                  <Key size={18} weight="bold" />
                  <input
                    id="new-confirmation"
                    type={showConfirmation ? 'text' : 'password'}
                    placeholder="Repite tu contraseña"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmation(!showConfirmation)}
                    aria-label={showConfirmation ? 'Ocultar contraseña' : 'Ver contraseña'}
                    title={showConfirmation ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showConfirmation ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                  </button>
                </div>
              </div>

              <button className="auth-submit" type="submit" disabled={submitting}>
                <span>{submitting ? 'Guardando...' : 'Establecer nueva contraseña'}</span>
                <Check size={18} weight="bold" />
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={resendCooldown > 0 || submitting}
                  className="auth-inline-link"
                  style={{ margin: 0, opacity: resendCooldown > 0 ? 0.6 : 1, cursor: resendCooldown > 0 ? 'default' : 'pointer' }}
                >
                  {resendCooldown > 0 ? `Reenviar código en ${resendCooldown}s` : 'Reenviar código'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="auth-inline-link"
                  style={{ margin: 0 }}
                >
                  Cambiar correo
                </button>
              </div>
            </form>
          ) : (
            <div style={{ marginTop: '24px' }}>
              <Link href="/login" className="auth-submit" style={{ textDecoration: 'none' }}>
                <span>Iniciar sesión</span>
                <ArrowRight size={18} weight="bold" />
              </Link>
            </div>
          )}

          <div className="auth-actions" style={{ marginTop: '28px' }}>
            <Link className="auth-back" href="/login" style={{ margin: 0 }}>
              <ArrowLeft size={16} weight="bold" />
              <span>Volver a inicio de sesión</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
