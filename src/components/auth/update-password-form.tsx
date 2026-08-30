'use client';

import { Check, Key, LockKey } from '@phosphor-icons/react';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export function UpdatePasswordForm() {
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!configured) return;

    const supabase = getSupabaseClient();
    void supabase.auth.getUser().then(({ data }) => setReady(Boolean(data.user)));
  }, [configured]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');
    const confirmation = String(formData.get('confirmation') ?? '');

    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError('No fue posible actualizar la contraseña. Solicita un enlace nuevo.');
    } else {
      await supabase.auth.signOut({ scope: 'local' });
      setMessage('Contraseña actualizada. Ya puedes iniciar sesión de nuevo.');
    }
    setSubmitting(false);
  }

  return (
    <main className="auth-page auth-page-single">
      <section className="auth-form-panel" aria-labelledby="password-title">
        <div className="auth-form-wrap">
          <a className="brand" href="/login"><span className="brand-mark">LF</span><span className="brand-name">LEAGUE<br />OF FRIENDS</span></a>
          <p className="eyebrow">Seguridad de la cuenta</p>
          <h1 id="password-title">Elige una contraseña nueva</h1>
          <p className="auth-description">Usa una contraseña única que no emplees en otros servicios.</p>

          {!configured ? <p className="auth-feedback is-error" role="alert">Falta configurar Supabase para actualizar la contraseña.</p> : ready ? <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label className="field-group"><span className="field-label">Nueva contraseña</span><span className="auth-input"><LockKey size={20} weight="bold" /><input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Mínimo 8 caracteres" /></span></label>
            <label className="field-group"><span className="field-label">Confirmar contraseña</span><span className="auth-input"><Key size={20} weight="bold" /><input name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Repite tu contraseña" /></span></label>
            {error ? <p className="auth-feedback is-error" role="alert">{error}</p> : null}
            {message ? <p className="auth-feedback" role="status"><Check size={18} weight="bold" /> {message}</p> : null}
            <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Actualizando...' : 'Actualizar contraseña'}</button>
          </form> : <p className="auth-feedback is-error" role="alert">El enlace no es válido o ya caducó. Solicita uno nuevo.</p>}

          <Link className="auth-inline-link" href="/login">Volver al acceso</Link>
        </div>
      </section>
    </main>
  );
}
