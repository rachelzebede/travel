'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb } from '../lib/supabase';

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [logged, setLogged] = useState(false);
  const [trips, setTrips] = useState([]);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const { data } = await sb.from('trips').select('id,title,client,dates').order('created_at', { ascending: false });
    setTrips(data || []);
  }
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setLogged(!!data.session); setReady(true);
      if (data.session) load();
    });
  }, []);

  async function login(e) {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) return setErr('Correo o contraseña incorrectos.');
    setLogged(true); load();
  }
  async function newTrip() {
    const { data, error } = await sb.from('trips')
      .insert({ agency: trips.length ? '' : 'Mi agencia', days: [{ date: '', title: '', items: [] }] })
      .select('id').single();
    if (error) return alert('No se pudo crear el viaje.');
    router.push('/trip/' + data.id);
  }

  if (!ready) return <main>Cargando…</main>;
  if (!logged) return (
    <main>
      <img className="logo" src="/logo.png" alt="Logo" onError={e => { e.currentTarget.style.display = 'none'; }} />
      <h1 style={{ margin: '40px 0 16px' }}>Entrar</h1>
      <form className="panel" onSubmit={login}>
        <label>Correo</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label style={{ marginTop: 12 }}>Contraseña</label><input type="password" value={pass} onChange={e => setPass(e.target.value)} required />
        {err && <p className="del">{err}</p>}
        <button className="btn main" style={{ marginTop: 16 }}>Entrar</button>
      </form>
    </main>
  );
  return (
    <main>
      <div className="row" style={{ marginBottom: 16 }}>
        <div><img className="logo" src="/logo.png" alt="Logo" onError={e => { e.currentTarget.style.display = 'none'; }} /><h1>Mis viajes</h1></div>
        <div><button className="btn main" onClick={newTrip}>Nuevo viaje</button>{' '}
          <button className="btn" onClick={() => sb.auth.signOut().then(() => setLogged(false))}>Salir</button></div>
      </div>
      {!trips.length && <p className="note">Aún no tienes viajes. Crea el primero.</p>}
      {trips.map(t => (
        <Link key={t.id} href={'/trip/' + t.id} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="panel"><h3>{t.title}</h3><div className="note">{t.client}{t.dates ? ' · ' + t.dates : ''}</div></div>
        </Link>
      ))}
    </main>
  );
}
