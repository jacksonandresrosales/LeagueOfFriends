'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Key,
  LockKey,
  ShieldCheck,
  SignIn,
  UserPlus,
} from '@phosphor-icons/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SummonerCaptcha } from '@/components/auth/summoner-captcha';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

type Mode = 'sign-in' | 'sign-up' | 'reset';
type ResetStep = 'email' | 'otp' | 'password' | 'success';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [resendCooldown, setResendCooldown] = useState(0);
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

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setResetStep('email');
    setOtpDigits(['', '', '', '', '', '']);
    setShowPassword(false);
    setShowConfirmation(false);
    setEmailAlreadyExists(null);
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
    const email = String(formData.get('email') ?? '').trim();
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

        if (!captchaVerified) {
          setError('Por favor, completa la verificación de seguridad de invocador.');
          setSubmitting(false);
          return;
        }

        // 2.1 Verificar si el correo ya existe antes de intentar registrarlo
        try {
          const checkRes = await fetch('/api/auth/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const checkData = await checkRes.json();
          if (checkData.exists) {
            setEmailAlreadyExists(email);
            setError('');
            setSubmitting(false);
            return;
          }
        } catch {
          // Si la comprobación de red falla, el backend de Supabase responderá
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });

        if (signUpError) {
          if (
            signUpError.message?.toLowerCase().includes('already registered') ||
            signUpError.message?.toLowerCase().includes('user already exists')
          ) {
            setEmailAlreadyExists(email);
            setError('');
            setSubmitting(false);
            return;
          }
          throw signUpError;
        }

        // Desconectamos cualquier sesión automática inmediata para dar el flujo de login manual solicitado
        await supabase.auth.signOut({ scope: 'local' });
        setRegisteredEmail(email);
        setMode('sign-in');
        setShowPassword(false);
        setShowConfirmation(false);
        setCaptchaVerified(false);
        setEmailAlreadyExists(null);
        setMessage('¡Cuenta creada con éxito! Ahora inicia sesión con tu correo y contraseña.');
        setSubmitting(false);
        return;
      }

      // 3. INICIO DE SESIÓN
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('No pudimos iniciar sesión. Revisa tus datos o restablece tu contraseña.');
        return;
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
      <aside className="auth-brand-panel">
        <div className="brand">
          <span className="brand-mark">LF</span>
          <span className="brand-name">
            LEAGUE<br />OF FRIENDS
          </span>
        </div>

        <div className="auth-brand-copy">
          <p className="eyebrow">Compite con tu círculo cercano</p>
          <h1>Domina la grieta con tus amigos.</h1>
          <p>
            Crea retos personalizados, compara estadísticas cara a cara y sigue tu ascenso en las clasificatorias con datos oficiales de Riot Games.
          </p>
        </div>

        <div className="auth-security-note">
          <ShieldCheck size={20} weight="fill" />
          <span>Datos en tiempo real · Riot Games API & Resend</span>
        </div>
      </aside>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
      {mode === 'reset' && resetStep === 'otp' ? (
        <>
          <h2>Verifica el código</h2>
          <p className="auth-description">
            Ingresa el código de 6 dígitos que enviamos a <strong>{recoveryEmail}</strong>.
          </p>
        </>
      ) : mode === 'reset' && resetStep === 'password' ? (
        <>
          <h2>Nueva contraseña</h2>
          <p className="auth-description">
            Crea una nueva contraseña segura para tu cuenta.
          </p>
        </>
      ) : mode === 'reset' && resetStep === 'success' ? (
        <>
          <h2>¡Todo listo!</h2>
          <p className="auth-description">
            Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tus nuevas credenciales.
          </p>
        </>
      ) : mode === 'reset' ? (
        <>
          <h2>Recupera el acceso</h2>
          <p className="auth-description">
            Ingresa tu correo y te enviaremos un código de verificación de 6 dígitos a tu bandeja.
          </p>
        </>
      ) : mode === 'sign-up' ? (
        <>
          <h2>Crea tu cuenta</h2>
          <p className="auth-description">
            Prepara tu perfil antes de vincular tu cuenta de League of Legends.
          </p>
        </>
      ) : (
        <>
          <h2>Vuelve a la grieta</h2>
          <p className="auth-description">
            Entra para seguir tus retos y comparar tu progreso competitivo.
          </p>
        </>
      )}

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

      {mode === 'reset' && resetStep === 'success' ? (
        <div style={{ marginTop: '24px' }}>
          <button
            type="button"
            className="auth-submit"
            onClick={() => changeMode('sign-in')}
          >
            <span>Iniciar sesión</span>
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
                    defaultValue={registeredEmail || recoveryEmail}
                    key={registeredEmail}
                    required
                  />
                </div>
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

          {emailAlreadyExists ? (
            <div className="email-exists-card" role="alert">
              <div className="email-exists-header">
                <ShieldCheck size={20} weight="fill" />
                <span>Correo ya registrado</span>
              </div>
              <p className="email-exists-desc">
                El correo <strong>{emailAlreadyExists}</strong> ya tiene una cuenta activa en LeagueOfFriends.
              </p>
              <div className="email-exists-buttons">
                <button
                  type="button"
                  className="email-exists-btn-login"
                  onClick={() => {
                    const mail = emailAlreadyExists;
                    setEmailAlreadyExists(null);
                    setRegisteredEmail(mail);
                    changeMode('sign-in');
                  }}
                >
                  <SignIn size={16} weight="bold" />
                  <span>Iniciar sesión</span>
                </button>
                <button
                  type="button"
                  className="email-exists-btn-reset"
                  onClick={() => {
                    const mail = emailAlreadyExists;
                    setEmailAlreadyExists(null);
                    setRecoveryEmail(mail);
                    changeMode('reset');
                  }}
                >
                  <Key size={16} weight="bold" />
                  <span>Recuperar clave</span>
                </button>
              </div>
            </div>
          ) : null}

          {mode === 'sign-up' && !emailAlreadyExists ? (
            <SummonerCaptcha
              verified={captchaVerified}
              onVerify={() => {
                setCaptchaVerified(true);
                setError('');
              }}
            />
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
