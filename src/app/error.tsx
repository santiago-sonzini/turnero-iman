"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="docs-page"><p className="eyebrow">ALGO FALLÓ</p><h1>No pudimos cargar esta página</h1><p className="docs-lead">Tus datos no se perdieron. Podés intentar nuevamente.</p><button className="btn btn-acento" onClick={reset}>Reintentar</button></main>;
}
