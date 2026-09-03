'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Key,
  LockKey,
  ShieldCheck,
  SpinnerGap,
  User,
  UserPlus,
  WarningCircle,
} from '@phosphor-icons/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

type Mode = 'sign-in' | 'sign-up' | 'reset';
type ResetStep = 'email' | 'otp' | 'password' | 'success';
type EmailStatus = 'idle' | 'checking' | 'available' | 'registered';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [inputEmail, setInputEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('lof_remembered_email') || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [emailCheckStatus, setEmailCheckStatus] = useState<EmailStatus>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Temporizador para reenvío de OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Validación de disponibilidad de correo en tiempo real para modo registro
  useEffect(() => {
    if (mode !== 'sign-up') return;

    const clean = inputEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@') || clean.length < 5 || !clean.includes('.')) {
      const resetTimer = setTimeout(() => setEmailCheckStatus('idle'), 0);
      return () => clearTimeout(resetTimer);
    }

    const timer = setTimeout(async () => {
      setEmailCheckStatus('checking');
      try {
        const res = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: clean }),
        });
        if (!res.ok) {
          setEmailCheckStatus('idle');
          return;
        }
        const data = await res.json();
        if (data.exists === true) {
          setEmailCheckStatus('registered');
        } else {
          setEmailCheckStatus('available');
        }
      } catch {
        setEmailCheckStatus('idle');
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [inputEmail, mode]);

  async function handleEmailBlur() {
    if (mode !== 'sign-up') return;
    const clean = inputEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@') || clean.length < 5 || !clean.includes('.')) return;
    setEmailCheckStatus('checking');
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });
      if (!res.ok) {
        setEmailCheckStatus('idle');
        return;
      }
      const data = await res.json();
      if (data.exists === true) {
        setEmailCheckStatus('registered');
      } else {
        setEmailCheckStatus('available');
      }
    } catch {
      setEmailCheckStatus('idle');
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setResetStep('email');
    setOtpDigits(['', '', '', '', '', '']);
    setShowPassword(false);
    setShowConfirmation(false);
    setEmailCheckStatus('idle');
    setMessage('');
    setError('');
  }

  // Manejo de cambio en casillas de OTP
  function handleOtpChange(index: number, value: string) {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  // Manejo de retroceso (Backspace) en casillas OTP
  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  // Manejo de pegar código completo de 6 dígitos
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

  // Reenviar código OTP
  async function handleResendCode() {
    if (resendCooldown > 0 || !recoveryEmail) return;
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/send-recovery-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al reenviar el código.');
      } else {
        setMessage('Hemos enviado un nuevo código de 6 dígitos a tu correo.');
        setResendCooldown(60);
      }
    } catch {
      setError('Error al contactar con el servicio de correo.');
    } finally {
      setSubmitting(false);
    }
  }

  // Submit principal
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!isSupabaseConfigured()) {
      setError('Falta configurar Supabase para usar el acceso.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? inputEmail).trim().toLowerCase();
    const password = String(formData.get('password') ?? '');
    const confirmation = String(formData.get('confirmation') ?? '');

    setSubmitting(true);
    const supabase = getSupabaseClient();

    try {
      // 1. FLUJO DE RECUPERACIÓN DE CONTRASEÑA CON OTP DE 6 DÍGITOS Y RESEND
      if (mode === 'reset') {
        // Paso 1: Enviar código al correo
        if (resetStep === 'email') {
          if (!email) {
            setError('Ingresa tu correo electrónico.');
            setSubmitting(false);
            return;
          }

          const res = await fetch('/api/auth/send-recovery-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.error || 'Error al enviar el código de verificación.');
            setSubmitting(false);
            return;
          }

          setRecoveryEmail(email);
          setResetStep('otp');
          setResendCooldown(60);
          setMessage(`Código de 6 dígitos enviado a ${email}.`);
          setSubmitting(false);
          return;
        }

        // Paso 2: Validar que se ingresaron los 6 dígitos
        if (resetStep === 'otp') {
          const otpCode = otpDigits.join('');
          if (otpCode.length < 6) {
            setError('Ingresa los 6 dígitos del código de verificación.');
            setSubmitting(false);
            return;
          }

          setResetStep('password');
          setMessage('Código listo. Ahora ingresa tu nueva contraseña.');
          setSubmitting(false);
          return;
        }

        // Paso 3: Guardar nueva contraseña validando el OTP en el backend
        if (resetStep === 'password') {
          if (!password || password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            setSubmitting(false);
            return;
          }

          if (password !== confirmation) {
            setError('Las contraseñas no coinciden.');
            setSubmitting(false);
            return;
          }

          const otpCode = otpDigits.join('');
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: recoveryEmail,
              code: otpCode,
              password,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.error || 'No se pudo actualizar la contraseña.');
            setSubmitting(false);
            return;
          }

          setResetStep('success');
          setMessage('¡Tu contraseña ha sido actualizada exitosamente!');
          setSubmitting(false);
          return;
        }
      }

      // 2. REGISTRO
      if (mode === 'sign-up') {
        const rawDisplayName = String(formData.get('displayName') ?? '').trim();

        if (!rawDisplayName) {
          setError('Ingresa un nombre de invocador o usuario.');
          setSubmitting(false);
          return;
        }

        if (rawDisplayName.length < 3) {
          setError('El nombre de invocador debe tener al menos 3 caracteres.');
          setSubmitting(false);
          return;
        }

        if (rawDisplayName.length > 16) {
          setError('El nombre de invocador no puede tener más de 16 caracteres.');
          setSubmitting(false);
          return;
        }

        const safeDisplayName = rawDisplayName.slice(0, 16);

        if (!email || !email.includes('@')) {
          setError('Ingresa un correo electrónico válido.');
          setSubmitting(false);
          return;
        }

        if (!password || password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          setSubmitting(false);
          return;
        }

        if (password !== confirmation) {
          setError('Las contraseñas no coinciden.');
          setSubmitting(false);
          return;
        }

        if (emailCheckStatus === 'registered') {
          setError('Este correo ya está registrado. Por favor inicia sesión.');
          setSubmitting(false);
          return;
        }

        // 2. REGISTRO DIRECTO A TRAVÉS DE NUESTRA API SEGURA
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            displayName: safeDisplayName,
          }),
        });

        const regData = await regRes.json();

        if (!regRes.ok || !regData.success) {
          setError(regData.error || 'No fue posible crear la cuenta. Inténtalo de nuevo.');
          setSubmitting(false);
          return;
        }

        // Iniciar sesión automáticamente
        const { error: autoSignInError } = await supabase.auth.signInWithPassword({ email, password });
        if (autoSignInError) {
          setInputEmail(email);
          setMode('sign-in');
          setShowPassword(false);
          setShowConfirmation(false);
          setEmailCheckStatus('idle');
          setMessage('¡Cuenta creada con éxito! Inicia sesión con tus credenciales.');
          setSubmitting(false);
          return;
        }

        try {
          if (rememberMe) {
            localStorage.setItem('lof_remembered_email', email);
          }
        } catch {
          // Fallback silencioso
        }

        // Activar pantalla de bienvenida y redirigir
        setRegistrationSuccess(true);
        setError('');
        setMessage('');

        setTimeout(() => {
          router.replace('/');
        }, 1800);
        return;
      }

      // 3. INICIO DE SESIÓN
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('No pudimos iniciar sesión. Revisa tus datos o restablece tu contraseña.');
        return;
      }

      try {
        if (rememberMe) {
          localStorage.setItem('lof_remembered_email', email);
        } else {
          localStorage.removeItem('lof_remembered_email');
        }
      } catch {
        // Fallback silencioso
      }

      router.replace('/');
    } catch {
      setError('No fue posible completar la solicitud. Inténtalo de nuevo en unos minutos.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link className="brand" href="/" aria-label="LeagueOfFriends, inicio">
          <span className="brand-mark">LF</span>
          <span className="brand-name">
            LEAGUE
            <br />
            OF FRIENDS
          </span>
        </Link>
        <div className="auth-brand-copy">
          <p className="eyebrow">Acceso Competitivo</p>
          <h1>Tu Círculo. Tu Nivel.</h1>
          <p>
            Compite con amigos, sigue tu progreso en tiempo real y participa en retos privados.
          </p>
        </div>
        <div className="auth-security-note">
          <ShieldCheck size={20} weight="bold" />
          <span>Acceso seguro mediante encriptación bcrypt & Supabase</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <Link className="brand" href="/" aria-label="LeagueOfFriends, inicio">
            <span className="brand-mark">LF</span>
            <span className="brand-name">
              LEAGUE
              <br />
              OF FRIENDS
            </span>
          </Link>

          <header className="auth-header">
            <p className="eyebrow">
              {mode === 'sign-in'
                ? 'Iniciar sesión'
                : mode === 'sign-up'
                  ? 'Crear cuenta'
                  : 'Recuperación de cuenta'}
            </p>
            <h2>
              {mode === 'sign-in'
                ? 'Entrar a la Grieta'
                : mode === 'sign-up'
                  ? 'Únete al Círculo'
                  : resetStep === 'otp'
                    ? 'Código de Verificación'
                    : resetStep === 'password'
                      ? 'Nueva Contraseña'
                      : resetStep === 'success'
                        ? 'Acceso Restablecido'
                        : 'Recuperar Contraseña'}
            </h2>
            <p>
              {mode === 'sign-in'
                ? 'Ingresa tu correo y contraseña para ver tu rendimiento.'
                : mode === 'sign-up'
                  ? 'Crea tu perfil y comienza a medirte con tus amigos.'
                  : resetStep === 'otp'
                    ? 'Ingresa el código de 6 dígitos que enviamos a tu correo.'
                    : resetStep === 'password'
                      ? 'Establece una nueva contraseña segura para tu cuenta.'
                      : resetStep === 'success'
                        ? 'Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.'
                        : 'Te enviaremos un código de seguridad de 6 dígitos para recuperar tu acceso.'}
            </p>
          </header>

          {message ? (
            <div className="auth-feedback" role="status">
              <Check size={16} weight="bold" />
              <span>{message}</span>
            </div>
          ) : null}

          {error ? (
            <div className="auth-feedback is-error" role="alert">
              <span>{error}</span>
            </div>
          ) : null}

          {registrationSuccess ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '28px 12px 16px',
                animation: 'fadeIn 0.3s ease-out',
              }}
            >
              <div
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid var(--line)',
                  boxShadow: '4px 4px 0px var(--line)',
                  marginBottom: '20px',
                }}
              >
                <CheckCircle size={44} weight="fill" />
              </div>

              <span className="eyebrow" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
                ¡Registro Completado!
              </span>

              <h2 style={{ font: '900 24px/1.15 var(--font-display)', textTransform: 'uppercase', margin: '0 0 12px' }}>
                ¡Bienvenido a LeagueOfFriends!
              </h2>

              <p style={{ font: '600 13px/1.5 var(--font-mono)', color: 'var(--muted)', maxWidth: '320px', margin: '0 0 24px' }}>
                Tu cuenta ha sido creada exitosamente. Preparando tu perfil y entrando a la arena...
              </p>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 18px',
                  background: 'var(--surface-alt)',
                  border: '2px solid var(--line)',
                  font: '800 11px/1 var(--font-mono)',
                  textTransform: 'uppercase',
                  boxShadow: '2px 2px 0px var(--line)',
                }}
              >
                <SpinnerGap size={18} weight="bold" className="animate-spin" />
                <span>Redirigiendo a tu panel...</span>
              </div>
            </div>
          ) : mode === 'reset' && resetStep === 'success' ? (
            <div style={{ display: 'grid', gap: '16px', marginTop: '12px' }}>
              <button
                type="button"
                className="auth-submit"
                onClick={() => {
                  changeMode('sign-in');
                  setInputEmail(recoveryEmail);
                }}
              >
                <span>Iniciar sesión ahora</span>
                <ArrowRight size={18} weight="bold" />
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === 'reset' && resetStep === 'otp' ? (
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
                        required
                      />
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0 || submitting}
                      className="auth-inline-link"
                      style={{ margin: 0, opacity: resendCooldown > 0 ? 0.6 : 1, cursor: resendCooldown > 0 ? 'default' : 'pointer' }}
                    >
                      {resendCooldown > 0 ? `Reenviar código en ${resendCooldown}s` : 'Reenviar código'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setResetStep('email')}
                      className="auth-inline-link"
                      style={{ margin: 0 }}
                    >
                      Cambiar correo
                    </button>
                  </div>
                </div>
              ) : mode === 'reset' && resetStep === 'password' ? (
                <>
                  <div className="field-group">
                    <label className="eyebrow" htmlFor="auth-password">
                      Nueva contraseña
                    </label>
                    <div className="auth-input">
                      <LockKey size={18} weight="bold" />
                      <input
                        id="auth-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        autoComplete="new-password"
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
                    <label className="eyebrow" htmlFor="auth-confirmation">
                      Confirmar nueva contraseña
                    </label>
                    <div className="auth-input">
                      <Key size={18} weight="bold" />
                      <input
                        id="auth-confirmation"
                        name="confirmation"
                        type={showConfirmation ? 'text' : 'password'}
                        placeholder="Repite la contraseña"
                        autoComplete="new-password"
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
                </>
              ) : (
                <>
                  {mode === 'sign-up' ? (
                    <div className="field-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <label className="eyebrow" htmlFor="auth-username">
                          Nombre de Invocador / Usuario
                        </label>
                        <small style={{ font: '700 9px var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Máx. 16 caracteres
                        </small>
                      </div>
                      <div className="auth-input">
                        <User size={18} weight="bold" />
                        <input
                          id="auth-username"
                          name="displayName"
                          type="text"
                          placeholder="Ej. Faker o Jackson"
                          autoComplete="nickname"
                          maxLength={16}
                          required
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="field-group">
                    <label className="eyebrow" htmlFor="auth-email">
                      Correo electrónico
                    </label>
                    <div className="auth-input">
                      <EnvelopeSimple size={18} weight="bold" />
                      <input
                        id="auth-email"
                        name="email"
                        type="email"
                        placeholder="tu@correo.com"
                        autoComplete="email"
                        value={inputEmail}
                        onChange={(e) => {
                          setInputEmail(e.target.value);
                          setError('');
                        }}
                        onBlur={handleEmailBlur}
                        required
                      />
                      {mode === 'sign-up' && (
                        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingLeft: '4px' }}>
                          {emailCheckStatus === 'checking' && (
                            <span title="Comprobando disponibilidad..." style={{ display: 'inline-flex' }}>
                              <SpinnerGap size={20} weight="bold" className="animate-spin" style={{ color: 'var(--muted)' }} />
                            </span>
                          )}
                          {emailCheckStatus === 'available' && (
                            <span title="Correo disponible" style={{ display: 'inline-flex' }}>
                              <CheckCircle size={20} weight="fill" style={{ color: '#10b981' }} />
                            </span>
                          )}
                          {emailCheckStatus === 'registered' && (
                            <span title="Correo ya registrado" style={{ display: 'inline-flex' }}>
                              <WarningCircle size={20} weight="fill" style={{ color: 'var(--accent-bright)' }} />
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {mode === 'sign-up' && emailCheckStatus === 'registered' && (
                      <div className="email-status-feedback is-registered" role="alert">
                        <span>⚠️ Este correo ya está registrado</span>
                        <button
                          type="button"
                          onClick={() => {
                            changeMode('sign-in');
                          }}
                        >
                          Iniciar sesión →
                        </button>
                      </div>
                    )}

                    {mode === 'sign-up' && emailCheckStatus === 'available' && (
                      <div className="email-status-feedback is-available">
                        <span>✓ Correo disponible para registrar</span>
                      </div>
                    )}
                  </div>

                  {mode !== 'reset' ? (
                    <div className="field-group">
                      <label className="eyebrow" htmlFor="auth-password">
                        Contraseña
                      </label>
                      <div className="auth-input">
                        <LockKey size={18} weight="bold" />
                        <input
                          id="auth-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Tu contraseña secreta"
                          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
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
                  ) : null}

                  {mode === 'sign-up' ? (
                    <div className="field-group">
                      <label className="eyebrow" htmlFor="auth-confirmation">
                        Confirmar contraseña
                      </label>
                      <div className="auth-input">
                        <LockKey size={18} weight="bold" />
                        <input
                          id="auth-confirmation"
                          name="confirmation"
                          type={showConfirmation ? 'text' : 'password'}
                          placeholder="Repite la contraseña"
                          autoComplete="new-password"
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
                  ) : null}
                </>
              )}

              {mode === 'sign-in' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0 18px', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--accent)',
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{ font: '800 11px/1 var(--font-mono)', textTransform: 'uppercase', color: 'var(--ink)' }}>
                      Recordar mi cuenta
                    </span>
                  </label>

                  <button
                    type="button"
                    className="auth-inline-link"
                    style={{ margin: 0, fontSize: '11px', textTransform: 'none' }}
                    onClick={() => changeMode('reset')}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              ) : null}

              <button className="auth-submit" type="submit" disabled={submitting}>
                <span>
                  {submitting
                    ? 'Procesando...'
                    : mode === 'reset' && resetStep === 'otp'
                      ? 'Continuar'
                      : mode === 'reset' && resetStep === 'password'
                        ? 'Guardar contraseña'
                        : mode === 'reset'
                          ? 'Enviar código'
                          : mode === 'sign-up'
                            ? 'Crear cuenta'
                            : 'Iniciar sesión'}
                </span>
                {mode === 'reset' && resetStep === 'password' ? (
                  <Check size={18} weight="bold" />
                ) : mode === 'sign-up' ? (
                  <UserPlus size={18} weight="bold" />
                ) : (
                  <ArrowRight size={18} weight="bold" />
                )}
              </button>
            </form>
          )}
        </div>

        {!registrationSuccess ? (
          <div className="auth-actions">
            {mode === 'sign-in' ? (
              <>
                <p>
                  ¿No tienes cuenta todavía?{' '}
                  <button type="button" onClick={() => changeMode('sign-up')}>
                    Crear una cuenta
                  </button>
                </p>
                <p>
                  ¿Olvidaste tu contraseña?{' '}
                  <button type="button" onClick={() => changeMode('reset')}>
                    Recuperar acceso
                  </button>
                </p>
              </>
            ) : mode === 'sign-up' ? (
              <p>
                ¿Ya tienes cuenta?{' '}
                <button type="button" onClick={() => changeMode('sign-in')}>
                  Iniciar sesión
                </button>
              </p>
            ) : (
              <button type="button" className="auth-back" onClick={() => changeMode('sign-in')}>
                <ArrowLeft size={16} weight="bold" />
                <span>Volver a iniciar sesión</span>
              </button>
            )}
          </div>
        ) : null}

        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--line)', textAlign: 'center', width: '100%', maxWidth: '380px' }}>
          <p style={{ font: '800 11px var(--font-mono)', color: 'var(--muted)', margin: '0 0 6px', textTransform: 'uppercase' }}>
            Desarrollado por{' '}
            <a
              href="https://github.com/jacksonandresrosales"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--ink)', textDecoration: 'underline' }}
            >
              Jackson Ocaña
            </a>
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', font: '700 10px var(--font-mono)', color: 'var(--muted)' }}>
            <Link href="/terminos" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Términos
            </Link>
            <span>·</span>
            <Link href="/privacidad" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Privacidad
            </Link>
            <span>·</span>
            <a
              href="https://github.com/jacksonandresrosales/LeagueOfFriends"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              GitHub
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
