'use client';

import {
  Bell, Check, Crosshair, ShieldChevron, Trophy,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { ThemeToggle } from '@/components/shared/theme-toggle';

type Period = 'Día' | 'Semana' | 'Mes';
const periods: Period[] = ['Día', 'Semana', 'Mes'];
const periodData: Record<Period, { lp: string; games: string; wins: string; rate: string; playerPath: string; rivalPath: string }> = {
  Día: {
    lp: '+22', games: '4', wins: '3', rate: '75%',
    playerPath: 'M0 176 C54 158 74 174 126 137 S211 121 263 88 S358 101 420 46 S511 58 570 24',
    rivalPath: 'M0 185 C59 177 83 144 141 151 S230 115 287 124 S374 78 428 91 S516 64 570 73',
  },
  Semana: {
    lp: '+138', games: '27', wins: '17', rate: '63%',
    playerPath: 'M0 181 C46 170 80 188 127 148 S210 126 264 93 S355 110 419 52 S510 63 570 25',
    rivalPath: 'M0 190 C49 181 89 146 142 158 S229 118 286 130 S372 83 429 97 S515 70 570 78',
  },
  Mes: {
    lp: '+306', games: '82', wins: '49', rate: '60%',
    playerPath: 'M0 190 C52 179 74 160 127 171 S215 118 267 126 S355 69 421 80 S511 39 570 20',
    rivalPath: 'M0 183 C56 151 85 175 143 140 S233 150 289 104 S376 120 431 86 S516 101 570 65',
  },
};

const friends = [
  { place: '01', name: 'Andre', tag: '#LAN', lp: '+138', tone: 'red' },
  { place: '02', name: 'Kuro', tag: '#EUW', lp: '+112', tone: 'dark' },
  { place: '03', name: 'Maya', tag: '#LAS', lp: '+84', tone: 'light' },
  { place: '04', name: 'Nox', tag: '#LAN', lp: '+61', tone: 'muted' },
];

function PerformanceChart({ period }: { period: Period }) {
  const data = periodData[period];
  const pointY = period === 'Día' ? 24 : period === 'Semana' ? 25 : 20;
  return (
    <figure className="chart" aria-label={`Evolución de LP durante el periodo: ${period}`}>
      <div className="chart-y-axis" aria-hidden="true"><span>+160</span><span>+120</span><span>+80</span><span>+40</span><span>0</span></div>
      <svg viewBox="0 0 570 210" role="img" aria-labelledby="chart-title chart-description" preserveAspectRatio="none">
        <title id="chart-title">Comparativa de puntos de liga</title>
        <desc id="chart-description">Andre suma más puntos que Kuro durante este periodo.</desc>
        {[20, 62, 104, 146, 188].map((y) => <line key={y} x1="0" y1={y} x2="570" y2={y} className="grid-line" />)}
        <path d={data.rivalPath} className="chart-line rival-line" />
        <path d={data.playerPath} className="chart-line player-line" />
        <circle cx="570" cy={pointY} r="6" className="chart-point" />
      </svg>
      <div className="chart-x-axis" aria-hidden="true"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div>
    </figure>
  );
}

export function Dashboard() {
  const [period, setPeriod] = useState<Period>('Semana');
  const data = periodData[period];

  return (
    <div className="app-shell" id="inicio">
      <AppSidebar active="Resumen" />
      <main className="dashboard-main">
        <header className="topbar">
          <div><p className="eyebrow">Panel personal / Temporada 2026</p><h1>Tu rendimiento</h1></div>
          <div className="topbar-actions">
            <button className="icon-button notification-button" type="button" aria-label="Ver notificaciones"><Bell size={20} weight="bold" /><span className="notification-dot" /></button>
            <ThemeToggle />
            <div className="mini-profile" aria-label="Perfil de Andre"><span className="avatar avatar-small">AR</span><span><strong>Andre</strong><small>#LAN</small></span></div>
          </div>
        </header>

        <section className="profile-hero" aria-labelledby="profile-name">
          <div className="rank-emblem" aria-hidden="true"><ShieldChevron size={66} weight="fill" /><span>IV</span></div>
          <div className="profile-copy">
            <p className="eyebrow">Invocador principal</p>
            <h2 id="profile-name">Andre<span>#LAN</span></h2>
            <div className="rank-line"><strong>Platino IV</strong><span>42 LP</span><span className="positive">↑ 138 esta semana</span></div>
          </div>
          <div className="season-goal">
            <span className="eyebrow">Objetivo de temporada</span><strong>Esmeralda IV</strong>
            <div className="progress-track"><span style={{ width: '68%' }} /></div><small>68% completado</small>
          </div>
        </section>

        <section className="metrics" aria-label="Métricas principales">
          <article className="metric metric-featured"><span className="metric-label">LP ganados</span><strong>{data.lp}</strong><small>vs. periodo anterior</small></article>
          <article className="metric"><span className="metric-label">Partidas</span><strong>{data.games}</strong><small>Solo/Duo</small></article>
          <article className="metric"><span className="metric-label">Victorias</span><strong>{data.wins}</strong><small>Racha actual: 3</small></article>
          <article className="metric"><span className="metric-label">Win rate</span><strong>{data.rate}</strong><small className="positive">↑ 4.2 puntos</small></article>
        </section>

        <div className="dashboard-grid">
          <section className="panel performance-panel" aria-labelledby="performance-title">
            <div className="panel-heading">
              <div><p className="eyebrow">Cara a cara</p><h2 id="performance-title">Progreso de LP</h2></div>
              <div className="period-tabs" role="group" aria-label="Seleccionar periodo">
                {periods.map((item) => <button key={item} type="button" className={period === item ? 'is-active' : ''} onClick={() => setPeriod(item)} aria-pressed={period === item}>{item}</button>)}
              </div>
            </div>
            <div className="chart-legend"><span><i className="legend-player" /> Tú <strong>{data.lp} LP</strong></span><span><i className="legend-rival" /> Kuro <strong>+112 LP</strong></span></div>
            <PerformanceChart period={period} />
          </section>

          <section className="panel leaderboard-panel" aria-labelledby="leaderboard-title">
            <div className="panel-heading compact"><div><p className="eyebrow">Tu círculo</p><h2 id="leaderboard-title">Clasificación</h2></div><Trophy size={27} weight="fill" /></div>
            <ol className="friends-list">
              {friends.map((friend) => (
                <li key={friend.name} className={friend.name === 'Andre' ? 'current-user' : ''}>
                  <span className="place">{friend.place}</span><span className={`avatar avatar-${friend.tone}`}>{friend.name.slice(0, 2).toUpperCase()}</span>
                  <span className="friend-name"><strong>{friend.name}</strong><small>{friend.tag}</small></span><strong className="friend-lp">{friend.lp}</strong>
                </li>
              ))}
            </ol>
            <button type="button" className="text-button">Ver clasificación completa →</button>
          </section>

          <section className="panel challenge-panel" aria-labelledby="challenge-title">
            <div className="challenge-symbol"><Crosshair size={42} weight="bold" /></div>
            <div className="challenge-info"><p className="eyebrow">Reto activo / 12 días restantes</p><h2 id="challenge-title">Road to Emerald</h2><p>El primero en alcanzar Esmeralda IV gana. Cuatro amigos, una sola meta.</p></div>
            <div className="challenge-progress"><div><span>Tu progreso</span><strong>68%</strong></div><div className="progress-track large"><span style={{ width: '68%' }} /></div><small><Check size={15} weight="bold" /> 138 de 240 LP necesarios</small></div>
            <button type="button" className="secondary-button">Ver reto</button>
          </section>
        </div>
      </main>
    </div>
  );
}
