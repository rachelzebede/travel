'use client';
import { useEffect, useState } from 'react';
import { sb, TIPOS } from '../../../lib/supabase';

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
        <section className="day" key={i}><h2>{d.title}</h2>
          {d.items.map((it, j) => (
            <div className="card" key={j}>
              <div className="k">{TIPOS[it.type] || 'Nota'}{it.time ? ' · ' + it.time : ''}</div>
              <h3>{it.title}</h3>{it.detail && <p>{it.detail}</p>}
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
