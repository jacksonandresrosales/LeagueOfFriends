'use client';

import {
  Bell, CalendarBlank, Check, Crosshair, EnvelopeSimple, FlagCheckered,
  ShieldChevron, Sword, Trophy,
} from '@phosphor-icons/react';
import { FormEvent, useState } from 'react';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { ThemeToggle } from '@/components/shared/theme-toggle';

type ChallengeType = 'lp' | 'rank' | 'wins';

const challengeTypes = [
  { id: 'lp' as const, title: 'Ganar LP', description: 'Gana la mayor cantidad de LP', icon: Trophy },
  { id: 'rank' as const, title: 'Subir de rango', description: 'El primero en llegar al objetivo', icon: ShieldChevron },
  { id: 'wins' as const, title: 'Sumar victorias', description: 'Consigue más partidas ganadas', icon: FlagCheckered },
];

const friends = [
  { id: 'kuro', name: 'Kuro', tag: '#EUW', initials: 'KU' },
  { id: 'maya', name: 'Maya', tag: '#LAS', initials: 'MA' },
  { id: 'nox', name: 'Nox', tag: '#LAN', initials: 'NO' },
];

export function CreateChallenge() {
  const [type, setType] = useState<ChallengeType>('lp');
  const [selectedFriends, setSelectedFriends] = useState(['kuro', 'maya']);
  const [notifications, setNotifications] = useState(true);
  const [created, setCreated] = useState(false);

  function toggleFriend(id: string) {
    setSelectedFriends((current) => current.includes(id) ? current.filter((friend) => friend !== id) : [...current, id]);
    setCreated(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreated(true);
  }

  const selectedType = challengeTypes.find((item) => item.id === type) ?? challengeTypes[0];

  return (
    <div className="app-shell">
      <AppSidebar active="Retos" />
      <main className="dashboard-main challenge-create-main">
        <header className="topbar">
          <div><p className="eyebrow">Retos / Nuevo</p><h1>Crear un reto</h1></div>
          <div className="topbar-actions">
            <button className="icon-button notification-button" type="button" aria-label="Ver notificaciones"><Bell size={20} weight="bold" /><span className="notification-dot" /></button>
            <ThemeToggle />
            <div className="mini-profile"><span className="avatar avatar-small">AR</span><span><strong>Andre</strong><small>#LAN</small></span></div>
          </div>
        </header>

        <div className="challenge-intro">
          <div>
            <span className="section-index">VS</span>
            <h2>Pon una meta.<br />Que empiece la carrera.</h2>
          </div>
          <p>Define una regla clara, invita a tu círculo y compararemos el progreso de todos desde el mismo punto de partida.</p>
        </div>

        <div className="challenge-steps" aria-label="Pasos para crear el reto">
          <span className="is-current"><b>01</b> Detalles</span><span><b>02</b> Rivales</span><span><b>03</b> Confirmar</span>
        </div>

        <form className="challenge-builder" onSubmit={handleSubmit}>
          <div className="challenge-form-column">
            <section className="form-section" aria-labelledby="details-title">
              <div className="form-section-heading"><span>01</span><div><h3 id="details-title">Define la competencia</h3><p>Elige qué dato decidirá quién gana.</p></div></div>

              <label className="field-group">
                <span className="field-label">Nombre del reto</span>
                <input name="name" type="text" defaultValue="Road to Emerald" maxLength={48} required onChange={() => setCreated(false)} />
                <small>Máximo 48 caracteres</small>
              </label>

              <fieldset className="field-group">
                <legend className="field-label">Tipo de objetivo</legend>
                <div className="challenge-type-grid">
                  {challengeTypes.map(({ id, title, description, icon: Icon }) => (
                    <button key={id} type="button" className={type === id ? 'challenge-type is-selected' : 'challenge-type'} onClick={() => { setType(id); setCreated(false); }} aria-pressed={type === id}>
                      <Icon size={25} weight={type === id ? 'fill' : 'bold'} /><strong>{title}</strong><small>{description}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="field-row">
                <label className="field-group"><span className="field-label">Meta</span><div className="input-with-suffix"><input name="goal" type="number" min="1" defaultValue="240" required /><span>LP</span></div></label>
                <label className="field-group"><span className="field-label">Duración</span><select name="duration" defaultValue="30"><option value="7">7 días</option><option value="14">14 días</option><option value="30">30 días</option><option value="60">60 días</option></select></label>
              </div>

              <div className="date-note"><CalendarBlank size={22} weight="bold" /><span><strong>27 AGO → 26 SEP</strong><small>El seguimiento comienza al crear el reto.</small></span></div>
            </section>

            <section className="form-section" aria-labelledby="friends-title">
              <div className="form-section-heading"><span>02</span><div><h3 id="friends-title">Elige a tus rivales</h3><p>Puedes invitar hasta siete amigos.</p></div></div>
              <div className="friend-picker">
                {friends.map((friend) => {
                  const selected = selectedFriends.includes(friend.id);
                  return (
                    <label key={friend.id} className={selected ? 'friend-option is-selected' : 'friend-option'}>
                      <input type="checkbox" checked={selected} onChange={() => toggleFriend(friend.id)} />
                      <span className="avatar">{friend.initials}</span><span><strong>{friend.name}</strong><small>{friend.tag}</small></span>
                      <span className="selection-box">{selected ? <Check size={16} weight="bold" /> : null}</span>
                    </label>
                  );
                })}
              </div>
              <button type="button" className="invite-button"><EnvelopeSimple size={19} weight="bold" /> Invitar por Riot ID</button>
            </section>

            <section className="form-section compact-form-section" aria-labelledby="rules-title">
              <div className="form-section-heading"><span>03</span><div><h3 id="rules-title">Avisos y reglas</h3><p>Todos compiten bajo las mismas condiciones.</p></div></div>
              <label className="toggle-row"><span><strong>Solo clasificatoria Solo/Duo</strong><small>No contará Flex ni partidas normales.</small></span><input type="checkbox" defaultChecked /><i aria-hidden="true" /></label>
              <label className="toggle-row"><span><strong>Avisarme cuando me superen</strong><small>Recibirás un correo como máximo una vez al día.</small></span><input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} /><i aria-hidden="true" /></label>
            </section>
          </div>

          <aside className="challenge-summary" aria-labelledby="summary-title">
            <div className="summary-header"><Crosshair size={34} weight="bold" /><div><span>Vista previa</span><h3 id="summary-title">Road to Emerald</h3></div></div>
            <dl className="summary-data">
              <div><dt>Objetivo</dt><dd>{selectedType.title}</dd></div>
              <div><dt>Meta</dt><dd>240 LP</dd></div>
              <div><dt>Duración</dt><dd>30 días</dd></div>
              <div><dt>Jugadores</dt><dd>{selectedFriends.length + 1} / 8</dd></div>
            </dl>
            <div className="summary-racers">
              <span className="avatar avatar-red">AR</span>
              {friends.filter((friend) => selectedFriends.includes(friend.id)).map((friend) => <span className="avatar" key={friend.id}>{friend.initials}</span>)}
              <span className="racer-count">+ tú</span>
            </div>
            <div className="summary-rule"><Sword size={20} weight="bold" /><p><strong>Punto de partida justo</strong><span>Guardaremos el LP de cada jugador al aceptar la invitación.</span></p></div>
            {notifications ? <div className="summary-rule"><EnvelopeSimple size={20} weight="bold" /><p><strong>Alertas activadas</strong><span>Te avisaremos si alguien toma la delantera.</span></p></div> : null}
            {created ? <p className="success-message" role="status"><Check size={18} weight="bold" /> Reto preparado en esta demo.</p> : null}
            <button className="create-challenge-submit" type="submit" disabled={selectedFriends.length === 0}><FlagCheckered size={20} weight="fill" /> Crear reto</button>
            <p className="summary-footnote">Las invitaciones se enviarán después de confirmar.</p>
          </aside>
        </form>
      </main>
    </div>
  );
}
