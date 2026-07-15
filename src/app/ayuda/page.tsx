"use client";
// Guía de Imán Turnos: TODA la funcionalidad explicada, con anclas por sección
// (los "?" de Ajustes deep-linkean acá: /ayuda#seccion).
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MagnetLogo } from "@/components/turnos/magnet-logo";

const SECCIONES = [
  { id: "primeros-pasos", emoji: "🚀", titulo: "Primeros pasos" },
  { id: "agenda", emoji: "📅", titulo: "La agenda" },
  { id: "crear-turno", emoji: "➕", titulo: "Crear un turno a mano" },
  { id: "pagina", emoji: "🔗", titulo: "Tu página de reservas" },
  { id: "servicios", emoji: "✂️", titulo: "Servicios" },
  { id: "clientes", emoji: "🧑‍🤝‍🧑", titulo: "Clientes" },
  { id: "promos", emoji: "🎁", titulo: "Promos" },
  { id: "profesionales", emoji: "💈", titulo: "Profesionales (Turnos Pro)" },
  { id: "apariencia", emoji: "🎨", titulo: "Color, logo y temas" },
  { id: "emails", emoji: "📬", titulo: "Emails y avisos" },
  { id: "ajustes-reserva", emoji: "⚙️", titulo: "Reservas y disponibilidad" },
  { id: "suscripcion", emoji: "💳", titulo: "Planes y suscripción" },
];

