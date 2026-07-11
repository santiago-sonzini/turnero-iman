// Parser de ventas pegadas/subidas (CSV/Excel). Compartido entre el import
// del dashboard y el onboarding. Tolerante a data sucia argentina: separador
// coma/punto y coma/tab, fechas dd/mm/aaaa, montos "$ 45.000,50".
export interface FilaImportParseada {
  cliente: string;
  fecha: string;
  monto: number;
  telefono?: string;
}

export function parseCSV(texto: string): FilaImportParseada[] {
  const filas: FilaImportParseada[] = [];
  for (const lineaRaw of texto.split(/\r?\n/)) {
    const linea = lineaRaw.trim();
    if (!linea) continue;
    const partes = linea.split(/[;,\t]/).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (partes.length < 3) continue;
    const [cliente, fecha, montoRaw, telefono] = partes;
    // Monto puede venir "45.000,50" o "45000.50"
    const monto = Number(
      montoRaw!.replace(/[$\s]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", "."),
    );
    if (!cliente || !fecha || !isFinite(monto)) continue;
    if (/cliente|fecha|monto/i.test(cliente + fecha)) continue; // encabezado
    filas.push({ cliente, fecha, monto, telefono: telefono || undefined });
  }
  return filas;
}
