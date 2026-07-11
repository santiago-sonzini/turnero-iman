// Normalización de nombres y teléfonos + detección de clientes duplicados.
// Portado del prototipo (landings/iman/shared/core/normalize.js).

export function normalizarNombre(s: string | null | undefined): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Teléfono argentino para wa.me: solo dígitos con prefijo 549.
export function normalizarTelefono(s: string | null | undefined): string {
  let d = String(s ?? "").replace(/\D/g, "");
  if (!d) return "";
  d = d.replace(/^0+/, "");
  if (d.startsWith("549")) return d;
  if (d.startsWith("54")) return "549" + d.slice(2);
  if (d.startsWith("15")) return "549" + d.slice(2); // 15xxxxxxx sin área: mejor esfuerzo
  if (d.length === 10) return "549" + d;             // área + número sin 15
  return "549" + d;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const fila: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = fila[0]!;
    fila[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = fila[j]!;
      fila[j] = Math.min(
        fila[j]! + 1,
        fila[j - 1]! + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return fila[n]!;
}

export function similitud(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const [corto, largo] = a.length <= b.length ? [a, b] : [b, a];
  if (corto.length >= 4 && largo.includes(corto)) return 0.9;

  const ta = new Set(a.split(" "));
  const tb = new Set(b.split(" "));
  let comunes = 0;
  for (const t of ta) if (tb.has(t)) comunes++;
  const jaccard = comunes / (ta.size + tb.size - comunes);

  const lev = levenshtein(a, b);
  const levSim = 1 - lev / Math.max(a.length, b.length);

  return Math.max(jaccard, levSim);
}

export interface SugerenciaFusion<T> {
  a: T;
  b: T;
  score: number;
}

export function sugerirFusiones<T extends { name: string }>(
  clientes: T[],
  umbral = 0.82
): Array<SugerenciaFusion<T>> {
  const norm = clientes.map((c) => normalizarNombre(c.name));
  const res: Array<SugerenciaFusion<T>> = [];
  for (let i = 0; i < clientes.length; i++) {
    for (let j = i + 1; j < clientes.length; j++) {
      const s = similitud(norm[i]!, norm[j]!);
      if (s >= umbral) res.push({ a: clientes[i]!, b: clientes[j]!, score: s });
    }
  }
  return res.sort((x, y) => y.score - x.score);
}
