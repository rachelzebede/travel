'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb, TIPOS, MOVE } from '../../../lib/supabase';

function sortDays(n) {
  n.days.sort((a, b) => (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99'));
}
function nextDate(s) {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function sortDay(n, di) {
  n.days[di].items.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
}

export default function Trip({ params }) {
  const id = params.id;
  const router = useRouter();
  const [t, setT] = useState(null);
  const [msg, setMsg] = useState('');
  const tr = useRef(null);
  const timer = useRef();

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) return router.replace('/');
      sb.from('trips').select('*').eq('id', id).single().then(({ data }) => { tr.current = data; setT(data); });
    });
  }, [id, router]);

  function change(fn) {
    const n = structuredClone(tr.current); fn(n); tr.current = n; setT(n); setMsg('Guardando…');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await sb.from('trips')
        .update({ agency: n.agency, title: n.title, client: n.client, dates: n.dates, days: n.days }).eq('id', id);
      setMsg(error ? 'Error al guardar' : 'Guardado');
    }, 700);
  }
  async function upload(di, ii, files) {
    for (const f of files) {
      const path = `${id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await sb.storage.from('confirmaciones').upload(path, f);
      if (error) { alert('No se pudo subir ' + f.name); continue; }
      const url = sb.storage.from('confirmaciones').getPublicUrl(path).data.publicUrl;
      change(n => { const it = n.days[di].items[ii]; it.files = [...(it.files || []), { name: f.name, url, path, ct: f.type }]; });
    }
  }
  async function delFile(di, ii, fi) {
    const f = t.days[di].items[ii].files[fi];
    await sb.storage.from('confirmaciones').remove([f.path]);
    change(n => n.days[di].items[ii].files.splice(fi, 1));
  }
  function move(di, ii, dir) {
    change(n => { const a = n.days[di].items; const j = ii + dir; if (j < 0 || j >= a.length) return; [a[ii], a[j]] = [a[j], a[ii]]; });
  }
  async function delTrip() {
    if (!confirm('¿Eliminar este viaje?')) return;
    await sb.from('trips').delete().eq('id', id);
    router.push('/');
  }
  if (!t) return <main>Cargando…</main>;
  const link = `${location.origin}/v/${t.share_token}`;
  const field = (k, label) => (<div><label>{label}</label><input value={t[k] || ''} onChange={e => change(n => { n[k] = e.target.value; })} /></div>);

  return (
    <main>
      <div className="row" style={{ marginBottom: 16 }}>
        <Link className="btn" href="/">Mis viajes</Link>
        <span className="note">{msg}</span>
      </div>
      <div className="panel">
        <div className="note">Link para el cliente</div>
        <div className="row"><code style={{ wordBreak: 'break-all' }}>{link}</code>
          <div><button className="btn" onClick={() => navigator.clipboard.writeText(link).then(() => setMsg('Link copiado'))}>Copiar</button>{' '}
            <a className="btn" href={link} target="_blank" rel="noopener">Ver</a></div></div>
      </div>
      <div className="panel" style={{ display: 'grid', gap: 12 }}>
        {field('agency', 'Tu agencia')}{field('title', 'Nombre del viaje')}{field('client', 'Cliente')}{field('dates', 'Fechas')}
      </div>
      {t.days.map((d, di) => (
        <div className="panel" key={di}>
          <div className="row" style={{ alignItems: 'end' }}>
            <div style={{ width: 170 }}><label>Fecha</label>
              <input type="date" value={d.date || ''} onChange={e => change(n => { n.days[di].date = e.target.value; })}
                onBlur={() => d.date && change(n => sortDays(n))} /></div>
            <div style={{ flex: 1, minWidth: 180 }}><label>Título del día</label>
              <input placeholder="Ej: Llegada a Lisboa" value={d.title} onChange={e => change(n => { n.days[di].title = e.target.value; })} /></div>
            <button className="btn del" onClick={() => confirm('¿Quitar este día?') && change(n => n.days.splice(di, 1))}>Quitar día</button>
          </div>
          {d.items.map((it, ii) => (
            <div className="item" key={ii}>
              <select value={it.type} onChange={e => change(n => { n.days[di].items[ii].type = e.target.value; })}>
                {Object.keys(TIPOS).map(k => <option key={k} value={k}>{TIPOS[k][0]} {TIPOS[k][1]}</option>)}
              </select>
              
              <input className="t" placeholder="Título" value={it.title} onChange={e => change(n => { n.days[di].items[ii].title = e.target.value; })} />
              <div className="acts">
                <button className="btn" disabled={ii === 0} onClick={() => move(di, ii, -1)} aria-label="Subir">↑</button>
                <button className="btn" disabled={ii === d.items.length - 1} onClick={() => move(di, ii, 1)} aria-label="Bajar">↓</button>
                <button className="btn del" onClick={() => change(n => n.days[di].items.splice(ii, 1))} aria-label="Quitar">✕</button>
              </div>
              {it.type === 'vuelo' && (
                <input className="full" placeholder="Número de vuelo (ej: AV 123)" value={it.flight || ''}
                  onChange={e => change(n => { n.days[di].items[ii].flight = e.target.value; })} />
              )}
              <div className="full times">
                <div><label>{MOVE.includes(it.type) ? 'Salida' : 'Empieza'}</label>
                  <input type="time" value={it.time} onChange={e => change(n => { n.days[di].items[ii].time = e.target.value; })}
                    onBlur={() => it.time && change(n => sortDay(n, di))} /></div>
                <div><label>{MOVE.includes(it.type) ? 'Llegada' : 'Termina (opcional)'}</label>
                  <input type="time" value={it.end || ''} onChange={e => change(n => { n.days[di].items[ii].end = e.target.value; })} /></div>
              </div>
              <textarea className="full" rows={2} placeholder="Detalles, confirmaciones, notas" value={it.detail}
                onChange={e => change(n => { n.days[di].items[ii].detail = e.target.value; })} />
              <input className="full" placeholder="Link del boleto o reserva (opcional)" value={it.url || ''}
                onChange={e => change(n => { n.days[di].items[ii].url = e.target.value; })}
                onBlur={e => { const v = e.target.value.trim(); if (v && !/^https?:\/\//i.test(v)) change(n => { n.days[di].items[ii].url = 'https://' + v; }); }} />
              <input className="full" type="tel" placeholder="Teléfono (opcional)" value={it.phone || ''}
                onChange={e => change(n => { n.days[di].items[ii].phone = e.target.value; })} />
              <div className="full">
                {(it.files || []).map((f, fi) => (<span className="chip" key={fi}>{f.name}<button onClick={() => delFile(di, ii, fi)}>✕</button></span>))}
                <div style={{ marginTop: 8 }}><label className="btn" style={{ display: 'inline-block', color: 'var(--ink)' }}>
                  Adjuntar foto o PDF
                  <input type="file" hidden multiple accept="image/*,application/pdf" onChange={e => { upload(di, ii, [...e.target.files]); e.target.value = ''; }} />
                </label></div>
              </div>
            </div>
          ))}
          <button className="btn" style={{ marginTop: 8 }}
            onClick={() => change(n => n.days[di].items.push({ type: 'actividad', time: '', title: '', detail: '', url: '', files: [] }))}>Agregar item</button>{' '}
          <button className="btn" style={{ marginTop: 8 }} onClick={() => change(n => sortDay(n, di))}>Ordenar por hora</button>
        </div>
      ))}
      <button className="btn main" onClick={() => change(n => n.days.push({ date: nextDate((n.days[n.days.length - 1] || {}).date), title: '', items: [] }))}>Agregar día</button>{' '}
      <button className="btn" onClick={() => change(n => sortDays(n))}>Ordenar días por fecha</button>{' '}
      <button className="btn del" onClick={delTrip}>Eliminar viaje</button>
    </main>
  );
}
