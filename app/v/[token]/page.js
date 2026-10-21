'use client';
import { useEffect, useState } from 'react';
import { sb, TIPOS, MOVE } from '../../../lib/supabase';

function hrs(it) {
  if (!it.time && !it.end) return '';
  if (!it.end) return it.time;
  if (!it.time) return it.end;
  return it.time + (MOVE.includes(it.type) ? ' → ' : ' – ') + it.end;
}
function addDays(s, k) {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + k);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
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
      {(t.hotels || []).some(h => h.name) && (
        <section className="day">
          <div className="dk">Alojamiento</div>
          {t.hotels.filter(h => h.name).map((h, i) => (
            <div className="card" key={i}>
              <div className="k">🏨 Hotel</div>
              <h3>{h.name}</h3>
              {h.date && <p>Entrada: {fmt(h.date)} · {h.nights} noche{h.nights > 1 ? 's' : ''} · Salida: {fmt(addDays(h.date, h.nights))}</p>}
              {/^https?:\/\//i.test(h.url || '') && <a className="pdf" href={h.url} target="_blank" rel="noopener noreferrer">🔗 Abrir reserva</a>}
              {(h.phone || '').replace(/\D/g, '').length >= 5 && <a className="pdf" href={'tel:' + h.phone.replace(/[^\d+]/g, '')}>📞 {h.phone}</a>}
            </div>
          ))}
        </section>
      )}
      {t.days.map((d, i) => (
        <section className="day" key={i}>
          <div className="dk">Día {i + 1}{d.date ? ' · ' + fmt(d.date) : ''}</div>
          {d.title && !/^D[ií]a \d+$/i.test(d.title.trim()) && <h2>{d.title}</h2>}
          {(t.hotels || []).filter(h => h.name && h.date && d.date).map((h, k) => {
            const out = addDays(h.date, h.nights);
            if (d.date >= h.date && d.date < out) return <p className="note" style={{ margin: '0 0 8px' }} key={k}>🏨 Noche en {h.name}</p>;
            if (d.date === out) return <p className="note" style={{ margin: '0 0 8px' }} key={k}>🧳 Check-out de {h.name}</p>;
            return null;
          })}
          {d.items.map((it, j) => (
            <div className="card" key={j}>
              <div className="k">{(TIPOS[it.type] || TIPOS.nota)[0]} {(TIPOS[it.type] || TIPOS.nota)[1]}{hrs(it) ? ' · ' + hrs(it) : ''}</div>
              <h3>{it.title}</h3>{it.type === 'vuelo' && it.flight && <p>Vuelo {it.flight}</p>}{it.detail && <p>{it.detail}</p>}
              {/^https?:\/\//i.test(it.url || '') && <a className="pdf" href={it.url} target="_blank" rel="noopener noreferrer">🔗 Abrir reserva</a>}
              {(it.phone || '').replace(/\D/g, '').length >= 5 && <a className="pdf" href={'tel:' + it.phone.replace(/[^\d+]/g, '')}>📞 {it.phone}</a>}
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
