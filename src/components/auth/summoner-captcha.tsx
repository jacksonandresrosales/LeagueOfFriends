'use client';

import { useState } from 'react';
import { CheckCircle, Shield, ShieldCheck, SpinnerGap } from '@phosphor-icons/react';

interface SummonerCaptchaProps {
  verified: boolean;
  onVerify: () => void;
}

export function SummonerCaptcha({ verified, onVerify }: SummonerCaptchaProps) {
  const [verifying, setVerifying] = useState(false);

  function handleTrigger() {
    if (verified || verifying) return;
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      onVerify();
    }, 1400);
  }

  return (
    <div
      className={`summoner-captcha ${verified ? 'is-verified' : ''} ${verifying ? 'is-verifying' : ''}`}
      onClick={handleTrigger}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTrigger();
        }
      }}
      role="button"
      tabIndex={verified ? -1 : 0}
      aria-label="Verificación de seguridad de invocador"
    >
      <div className="captcha-left">
        <div className="captcha-checkbox">
          {verified ? (
            <CheckCircle size={22} weight="fill" className="captcha-icon-verified" />
          ) : verifying ? (
            <SpinnerGap size={22} weight="bold" className="captcha-icon-spinner animate-spin" />
          ) : (
            <Shield size={20} weight="bold" className="captcha-icon-idle" />
          )}
        </div>
        <div className="captcha-text">
          <span className="captcha-title">
            {verified
              ? 'Invocador Verificado'
              : verifying
                ? 'Analizando señal de invocador...'
                : 'Comprobación de Seguridad'}
          </span>
          <span className="captcha-subtitle">
            {verified
              ? 'Identidad confirmada con éxito'
              : verifying
                ? 'Comprobando integridad de la solicitud...'
                : 'Toca aquí para verificar tu cuenta'}
          </span>
        </div>
      </div>

      <div className="captcha-badge">
        <ShieldCheck size={20} weight={verified ? 'fill' : 'bold'} />
        <span>LF SECURE</span>
      </div>

      {verifying ? <div className="captcha-scanner-line" /> : null}
    </div>
  );
}
