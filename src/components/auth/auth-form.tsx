'use client';

import { ArrowLeft, ArrowRight, EnvelopeSimple, LockKey, ShieldCheck, UserPlus } from '@phosphor-icons/react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

type Mode = 'sign-in' | 'sign-up' | 'reset';

const copy: Record<Mode, { title: string; description: string; submit: string }> = {
  'sign-in': {
    title: 'Vuelve a la grieta',
    description: 'Entra para seguir tus retos y comparar tu progreso.',
    submit: 'Iniciar sesión',
  },
  'sign-up': {
    title: 'Crea tu cuenta',
    description: 'Prepara tu perfil antes de vincular tu cuenta de League.',
    submit: 'Crear cuenta',
  },
  reset: {
    title: 'Recupera el acceso',
    description: 'Te enviaremos un enlace seguro para elegir una contraseña nueva.',
    submit: 'Enviar enlace',
  },
};

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage('');
    setError('');
  }

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

    if (mode === 'sign-up' && password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseClient();

    try {
      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/actualizar-contrasena`,
        });
        if (resetError) throw resetError;
        setMessage('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
        return;
      }

      if (mode === 'sign-up') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          router.replace('/');
        } else {
          setMessage('Revisa tu correo para confirmar la cuenta antes de iniciar sesión.');
        }
        return;
      }

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

  const current = copy[mode];
  const isReset = mode === 'reset';

  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-label="LeagueOfFriends">
        <a className="brand" href="/login" aria-label="LeagueOfFriends, acceso">
          <span className="brand-mark">LF</span>
          <span className="brand-name">LEAGUE<br />OF FRIENDS</span>
        </a>
        <div className="auth-brand-copy">
          <p className="eyebrow">Tu círculo, tu progreso</p>
          <h1>COMPITE CON AMIGOS.<br />MEJORA CADA PARTIDA.</h1>
          <p>Retos, estadísticas y alertas para que la siguiente victoria cuente.</p>
        </div>
        <div className="auth-security-note"><ShieldCheck size={23} weight="bold" /><span>Tu contraseña no se guarda en LeagueOfFriends.</span></div>
      </section>

      <section className="auth-form-panel" aria-labelledby="auth-title">
        <div className="auth-form-wrap">
          {mode !== 'sign-in' ? <button className="auth-back" type="button" onClick={() => changeMode('sign-in')}><ArrowLeft size={17} weight="bold" /> Volver al acceso</button> : null}
          <p className="eyebrow">Acceso seguro</p>
          <h2 id="auth-title">{current.title}</h2>
          <p className="auth-description">{current.description}</p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label className="field-group">
              <span className="field-label">Correo electrónico</span>
              <span className="auth-input"><EnvelopeSimple size={20} weight="bold" /><input name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} placeholder="tu@email.com" /></span>
            </label>

            {!isReset ? <label className="field-group">
              <span className="field-label">Contraseña</span>
              <span className="auth-input"><LockKey size={20} weight="bold" /><input name="password" type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} placeholder="Mínimo 8 caracteres" /></span>
            </label> : null}

            {mode === 'sign-up' ? <label className="field-group">
              <span className="field-label">Confirmar contraseña</span>
              <span className="auth-input"><LockKey size={20} weight="bold" /><input name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Repite tu contraseña" /></span>
            </label> : null}

            {error ? <p className="auth-feedback is-error" role="alert">{error}</p> : null}
            {message ? <p className="auth-feedback" role="status">{message}</p> : null}

            <button className="auth-submit" type="submit" disabled={submitting}>
              {mode === 'sign-up' ? <UserPlus size={20} weight="bold" /> : <ArrowRight size={20} weight="bold" />}
              {submitting ? 'Procesando...' : current.submit}
            </button>
          </form>

          {mode === 'sign-in' ? <div className="auth-actions">
            <button type="button" onClick={() => changeMode('reset')}>¿Olvidaste tu contraseña?</button>
            <p>¿Primera vez? <button type="button" onClick={() => changeMode('sign-up')}>Crea tu cuenta</button></p>
          </div> : null}
        </div>
      </section>
    </main>
  );
}
