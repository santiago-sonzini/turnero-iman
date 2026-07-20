import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/santiagosonzini/Desktop/iman-turnero/outputs/019f636e-318b-7213-990f-2758f10d3c3c";

const prospects = [
  { priority: "Alta", contactType: "Instagram/WhatsApp publicado", business: "AM Beauty Studio", category: "Centro de estética", phone: "5493534133933", instagram: "https://www.instagram.com/ambeautystudio.vm/", maps: "https://www.google.com/maps/place/AM+Beauty+Studio+Villa+Mar%C3%ADa/data=!4m7!3m6!1s0x95cc43003c64fe23:0x5c4681b11f932cea!8m2!3d-32.4168081!4d-63.2353874!16s%2Fg%2F11z6fvwjm3", angle: "ordenar las reservas de los distintos servicios y aprovechar mejor cada espacio de la agenda" },
  { priority: "Alta", contactType: "Instagram/WhatsApp publicado", business: "Calma Spa", category: "Spa", phone: "5493534455743", instagram: "https://www.instagram.com/calma.vm/", maps: "https://www.google.com/maps/place/Calma+Spa/data=!4m7!3m6!1s0x95cc43004a6b8513:0xf6044487624e60d9!8m2!3d-32.4135363!4d-63.2468336!16s%2Fg%2F11vzzqg_qt", angle: "organizar tratamientos de distintas duraciones y reducir huecos entre reservas" },
  { priority: "Alta", contactType: "Instagram/WhatsApp publicado", business: "Romeli Piercing and Tattoo", category: "Tattoo y piercing", phone: "5493534273891", instagram: "https://www.instagram.com/romelitattoo/", maps: "https://www.google.com/maps/place/Romeli+Piercing+and+Tattoo/data=!4m7!3m6!1s0x95cc42e72fceaf33:0x359c62403794e34b!8m2!3d-32.412051!4d-63.243885!16s%2Fg%2F11bw5mf6q6", angle: "separar consultas de reservas y ordenar mejor las sesiones" },
  { priority: "Alta", contactType: "Instagram/WhatsApp publicado", business: "YB Peluquería Femenina", category: "Peluquería", phone: "5493536574962", instagram: "https://www.instagram.com/yb_peluqueriafemenina/", maps: "https://www.google.com/maps/place/Yb+peluquer%C3%ADa+femenina/data=!4m7!3m6!1s0x95cc43000e915d29:0x433994069200095c!8m2!3d-32.3987721!4d-63.2405889!16s%2Fg%2F11mld8kjnv", angle: "ordenar servicios con distintas duraciones y dejar que las clientas reserven sin esperar respuesta" },
  { priority: "Alta", contactType: "Instagram/WhatsApp publicado", business: "Eliana Ahumada Peluquería", category: "Peluquería", phone: "5493534821456", instagram: "https://www.instagram.com/eliana.ahumada.peluqueria/", maps: "https://www.google.com/maps/place/Eliana+Ahumada+Peluqueria/data=!4m7!3m6!1s0x95cc434e576722fb:0xab05e9569bfe724!8m2!3d-32.4022018!4d-63.2355837!16s%2Fg%2F11zjlx49kv", angle: "recibir reservas incluso cuando estás atendiendo y evitar tantos mensajes de ida y vuelta" },
  { priority: "Alta", contactType: "Instagram/WhatsApp publicado", business: "Khalor House", category: "Barbería", phone: "5493534178288", instagram: "https://www.instagram.com/khalorhouse/", maps: "https://www.google.com/maps/place/Khalor+House/data=!4m7!3m6!1s0x95cc43505fc8c855:0xce7e78d0f5103e4!8m2!3d-32.4058562!4d-63.2325686!16s%2Fg%2F11w9fhl7jp", angle: "hacer que cada cliente elija servicio y horario sin tener que coordinar todo por chat" },
  { priority: "Alta", contactType: "Instagram/WhatsApp publicado", business: "AGUS MR Nails", category: "Uñas y academia", phone: "5493534765970", instagram: "", maps: "https://www.google.com/maps/place/AGUS+MR+NAILS+-+STORE+-+ACADEMY/data=!4m7!3m6!1s0x95cc4324c11d6337:0x4c97a2c476c67b40!8m2!3d-32.4108173!4d-63.2502016!16s%2Fg%2F11pztq9td9", angle: "separar los turnos de servicios de uñas y ordenar mejor cada bloque de trabajo" },
  { priority: "Alta", contactType: "Instagram/WhatsApp publicado", business: "Nails Studio by Anye", category: "Uñas", phone: "5493536566157", instagram: "https://www.instagram.com/nailsby.anye/", maps: "https://www.google.com/maps/place/Nails+Studio+by+Anye/data=!4m7!3m6!1s0x95cc43004200dac5:0xddcfeb38a30aa949!8m2!3d-32.4100741!4d-63.2357674!16s%2Fg%2F11z9bw4t8k", angle: "acomodar servicios de distinta duración y llenar más fácilmente los horarios disponibles" },
  { priority: "Alta", contactType: "Instagram/WhatsApp publicado", business: "Bela Centro de Estética", category: "Centro de estética", phone: "5493534407017", instagram: "https://www.instagram.com/bela.estetica.vm/", maps: "https://www.google.com/maps/place/Bela+-+Centro+de+Est%C3%A9tica/data=!4m7!3m6!1s0x95cc43da347066db:0xc3315101b4aa3a56!8m2!3d-32.4072199!4d-63.2438316!16s%2Fg%2F11wj5sp6bq", angle: "centralizar reservas y hacer que cada clienta encuentre un horario disponible sin esperar respuesta" },
  { priority: "Alta", contactType: "Instagram/WhatsApp publicado", business: "Piercing VM", category: "Piercing", phone: "5493534241091", instagram: "https://www.instagram.com/piercingvm/", maps: "https://www.google.com/maps/place/Piercing+vm+@piercingvm/data=!4m7!3m6!1s0x95cc4314d1c6f003:0xba91d006db8d9ce1!8m2!3d-32.4030104!4d-63.2421902!16s%2Fg%2F11t47cwq4g", angle: "separar las consultas del momento de reservar y ordenar los espacios del estudio" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "Estética Centro", category: "Estética y depilación", phone: "5493534228952", instagram: "", maps: "https://www.google.com/maps/place/Est%C3%A9tica+Centro/data=!4m7!3m6!1s0x95cc43f216518bcb:0x327e018563f69a1e!8m2!3d-32.4070368!4d-63.242316!16s%2Fg%2F11f7b150v0", angle: "ordenar sesiones y tratamientos de distinta duración sin depender de coordinar todo por mensajes" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "María Centro de Salud y Spa", category: "Salud, estética y spa", phone: "5493535084165", instagram: "", maps: "https://www.google.com/maps/place/Mar%C3%ADa+Centro+de+Salud+y+spa/data=!4m7!3m6!1s0x9432986f9eb90f67:0xc90f994dcaac1026!8m2!3d-32.4123195!4d-63.2470174!16s%2Fg%2F1q628q4z2", angle: "coordinar profesionales y tratamientos desde una sola agenda" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "María V Estudio de Belleza & Spa", category: "Belleza y spa", phone: "5493534590820", instagram: "", maps: "https://www.google.com/maps/place/Maria+V+%7C+Estudio+de+belleza+%26+spa/data=!4m7!3m6!1s0x95cc43186999c705:0xc236b37ea384b825!8m2!3d-32.4156453!4d-63.2461009!16s%2Fg%2F11xkpgkc7x", angle: "ordenar los distintos servicios y aprovechar mejor los espacios libres de la agenda" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "AMBAR Centro de Estética", category: "Centro de estética", phone: "5493534191598", instagram: "", maps: "https://www.google.com/maps/place/AMBAR+Centro+de+Est%C3%A9tica/data=!4m7!3m6!1s0x95cc42f210494a5d:0x4d61372b461315e8!8m2!3d-32.4129639!4d-63.2343452!16s%2Fg%2F11g71k9ppf", angle: "darles a las clientas una forma simple de reservar y reducir la coordinación manual" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "Evolution", category: "Centro de estética", phone: "5493571458331", instagram: "", maps: "https://www.google.com/maps/place/Evolution/data=!4m7!3m6!1s0x95cc43df62f94aa5:0x13d55936667704ff!8m2!3d-32.4075329!4d-63.2362685!16s%2Fg%2F11r3dglw10", angle: "centralizar las reservas y ocupar mejor los horarios que van quedando libres" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "L-Gantes Nails", category: "Uñas", phone: "5493535625092", instagram: "", maps: "https://www.google.com/maps/place/L-Gantes+Nails/data=!4m7!3m6!1s0x95cc43425f11e2df:0x64f973747fc974d!8m2!3d-32.4000927!4d-63.2298559!16s%2Fg%2F11rs9_q2ys", angle: "organizar cada servicio por duración y facilitar que las clientas reserven solas" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "Las Brujas Tattoo", category: "Tattoo", phone: "5493534220223", instagram: "", maps: "https://www.google.com/maps/place/Las+Brujas+Tattoo/data=!4m7!3m6!1s0x95cc434569dc8f41:0xbee359c1435523c5!8m2!3d-32.4031077!4d-63.2357576!16s%2Fg%2F11zb2z636d", angle: "ordenar las sesiones y evitar mezclar consultas con la coordinación de turnos" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "Tattoolencina", category: "Tattoo", phone: "5493534265552", instagram: "", maps: "https://www.google.com/maps/place/Tattoolencina/data=!4m7!3m6!1s0x95cd238dcfda9ed5:0x9b014c329f3459f9!8m2!3d-32.4088946!4d-63.2323133!16s%2Fg%2F11qp56w3wh", angle: "organizar sesiones y dejar disponibles horarios concretos sin tanto ida y vuelta por chat" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "Jamaica Tattoo", category: "Tattoo", phone: "5493534816556", instagram: "", maps: "https://www.google.com/maps/place/Jamaica+Tattoo/data=!4m7!3m6!1s0x95cc42efb14c9021:0x658e64f8b5f3c5f2!8m2!3d-32.4051223!4d-63.2176996!16s%2Fg%2F11g8wd8kcs", angle: "ordenar las reservas del estudio y separar mejor las consultas de los turnos confirmados" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "Clapton BarberShop", category: "Barbería", phone: "5493535653313", instagram: "", maps: "https://www.google.com/maps/place/Clapton+BarberShop/data=!4m7!3m6!1s0x95cc42d9240afb03:0x8d39feaa3e6a94b!8m2!3d-32.404125!4d-63.2462281!16s%2Fg%2F11dx8_shfz", angle: "hacer que los clientes elijan servicio y horario sin interrumpir el trabajo para responder mensajes" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "MAV Peluquería", category: "Peluquería y barbería", phone: "5493534080386", instagram: "", maps: "https://www.google.com/maps/place/MAV-Peluqueria/data=!4m7!3m6!1s0x95cc42c51246f361:0x3a00249798332a6c!8m2!3d-32.3993599!4d-63.2363593!16s%2Fg%2F11f50m3hqd", angle: "ordenar cortes y servicios por duración y recibir reservas sin depender del chat" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "Moreletti Peluquería", category: "Peluquería", phone: "5493534249769", instagram: "", maps: "https://www.google.com/maps/place/Moreletti+Peluqueria+Tradicional/data=!4m7!3m6!1s0x95cc42c6a8d66921:0xa1d5b6f25fad03aa!8m2!3d-32.4017316!4d-63.2329782!16s%2Fg%2F11gg752tb4", angle: "recibir reservas sin cortar la atención para coordinar horarios por mensajes" },
  { priority: "Media", contactType: "Número publicado; validar WhatsApp", business: "Las Oggero", category: "Peluquería", phone: "5493534524090", instagram: "", maps: "https://www.google.com/maps/place/Las+Oggero/data=!4m7!3m6!1s0x95cc42c2b8509dd3:0x292bfd63f2f206f0!8m2!3d-32.4075296!4d-63.237312!16s%2Fg%2F1td7vcv6", angle: "coordinar mejor los distintos servicios y evitar tantos mensajes para encontrar horario" },
];

