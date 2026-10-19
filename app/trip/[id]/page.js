'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb, TIPOS } from '../../../lib/supabase';

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
            <div style={{ flex: 1 }}><label>Título del día</label>
              <input value={d.title} onChange={e => change(n => { n.days[di].title = e.target.value; })} /></div>
            <button className="btn del" onClick={() => confirm('¿Quitar este día?') && change(n => n.days.splice(di, 1))}>Quitar día</button>
          </div>
          {d.items.map((it, ii) => (
            <div className="item" key={ii}>
              <select value={it.type} onChange={e => change(n => { n.days[di].items[ii].type = e.target.value; })}>
                {Object.keys(TIPOS).map(k => <option key={k} value={k}>{TIPOS[k]}</option>)}
              </select>
              <input placeholder="Hora" value={it.time} onChange={e => change(n => { n.days[di].items[ii].time = e.target.value; })} />
              <input className="t" placeholder="Título" value={it.title} onChange={e => change(n => { n.days[di].items[ii].title = e.target.value; })} />
              <button className="btn del" onClick={() => change(n => n.days[di].items.splice(ii, 1))}>✕</button>
              <textarea className="full" rows={2} placeholder="Detalles, confirmaciones, notas" value={it.detail}
                onChange={e => change(n => { n.days[di].items[ii].detail = e.target.value; })} />
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
            onClick={() => change(n => n.days[di].items.push({ type: 'actividad', time: '', title: '', detail: '', files: [] }))}>Agregar item</button>
        </div>
      ))}
      <button className="btn main" onClick={() => change(n => n.days.push({ title: 'Día ' + (n.days.length + 1), items: [] }))}>Agregar día</button>{' '}
      <button className="btn del" onClick={delTrip}>Eliminar viaje</button>
    </main>
  );
}
