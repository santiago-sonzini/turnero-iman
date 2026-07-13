"use client";

import { useEffect } from "react";
import { reportClientError } from "@/app/actions/observability";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError(error.message, error.stack);
  }, [error]);
  return (
    <main className="status-page">
      <p className="eyebrow">ALGO FALLÓ</p>
      <h1>No pudimos cargar esta página</h1>
      <p className="docs-lead">
        Tus datos no se perdieron. Podés intentar nuevamente.
      </p>
      <button className="btn btn-acento" type="button" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
