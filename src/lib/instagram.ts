// Normaliza lo que cargue el dueño en el campo Instagram a un usuario válido.
// Acepta URL (instagram.com/usuario), @usuario o usuario suelto. Devuelve el
// handle en minúsculas, o null si no es un usuario de Instagram válido.
export function instagramHandle(input: string | null | undefined): string | null {
  if (!input) return null;
  let v = String(input).trim();
  if (!v) return null;
  const enUrl = v.match(/instagram\.com\/([^/?#\s]+)/i);
  if (enUrl?.[1]) v = enUrl[1];
  v = v.replace(/^@/, "").replace(/\/+$/, "").trim();
  // Usuario de Instagram: 1–30 caracteres, letras/números/punto/guion bajo.
  if (!/^[A-Za-z0-9._]{1,30}$/.test(v)) return null;
  return v.toLowerCase();
}

export function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}
