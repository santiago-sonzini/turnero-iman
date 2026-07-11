# Imán Turnos

Turnero multi-tenant para comercios de servicios. Incluye agenda diaria con huecos accionables, vistas semana/mes, clientes recurrentes, promociones, servicios y horarios, tema por negocio, onboarding, reserva pública sin cuenta y suscripciones de Mercado Pago.

## Desarrollo

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

El seed crea **Barbería El Roble** (`/reservar/el-roble`) con servicios, clientes, historial, una semana realista y huecos en el día actual.

## Arquitectura

- Next.js App Router + Server Components/Actions.
- PostgreSQL + Prisma, con `tenantId` inyectado en el cliente scoped de `src/server/db.ts`.
- Supabase Auth para dueños; la reserva pública no requiere cuenta.
- Mercado Pago Suscripciones (`preapproval`) con webhook firmado y estados de trial, gracia y bloqueo.
- `Turnos` — ARS 15.000/mes: agenda, reservas, clientes, promos, links `wa.me` y Gmail/SMTP opcional.
- `Turnos Auto` — ARS 25.000/mes: agrega automatización open-wa.

La reserva comprueba disponibilidad y escribe cliente+turno en una transacción. PostgreSQL aplica además `appointment_no_overlap`, una exclusión GiST sobre el rango horario por tenant; dos reservas simultáneas no pueden ocupar el mismo intervalo.

## Variables

Ver `.env.example`. Para Gmail se usa una contraseña de aplicación en `SMTP_USER`/`SMTP_PASS`. Mercado Pago Suscripciones se prueba con usuarios de prueba vendedor/comprador y el token `APP_USR` del vendedor de prueba; el webhook es `/api/mp/webhook`.

## Turnos Auto / open-wa

El worker vive en `wa-server/` y debe correr como proceso persistente, separado de Next.js:

```bash
cd wa-server
npm install
WA_SERVER_TOKEN=... IMAN_CORE_URL=https://app.example.com npm start
```

- Cada tenant guarda su sesión exclusivamente en `wa-server/sessions/<tenantId>`.
- La activación exige aceptación explícita del riesgo de una integración no oficial; se guarda fecha y responsable en `Tenant`.
- La app persiste mensajes en `MessageJob`. El worker reclama lotes pequeños, aplica un intervalo aleatorio de 25–70 segundos, y reporta resultados.
- Los errores reintentan con backoff exponencial hasta cuatro intentos. Después pasan a `FALLBACK`, para que el dueño continúe mediante `wa.me`.
- Estados `DISCONNECTED`, `QR_PENDING`, `CONNECTED`, `DEGRADED` y `BANNED` son visibles en Ajustes. La caída o baneo del worker nunca bloquea agenda, reservas ni facturación.
- `wa-server/auth`, `wa-server/sessions` y perfiles de navegador están ignorados por Git. No copies sesiones entre tenants.

## Señas

Las señas están postergadas. `BusinessProfile.depositsEnabled` y los campos `deposit*` de `Appointment` existen, pero toda reserva los deja desactivados. No hay Checkout de Mercado Pago para señas; la suscripción SaaS usa una integración separada.

## Commits de migración

- `eefe77f`: snapshot previo del producto retail.
- `d9d6aca`: eliminación aislada de ventas, productos, facturación, analítica e integración distribuidora.

La migración `20260711143000_turnos_product` conserva tenants, usuarios, suscripciones y contactos útiles, elimina las tablas retail y crea el dominio de turnos.
