'use client';
import { useEffect, useState } from 'react';
import { sb, TIPOS } from '../../../lib/supabase';

function fmt(s) {
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? '' : d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Cliente({ params }) {
  const [t, setT] = useState(null);
  const [fail, setFail] = useState(false);
  useEffect(() => {
    sb.rpc('get_trip', { token: params.token }).then(({ data }) => (data ? setT(data) : setFail(true)));
  }, [params.token]);
  if (fail) return <main><h2 style={{ marginTop: 40 }}>Este link no es válido</h2><p className="note">Pide a tu agente que te envíe el link otra vez.</p></main>;
  if (!t) return <main>Cargando…</main>;
  return (
    <main>
      <div className="hero"><h1>{t.title}</h1><p className="note">{t.dates}</p>
        <p className="by">Preparado para {t.client} por {t.agency}</p></div>
      {t.days.map((d, i) => (
        <section className="day" key={i}>
          <div className="dk">Día {i + 1}{d.date ? ' · ' + fmt(d.date) : ''}</div>
          {d.title && !/^D[ií]a \d+$/i.test(d.title.trim()) && <h2>{d.title}</h2>}
          {d.items.map((it, j) => (
            <div className="card" key={j}>
              <div className="k">{(TIPOS[it.type] || TIPOS.nota)[0]} {(TIPOS[it.type] || TIPOS.nota)[1]}{it.time ? ' · ' + it.time : ''}</div>
              <h3>{it.title}</h3>{it.detail && <p>{it.detail}</p>}
              {/^https?:\/\//i.test(it.url || '') && <a className="pdf" href={it.url} target="_blank" rel="noopener noreferrer">🔗 Abrir reserva</a>}
              {(it.files || []).map((f, k) => (f.ct || '').startsWith('image/')
                ? <a key={k} href={f.url} target="_blank" rel="noopener"><img className="thumb" src={f.url} alt={f.name} /></a>
                : <a key={k} className="pdf" href={f.url} target="_blank" rel="noopener">Ver {f.name}</a>)}
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
