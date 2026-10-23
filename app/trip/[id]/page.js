'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb, TIPOS, MOVE } from '../../../lib/supabase';

function addDays(s, k) {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + k);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function fmtDate(s) {
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? '' : d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}
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
        .update({ agency: n.agency, title: n.title, client: n.client, dates: n.dates, days: n.days, hotels: n.hotels || [] }).eq('id', id);
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
  async function uploadHotel(hi, files) {
    for (const f of files) {
      const path = `${id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await sb.storage.from('confirmaciones').upload(path, f);
      if (error) { alert('No se pudo subir ' + f.name); continue; }
      const url = sb.storage.from('confirmaciones').getPublicUrl(path).data.publicUrl;
      change(n => { const h = n.hotels[hi]; h.files = [...(h.files || []), { name: f.name, url, path, ct: f.type }]; });
    }
  }
  async function delHotelFile(hi, fi) {
    const f = t.hotels[hi].files[fi];
    await sb.storage.from('confirmaciones').remove([f.path]);
    change(n => n.hotels[hi].files.splice(fi, 1));
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
  const hset = (hi, k, v) => change(n => { n.hotels[hi][k] = v; });
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
      <div className="panel">
        <div className="row"><h3>🏨 Hoteles</h3>
          <button className="btn" onClick={() => change(n => { n.hotels = [...(n.hotels || []), { name: '', date: '', nights: 1, url: '', phone: '' }]; })}>Agregar hotel</button></div>
        {!(t.hotels || []).length && <p className="note">Agrega cada hotel con su fecha de entrada y las noches: sale como cuadro el día de entrada y como aviso en las demás noches.</p>}
        {(t.hotels || []).map((h, hi) => (
          <div className="item" key={hi} style={{ gridTemplateColumns: '1fr auto' }}>
            <input placeholder="Nombre del hotel" value={h.name} onChange={e => hset(hi, 'name', e.target.value)} />
            <button className="btn del" onClick={() => change(n => n.hotels.splice(hi, 1))} aria-label="Quitar hotel">✕</button>
            <div className="full times">
              <div><label>Entrada</label><input type="date" value={h.date || ''} onChange={e => hset(hi, 'date', e.target.value)} /></div>
              <div><label>Noches</label><input type="number" min="1" value={h.nights} onChange={e => hset(hi, 'nights', Math.max(1, parseInt(e.target.value) || 1))} /></div>
            </div>
            {h.date && <div className="full note">Salida: {fmtDate(addDays(h.date, h.nights))}</div>}
            {h.date && !t.days.some(d => d.date === h.date) && <div className="full note">⚠️ Ningún día del viaje tiene esa fecha, así que no aparecerá.</div>}
            <input className="full" placeholder="Link de la reserva (opcional)" value={h.url || ''} onChange={e => hset(hi, 'url', e.target.value)}
              onBlur={e => { const v = e.target.value.trim(); if (v && !/^https?:\/\//i.test(v)) hset(hi, 'url', 'https://' + v); }} />
            <input className="full" type="tel" placeholder="Teléfono (opcional)" value={h.phone || ''} onChange={e => hset(hi, 'phone', e.target.value)} />
            <input className="full" type="email" placeholder="Email (opcional)" value={h.email || ''} onChange={e => hset(hi, 'email', e.target.value)} />
            <input className="full" placeholder="Dirección (opcional)" value={h.address || ''} onChange={e => hset(hi, 'address', e.target.value)} />
            <div className="full pay">
              <div><label>Pago</label>
                <select value={h.payStatus || ''} onChange={e => hset(hi, 'payStatus', e.target.value)}>
                  <option value="">Sin indicar</option><option value="pagado">Pagado</option><option value="pendiente">Por pagar</option>
                </select></div>
              <div><label>Monto</label>
                <input placeholder="Ej: $250" value={h.payAmount || ''} onChange={e => hset(hi, 'payAmount', e.target.value)} /></div>
              <div><label>Método</label>
                <select value={h.payMethod || ''} onChange={e => hset(hi, 'payMethod', e.target.value)}>
                  <option value="">—</option><option value="tarjeta">Tarjeta</option><option value="efectivo">Efectivo</option>
                </select></div>
            </div>
            <textarea className="full" rows={2} placeholder="Reserva: número de confirmación, notas…" value={h.detail || ''} onChange={e => hset(hi, 'detail', e.target.value)} />
            <div className="full">
              {(h.files || []).map((f, fi) => (<span className="chip" key={fi}>{f.name}<button onClick={() => delHotelFile(hi, fi)}>✕</button></span>))}
              <div style={{ marginTop: 8 }}><label className="btn" style={{ display: 'inline-block', color: 'var(--ink)' }}>
                Adjuntar foto o PDF
                <input type="file" hidden multiple accept="image/*,application/pdf" onChange={e => { uploadHotel(hi, [...e.target.files]); e.target.value = ''; }} />
              </label></div>
            </div>
          </div>
        ))}
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
              <input className="full" type="email" placeholder="Email (opcional)" value={it.email || ''}
                onChange={e => change(n => { n.days[di].items[ii].email = e.target.value; })} />
              <input className="full" placeholder="Dirección (opcional)" value={it.address || ''}
                onChange={e => change(n => { n.days[di].items[ii].address = e.target.value; })} />
              <div className="full pay">
                <div><label>Pago</label>
                  <select value={it.payStatus || ''} onChange={e => change(n => { n.days[di].items[ii].payStatus = e.target.value; })}>
                    <option value="">Sin indicar</option><option value="pagado">Pagado</option><option value="pendiente">Por pagar</option>
                  </select></div>
                <div><label>Monto</label>
                  <input placeholder="Ej: $250" value={it.payAmount || ''} onChange={e => change(n => { n.days[di].items[ii].payAmount = e.target.value; })} /></div>
                <div><label>Método</label>
                  <select value={it.payMethod || ''} onChange={e => change(n => { n.days[di].items[ii].payMethod = e.target.value; })}>
                    <option value="">—</option><option value="tarjeta">Tarjeta</option><option value="efectivo">Efectivo</option>
                  </select></div>
              </div>
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
