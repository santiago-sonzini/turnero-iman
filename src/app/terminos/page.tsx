import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Imán Turnos",
  description: "Las reglas del servicio Imán Turnos: cuenta, suscripción, uso correcto y tus derechos sobre los datos.",
};

export default function TermsPage() {
  return <main className="docs-page">
    <Link className="bk-volver" href="/">← Volver</Link>
    <p className="eyebrow">TÉRMINOS Y CONDICIONES</p>
    <h1>Las reglas del servicio</h1>
    <p className="docs-lead">Estos términos regulan el uso de Imán Turnos. Al crear una cuenta o usar el servicio, aceptás lo que sigue. Si no estás de acuerdo, no lo uses.</p>

    <h2>1. El servicio</h2>
    <p>Imán Turnos es una herramienta para administrar tu agenda: publicar una página de reservas con tu marca, recibir turnos online, gestionar clientes y enviar comunicaciones y recordatorios. Podemos mejorar, cambiar o discontinuar funciones para mantener el servicio al día.</p>

    <h2>2. Tu cuenta</h2>
    <p>Necesitás ser mayor de edad y estar habilitado para operar el negocio que registrás. Sos responsable de la veracidad de los datos, de mantener tu clave segura y de toda actividad realizada desde tu cuenta. Avisanos apenas detectes un uso no autorizado.</p>

    <h2>3. Prueba gratis y suscripción</h2>
    <p>Ofrecemos un período de prueba gratuito. Al finalizar, para seguir usando el servicio elegís un plan que se cobra por Mercado Pago. La suscripción se renueva de forma automática según el plan elegido y podés cancelarla cuando quieras desde la aplicación; la baja aplica al final del período ya pagado y no genera reembolsos por tramos no usados, salvo que la ley lo exija.</p>

    <h2>4. Uso correcto</h2>
    <p>Te comprometés a usar Imán Turnos de forma legal y a no enviar spam ni comunicaciones no solicitadas. Las promociones a clientes son opt-in: solo podés contactarlos con fines promocionales si dieron su consentimiento. No está permitido vulnerar la seguridad del servicio, revenderlo sin autorización ni usarlo para actividades fraudulentas o dañinas.</p>

    <h2>5. Datos de tus clientes</h2>
    <p>Sos el responsable de los datos de tus clientes que cargues o que se generen con tus reservas; nosotros los tratamos por tu cuenta para prestarte el servicio. Debés contar con base legal para tratarlos y respetar sus derechos. El detalle de qué datos usamos y para qué está en la <Link href="/privacidad">política de privacidad</Link>, que forma parte de estos términos.</p>

    <h2>6. Tus derechos sobre los datos</h2>
    <p>Sos titular de los datos de tu cuenta y podés, en cualquier momento, solicitar acceso a los datos que tenemos, obtener una exportación en un formato de uso común, corregir información inexacta, limitar u oponerte a ciertos tratamientos y pedir la eliminación de tu cuenta y de los datos de tus clientes. Alcanza con escribir al canal de soporte publicado en la aplicación; respondemos en un plazo razonable.</p>

    <h2>7. Propiedad intelectual</h2>
    <p>El software, la marca y el diseño de Imán Turnos son nuestros o de nuestros licenciantes. Te damos una licencia limitada, no exclusiva e intransferible para usar el servicio mientras tu cuenta esté activa. Tus datos y los de tus clientes siguen siendo tuyos.</p>

    <h2>8. Disponibilidad y responsabilidad</h2>
    <p>Trabajamos para que el servicio esté disponible y seguro, pero se presta "tal cual" y no garantizamos que funcione sin interrupciones ni errores. En la medida permitida por la ley, no somos responsables por daños indirectos ni por lucro cesante, y nuestra responsabilidad total se limita a lo que hayas pagado por el servicio en los últimos meses. Nada de esto limita derechos que la ley reconoce como irrenunciables.</p>

    <h2>9. Suspensión y baja</h2>
    <p>Podés dar de baja tu cuenta cuando quieras. Podemos suspender o cerrar cuentas que incumplan estos términos, que representen un riesgo de seguridad o fraude, o cuando la ley lo requiera, dándote aviso cuando sea posible.</p>

    <h2>10. Cambios en los términos</h2>
    <p>Podemos actualizar estos términos. Si el cambio es relevante, te lo comunicamos por un medio razonable. Seguir usando el servicio después de la actualización implica aceptar la nueva versión.</p>

    <h2>11. Ley aplicable</h2>
    <p>Estos términos se rigen por las leyes de la República Argentina. Cualquier conflicto se resolverá ante los tribunales competentes de dicha jurisdicción, sin perjuicio de los derechos que la normativa de consumo te reconozca.</p>

    <h2>12. Contacto</h2>
    <p>Para consultas sobre estos términos, ejercer tus derechos o reportar un problema, escribinos al canal de soporte publicado en la aplicación.</p>

    <p className="ayuda">Última actualización: 13 de julio de 2026.</p>
  </main>;
}
