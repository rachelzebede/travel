'use client';

export default function Logo() {
  return (
    <picture>
      <source srcSet="/logo-dark.png" media="(prefers-color-scheme: dark)" />
      <img className="logo" src="/logo.png" alt="Logo" onError={e => { e.currentTarget.style.display = 'none'; }} />
    </picture>
  );
}
