// Emails transaccionales con la estética de Imán (tarjeta con borde tinta,
// sombra dura y acento del negocio). HTML con tablas + estilos inline para que
// se vea bien en Gmail/Outlook/Apple Mail. Presentación pura: los datos ya
// vienen formateados desde el caller.

const CREMA = "#FBF6EE";
const TINTA = "#33231A";
const TINTA_SUAVE = "#8a7a6c";
const BLANCO = "#FFFDF8";
const LINEA = "#ece0cf";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Layout = {
  accent?: string;
  preheader?: string;
  heading: string;
  lead?: string;      // admite HTML (bold); escapá los valores dinámicos vos
  bodyHtml?: string;  // admite HTML
  cta?: { label: string; url: string };
  footerNote?: string;
};

function layout({ accent = "#E94F37", preheader = "", heading, lead = "", bodyHtml = "", cta, footerNote }: Layout): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:${CREMA};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TINTA};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREMA};padding:24px 12px;"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
    <tr><td style="padding:4px 6px 16px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:800;font-size:18px;color:${TINTA};">
      🧲&nbsp;Imán <span style="color:${TINTA_SUAVE};font-weight:700;">Turnos</span>
    </td></tr>
    <tr><td style="background:${BLANCO};border:2.5px solid ${TINTA};border-radius:22px;box-shadow:0 6px 0 ${TINTA};padding:28px 26px;">
      <div style="height:6px;width:44px;border-radius:99px;background:${accent};margin:0 0 18px;"></div>
      <h1 style="margin:0 0 10px;font-size:23px;line-height:1.18;letter-spacing:-.01em;color:${TINTA};">${esc(heading)}</h1>
      ${lead ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TINTA_SUAVE};">${lead}</p>` : ""}
      ${bodyHtml}
      ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 2px;"><tr><td style="border-radius:99px;background:${accent};border:2.5px solid ${TINTA};box-shadow:0 4px 0 ${TINTA};">
        <a href="${esc(cta.url)}" style="display:inline-block;padding:13px 26px;font-weight:800;font-size:15px;color:#ffffff;text-decoration:none;">${esc(cta.label)}</a>
      </td></tr></table>` : ""}
    </td></tr>
    <tr><td style="padding:16px 8px;font-size:12px;color:${TINTA_SUAVE};line-height:1.5;">
      ${footerNote ? esc(footerNote) + "<br>" : ""}Enviado con 🧲 <b style="color:${TINTA};">Imán Turnos</b>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// Tabla de datos (clave/valor). Escapa los valores; con href el valor es link.
type Fila = [string, string] | [string, string, string];
function filas(rows: Fila[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${TINTA};border-radius:14px;overflow:hidden;background:${CREMA};">
    ${rows.map(([k, v, href], i) => `<tr>
      <td style="padding:11px 14px;font-size:13px;color:${TINTA_SUAVE};font-weight:700;white-space:nowrap;${i ? `border-top:1.5px solid ${LINEA};` : ""}">${esc(k)}</td>
      <td style="padding:11px 14px;font-size:14px;font-weight:800;text-align:right;color:${TINTA};${i ? `border-top:1.5px solid ${LINEA};` : ""}">${
        href ? `<a href="${esc(href)}" style="color:${TINTA};text-decoration:underline;">${esc(v)} ↗</a>` : esc(v)
      }</td>
    </tr>`).join("")}
  </table>`;
}

/** Bienvenida al dueño cuando su suscripción queda activa/en trial. */
export function emailBienvenidaSuscripcion(o: { negocio: string; accent?: string; panelUrl: string }) {
  return {
    subject: "¡Bienvenido a Imán Turnos! 🧲",
    html: layout({
      accent: o.accent,
      preheader: "Tu prueba de 7 días ya está activa.",
      heading: `¡Listo${o.negocio ? `, ${o.negocio}` : ""}! Tu agenda ya vive en Imán`,
      lead: `Tu suscripción quedó activa y arrancaste tus <b style="color:${TINTA}">7 días gratis</b>. No se cobra nada hasta que termine el trial, y cancelás cuando quieras.`,
      bodyHtml: `<p style="margin:0;font-size:14px;line-height:1.6;color:${TINTA_SUAVE};">Cargá tus servicios y horarios, y compartí tu link de reservas en la bio de Instagram o tu estado de WhatsApp. Tus clientes reservan solos.</p>`,
      cta: { label: "Ir a mi agenda", url: o.panelUrl },
      footerNote: "Recibís este email porque activaste tu suscripción en Imán Turnos.",
    }),
  };
}

/** Confirmación al cliente que reservó (si dejó su email). */
export function emailConfirmacionCliente(o: {
  negocio: string; cliente: string; servicio: string; fecha: string; hora: string;
  profesional?: string | null; direccion?: string | null; mapsUrl?: string | null; accent?: string; url?: string;
}) {
  // "Dónde" con link a Google Maps si el negocio cargó uno ("Cómo llegar").
  const donde: Fila[] = o.mapsUrl
    ? [[ "Dónde", o.direccion || "Ver en Google Maps", o.mapsUrl ]]
    : o.direccion ? [["Dónde", o.direccion]] : [];
  return {
    subject: `Turno confirmado en ${o.negocio}`,
    html: layout({
      accent: o.accent,
      preheader: `${o.servicio} · ${o.fecha} ${o.hora} hs`,
      heading: "¡Tu turno está confirmado!",
      lead: `Hola ${esc(o.cliente)}, te esperamos en <b style="color:${TINTA}">${esc(o.negocio)}</b>.`,
      bodyHtml: filas([
        ["Servicio", o.servicio],
        ...(o.profesional ? [["Profesional", o.profesional] as Fila] : []),
        ["Cuándo", `${o.fecha} · ${o.hora} hs`],
        ...donde,
      ]),
      cta: o.url ? { label: "Ver o cancelar mi turno", url: o.url } : undefined,
      footerNote: "Si no podés asistir, cancelá desde el link para liberar el lugar.",
    }),
  };
}

/** Aviso al dueño cuando entra una reserva (si activó las notificaciones). */
export function emailAvisoTurnoAdmin(o: {
  negocio: string; cliente: string; telefono: string; servicio: string; fecha: string; hora: string;
  profesional?: string | null; accent?: string; panelUrl: string;
}) {
  return {
    subject: `Nuevo turno: ${o.cliente} · ${o.fecha} ${o.hora}`,
    html: layout({
      accent: o.accent,
      preheader: `${o.servicio} · ${o.fecha} ${o.hora} hs`,
      heading: "Nuevo turno reservado 🗓️",
      lead: `<b style="color:${TINTA}">${esc(o.cliente)}</b> reservó en la agenda de ${esc(o.negocio)}.`,
      bodyHtml: filas([
        ["Cliente", o.cliente],
        ["Servicio", o.servicio],
        ...(o.profesional ? [["Profesional", o.profesional] as [string, string]] : []),
        ["Cuándo", `${o.fecha} · ${o.hora} hs`],
        ["WhatsApp", o.telefono],
      ]),
      cta: { label: "Abrir mi agenda", url: o.panelUrl },
      footerNote: "Recibís este aviso porque activaste las notificaciones por email.",
    }),
  };
}