function messageFor(p) {
  return `Hola, ¿cómo estás? Estuve viendo ${p.business} y pensé que Imán Turnos podría ayudarles a ${p.angle}. Mi propuesta es bien personalizada: yo mismo te configuro servicios, horarios y la página con la identidad del negocio, y te acompaño por WhatsApp hasta que quede funcionando. ¿Querés que te prepare una muestra para ${p.business}, sin compromiso?`;
}

function displayPhone(phone) {
  const national = phone.replace(/^549/, "");
  if (national.startsWith("353")) {
    const local = national.slice(3);
    return `AR +54 9 353 ${local.slice(0, 3)}-${local.slice(3)}`;
  }
  if (national.startsWith("3571")) {
    const local = national.slice(4);
    return `AR +54 9 3571 ${local.slice(0, 3)}-${local.slice(3)}`;
  }
  return `AR +${phone}`;
}

const headers = [
  "orden",
  "prioridad",
  "tipo_contacto",
  "negocio",
  "rubro",
  "telefono_internacional",
  "instagram",
  "google_maps",
  "mensaje_personalizado",
  "whatsapp_con_mensaje",
  "estado",
  "fecha_verificacion",
];

const rows = prospects.map((p, index) => {
  const message = messageFor(p);
  return [
    index + 1,
    p.priority,
    p.contactType,
    p.business,
    p.category,
    displayPhone(p.phone),
    p.instagram,
    p.maps,
    message,
    `https://wa.me/${p.phone}?text=${encodeURIComponent(message)}`,
    "Pendiente",
    "2026-07-15",
  ];
});

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Prospectos");
sheet.showGridLines = false;
sheet.getRangeByIndexes(0, 0, rows.length + 1, headers.length).values = [headers, ...rows];
sheet.getRange("A1:L1").format = {
  fill: "#7C3AED",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true,
};
sheet.getRange(`A2:L${rows.length + 1}`).format = {
  verticalAlignment: "top",
};
sheet.getRange(`C2:C${rows.length + 1}`).format.wrapText = true;
sheet.getRange(`D2:E${rows.length + 1}`).format.wrapText = true;
sheet.getRange(`G2:J${rows.length + 1}`).format.wrapText = true;
sheet.getRange(`A1:L${rows.length + 1}`).format.borders = {
  insideHorizontal: { style: "thin", color: "#E5E7EB" },
  bottom: { style: "thin", color: "#D1D5DB" },
};
sheet.getRange("A:A").format.columnWidth = 7;
sheet.getRange("B:B").format.columnWidth = 10;
sheet.getRange("C:C").format.columnWidth = 24;
sheet.getRange("D:D").format.columnWidth = 26;
sheet.getRange("E:E").format.columnWidth = 20;
sheet.getRange("F:F").format.columnWidth = 20;
sheet.getRange(`F2:F${rows.length + 1}`).format.numberFormat = "@";
sheet.getRange("G:H").format.columnWidth = 34;
sheet.getRange("I:I").format.columnWidth = 78;
sheet.getRange("J:J").format.columnWidth = 55;
sheet.getRange("K:K").format.columnWidth = 14;
sheet.getRange("L:L").format.columnWidth = 16;
sheet.freezePanes.freezeRows(1);
sheet.tables.add(`A1:L${rows.length + 1}`, true, "ProspectosTable");

const inspection = await workbook.inspect({
  kind: "table",
  range: `Prospectos!A1:L${rows.length + 1}`,
  include: "values,formulas",
  tableMaxRows: rows.length + 1,
  tableMaxCols: headers.length,
  maxChars: 12000,
});
await fs.writeFile(`${outputDir}/qa_inspect.ndjson`, inspection.ndjson, "utf8");

const preview = await workbook.render({
  sheetName: "Prospectos",
  range: "A1:L8",
  scale: 0.8,
  format: "png",
});
await fs.writeFile(`${outputDir}/qa_preview.png`, new Uint8Array(await preview.arrayBuffer()));

const tempXlsx = await SpreadsheetFile.exportXlsx(workbook);
await tempXlsx.save(`${outputDir}/qa_outreach.xlsx`);

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
const csvPath = `${outputDir}/prospectos_whatsapp_personalizados.csv`;
await fs.writeFile(csvPath, `\uFEFF${csv}`, "utf8");

console.log(JSON.stringify({ csvPath, rowCount: rows.length, preview: `${outputDir}/qa_preview.png` }));