export default function Ayuda() {
  const router = useRouter();
  const volver = () => {
    if (window.history.length > 1) router.back();
    else router.push("/app");
  };
  return <main className="docs">
    <header className="docs-top">
      <button className="bk-volver" onClick={volver}><ArrowLeft /> Volver</button>
      <div className="docs-brand"><MagnetLogo /><b>Imán Turnos</b></div>
    </header>

    <p className="eyebrow">GUÍA COMPLETA</p>
    <h1>Cómo funciona Imán</h1>
    <p className="docs-lead">Todo lo que hace la app, explicado corto y al grano. Si algo no cierra, <a href="https://wa.me/5493534797679?text=Hola!%20Tengo%20una%20consulta%20sobre%20Im%C3%A1n%20Turnos" target="_blank" rel="noopener noreferrer">escribinos por WhatsApp</a>.</p>

    <nav className="docs-indice" aria-label="Índice">
      {SECCIONES.map((s) => <a key={s.id} href={`#${s.id}`}>{s.emoji} {s.titulo}</a>)}
    </nav>

    <section id="primeros-pasos" className="docs-sec">
      <h2>🚀 Primeros pasos</h2>
      <p>Al crear tu cuenta te guiamos en 3 pasos: <b>tu negocio</b> (rubro, nombre, WhatsApp, ubicación y color), <b>tus servicios</b> (te sugerimos los típicos de tu rubro, ajustás precios y duración) y <b>tu plan</b>. Arrancás con <b>7 días gratis</b>: dejás el débito configurado en Mercado Pago pero no se cobra nada hasta que termina la prueba, y podés cancelar cuando quieras.</p>
      <p>Al terminar ya tenés tu link de reservas listo para compartir. Los horarios de atención vienen precargados (lunes a sábado) y los editás en Ajustes.</p>
    </section>

    <section id="agenda" className="docs-sec">
      <h2>📅 La agenda</h2>
      <ul>
        <li><b>Vistas:</b> Día, Semana y Mes. Tocá la fecha para saltar al mes, o usá las flechas para moverte.</li>
        <li><b>Turnos:</b> tocá cualquier turno para marcarlo como <b>asistió</b>, <b>no vino</b> o <b>cancelarlo</b>. Eso alimenta el historial del cliente.</li>
        <li><b>Huecos:</b> los espacios libres entre turnos aparecen marcados. Tocá <b>“Llenar hueco”</b> y te armamos la lista de clientes a los que ya les toca volver, con el mensaje de WhatsApp listo para mandar (con promo opcional).</li>
        <li><b>Filtro por profesional</b> (Turnos Pro): chips arriba de la agenda para ver la agenda de cada uno o de todos.</li>
      </ul>
    </section>

    <section id="crear-turno" className="docs-sec">
      <h2>➕ Crear un turno a mano</h2>
      <p>El botón <b>“＋ Crear turno”</b> de la agenda abre el alta manual: elegís servicio (y profesional si tenés equipo), día, uno de los horarios libres, y cargás nombre y WhatsApp del cliente. Si el cliente ya existe, al escribir su nombre se autocompleta el teléfono.</p>
      <p>El alta manual no tiene tope de anticipación: podés cargar a alguien que entró caminando para <b>ahora mismo</b>. Usa el mismo control de superposición que la página pública, así nunca se pisan dos turnos.</p>
    </section>

    <section id="pagina" className="docs-sec">
      <h2>🔗 Tu página de reservas</h2>
      <p>Tu link público es <b>tu-negocio</b>/turnos (el identificador lo editás en Ajustes → Reservas). Compartilo con el botón <b>Compartir</b> de arriba: copiar link, WhatsApp, o el menú del celular. Con Turnos Pro también hay un <b>link directo por profesional</b> que lo deja preseleccionado.</p>
      <ul>
        <li>El cliente elige servicio → (profesional) → día y horario → deja nombre y WhatsApp. Sin cuenta ni app.</li>
        <li>Puede <b>agregar el turno a su calendario</b> y escribirte por WhatsApp desde la confirmación.</li>
        <li>Puede <b>cancelar online</b> hasta N horas antes (vos definís N en Ajustes → Reservas). Dentro de esa ventana, la app le pide que te escriba.</li>
        <li>Si vuelve desde el mismo dispositivo (o desde el link de su email), ve <b>sus próximos turnos</b> y los puede cancelar ahí.</li>
        <li>Si cargaste dirección o link de Google Maps, aparece <b>“Cómo llegar”</b>; si cargaste Instagram, aparece el botón con tu usuario.</li>
      </ul>
    </section>

    <section id="servicios" className="docs-sec">
      <h2>✂️ Servicios</h2>
      <p>En la pestaña Servicios creás y editás lo que se puede reservar: nombre, emoji, <b>duración</b> (define los horarios que se ofrecen) y <b>precio</b>. Podés desactivar un servicio sin borrarlo: deja de aparecer en tu página pero conserva su historial.</p>
    </section>

    <section id="clientes" className="docs-sec">
      <h2>🧑‍🤝‍🧑 Clientes</h2>
      <p>Cada persona que reserva (o que cargás a mano) queda en tu base con su WhatsApp, email si lo dejó, y su historial de visitas. La app calcula su <b>ciclo</b> (cada cuántos días vuelve) y con eso arma la lista de “les toca volver” para llenar huecos.</p>
    </section>

    <section id="promos" className="docs-sec">
      <h2>🎁 Promos</h2>
      <p>Armás una promo en 3 toques: servicio, regalo y mensaje. Se genera un <b>link con vencimiento</b> que podés mandar por WhatsApp o colgar en un hueco puntual. Quien reserva desde ese link queda marcado con la promo.</p>
    </section>

    <section id="profesionales" className="docs-sec">
      <h2>💈 Profesionales <span className="docs-pill">Turnos Pro</span></h2>
      <ul>
        <li>Cargá hasta <b>3 profesionales</b> (Ajustes → Profesionales), cada uno con su emoji.</li>
        <li>Asignale a cada uno <b>sus servicios</b>. Sin asignar nada = ofrece todos.</li>
        <li>El cliente elige <b>con quién</b> atenderse (o “cualquiera”, y la app asigna a alguien libre). Dos profesionales pueden atender a la misma hora; el mismo profesional nunca se pisa.</li>
        <li>Cada profesional tiene su <b>link directo</b> (en Compartir) y su filtro en la agenda. El profesional asignado sale en la confirmación y en los emails.</li>
      </ul>
    </section>

    <section id="apariencia" className="docs-sec">
      <h2>🎨 Color, logo y temas</h2>
      <ul>
        <li><b>Color de marca:</b> elegí un swatch o escribí tu hex exacto (Ajustes → Color de tu marca) y tocá “Guardar color”. Pinta tu panel y tu página pública.</li>
        <li><b>Logo:</b> subilo en Ajustes → Datos y color. Se muestra en tu página de reservas en lugar del emoji.</li>
        <li><b>Temas</b> (Turnos Pro): Clásico, Profesional (limpio y sobrio) o Noche (oscuro). Cambian el estilo completo de tu página pública.</li>
      </ul>
    </section>

    <section id="emails" className="docs-sec">
      <h2>📬 Emails y avisos</h2>
      <ul>
        <li><b>Al cliente:</b> si deja su email al reservar, recibe la confirmación con servicio, profesional, fecha, “Cómo llegar” (si hay Maps) y un link para <b>ver o cancelar</b> su turno desde cualquier dispositivo.</li>
        <li><b>A vos:</b> con “Avisos por email” activado (viene activado, al mail de tu cuenta) te llega un aviso por <b>cada reserva</b>, tenga o no email el cliente, con el WhatsApp del cliente incluido. Podés cambiar el mail de destino o apagarlo en Ajustes → Avisos por email.</li>
      </ul>
    </section>

    <section id="ajustes-reserva" className="docs-sec">
      <h2>⚙️ Reservas y disponibilidad</h2>
      <ul>
        <li><b>Identificador del link:</b> la parte de la URL con el nombre de tu negocio. Editable (letras, números y guiones).</li>
        <li><b>Límite de agenda:</b> hasta cuántos días hacia adelante se puede reservar (1 a 90).</li>
        <li><b>Mostrar precios:</b> elegí si tu página pública muestra los precios o no.</li>
        <li><b>Vacaciones y feriados:</b> bloqueá rangos de fechas; esos días no se puede reservar.</li>
        <li><b>Ventana de cancelación:</b> hasta cuántas horas antes puede cancelar online el cliente.</li>
      </ul>
    </section>

    <section id="suscripcion" className="docs-sec">
      <h2>💳 Planes y suscripción</h2>
      <ul>
        <li><b>Turnos ($20.000/mes):</b> agenda, reservas online, clientes, promos, WhatsApp manual y emails.</li>
        <li><b>Turnos Pro ($35.000/mes):</b> todo lo anterior + hasta 3 profesionales con agenda propia y temas visuales.</li>
        <li><b>Turnos Personalizado ($60.000/mes):</b> hasta 10 profesionales, diseño personalizado y posibilidad de usar un dominio propio. Se contrata hablando con el equipo.</li>
        <li>El cobro es <b>débito automático con Mercado Pago</b> (crédito, débito, prepaga o dinero en cuenta). Los primeros 7 días son gratis.</li>
        <li>Cambiás de plan cuando quieras desde Ajustes → Suscripción (el monto nuevo rige desde el próximo ciclo). También podés <b>cancelar</b> ahí: seguís usando la app hasta el final del período ya pagado y tus datos quedan guardados.</li>
      </ul>
    </section>

    <footer className="docs-foot">
      <p>¿Quedó alguna duda? <a href="https://wa.me/5493534797679?text=Hola!%20Tengo%20una%20consulta%20sobre%20Im%C3%A1n%20Turnos" target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a> y te ayudamos.</p>
      <button className="btn btn-acento" onClick={volver}><ArrowLeft /> Volver a donde estaba</button>
    </footer>
  </main>;
}
