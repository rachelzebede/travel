import './globals.css';
export const metadata = { title: 'Mi itinerario' };
export const viewport = { width: 'device-width', initialScale: 1 };
export default function Layout({ children }) {
  return (<html lang="es"><body>{children}</body></html>);
}
