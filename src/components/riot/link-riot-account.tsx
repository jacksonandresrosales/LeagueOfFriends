'use client';

import { ArrowRight, Check, GameController, ShieldCheck, Warning } from '@phosphor-icons/react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { AppTopbar } from '@/components/shared/app-topbar';
import { PLATFORMS, type PlatformRoute } from '@/lib/riot/types';
import { getSupabaseClient } from '@/lib/supabase/client';

export function LinkRiotAccount() {
  const router = useRouter();
  const [platform, setPlatform] = useState<PlatformRoute>('la1');
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess(false);

    if (!gameName.trim() || !tagLine.trim()) {
      setError('Debes ingresar tu nombre de invocador y tu lema (#TAG).');
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setError('Sesión no válida. Vuelve a iniciar sesión.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/riot/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameName: gameName.trim(),
          tagLine: tagLine.trim().replace(/^#/, ''),
          platformRoute: platform,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No fue posible vincular tu cuenta de Riot Games.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch {
      setError('Error de conexión con el servidor. Inténtalo nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar active="Ajustes" />
      <main className="dashboard-main challenge-create-main">
        <AppTopbar category="Cuenta / Riot Games" title="Vincular Riot ID" />

        <div className="challenge-intro">
          <div>
            <span className="section-index">ID</span>
            <h2>Tu perfil en League.<br />Tus estadísticas reales.</h2>
          </div>
          <p>
            Vincula tu Riot ID para sincronizar tus puntos de liga (LP), victorias y rango competitivo en Solo/Duo y Flex.
          </p>
        </div>

        <div className="challenge-builder">
          <form className="challenge-form-column" onSubmit={handleSubmit} noValidate>
            <section className="form-section">
              <div className="form-section-heading">
                <span>01</span>
                <div>
                  <h3>Selecciona tu servidor</h3>
                  <p>La región donde juegas actualmente.</p>
                </div>
              </div>

              <div className="challenge-type-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                {PLATFORMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={platform === item.id ? 'challenge-type is-selected' : 'challenge-type'}
                    onClick={() => setPlatform(item.id)}
                    style={{ minHeight: '84px', padding: '12px' }}
                  >
                    <span style={{ font: '800 11px/1 var(--font-mono)', textTransform: 'uppercase' }}>{item.tag}</span>
                    <strong style={{ fontSize: '14px', marginTop: '6px' }}>{item.label}</strong>
                  </button>
                ))}
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-heading">
                <span>02</span>
                <div>
                  <h3>Identificador Riot ID</h3>
                  <p>Introduce tu nombre de juego y lema visible en el cliente de Riot.</p>
                </div>
              </div>

              <div className="field-row">
                <label className="field-group">
                  <span className="field-label">Nombre de invocador (Game Name)</span>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Faker"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    maxLength={32}
                  />
                  <small>Entre 3 y 32 caracteres</small>
                </label>

                <label className="field-group">
                  <span className="field-label">Lema (Tagline)</span>
                  <div className="input-with-suffix">
                    <input
                      type="text"
                      required
                      placeholder="LAN"
                      value={tagLine}
                      onChange={(e) => setTagLine(e.target.value)}
                      maxLength={8}
                    />
                    <span>#</span>
                  </div>
                  <small>Sin incluir el #</small>
                </label>
              </div>

              {error ? (
                <div className="auth-feedback is-error" role="alert" style={{ marginTop: '16px' }}>
                  <Warning size={20} weight="bold" />
                  <span>{error}</span>
                </div>
              ) : null}

              {success ? (
                <div className="success-message" role="status" style={{ marginTop: '16px' }}>
                  <Check size={20} weight="bold" />
                  <span>¡Cuenta vinculada con éxito! Redirigiendo al panel...</span>
                </div>
              ) : null}

              <button
                className="create-challenge-submit"
                type="submit"
                disabled={submitting || success}
                style={{ marginTop: '24px' }}
              >
                {submitting ? 'Verificando con Riot...' : 'Vincular cuenta'}
                <ArrowRight size={20} weight="bold" />
              </button>
            </section>
          </form>

          <aside className="challenge-summary">
            <div className="summary-header">
              <GameController size={32} weight="bold" />
              <div>
                <span>Verificación</span>
                <h3>Riot Games</h3>
              </div>
            </div>

            <dl className="summary-data">
              <div>
                <dt>Servidor</dt>
                <dd>{PLATFORMS.find((p) => p.id === platform)?.tag ?? 'LAN'}</dd>
              </div>
              <div>
                <dt>Identificador</dt>
                <dd>{gameName ? `${gameName}#${tagLine || '???'}` : 'Sin definir'}</dd>
              </div>
              <div>
                <dt>Seguridad</dt>
                <dd>Oficial Riot API</dd>
              </div>
            </dl>

            <div className="summary-rule">
              <ShieldCheck size={24} weight="bold" />
              <p>
                <strong>Verificación segura</strong>
                <span>LeagueOfFriends solo lee estadísticas públicas y nunca solicita tus contraseñas de juego.</span>
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
