import Link from "next/link";

export default function NotFound() {
  return (
    <main className="status-page">
      <p className="eyebrow">404</p>
      <h1>No encontramos esa página</h1>
      <p className="docs-lead">
        El enlace puede haber cambiado o la agenda no está disponible.
      </p>
      <Link className="btn btn-acento" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
