# Imán Turnos

Turnero multi-tenant para negocios de servicios. Incluye agenda, reserva pública, clientes, promociones, equipos de hasta tres profesionales, suscripciones de Mercado Pago y recordatorios por email o WhatsApp.

## Requisitos

- Node.js 20.9 o superior.
- PostgreSQL accesible mediante `DATABASE_URL` y `DIRECT_URL`.
- Supabase Auth para el acceso de dueños en producción.

## Desarrollo

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Antes de integrar cambios:

```bash
npm run check
npm run build
```

`npm run check` ejecuta ESLint, TypeScript y Vitest. El seed crea **Barbería El Roble** en `/el-roble/turnos` con datos de muestra.

## Arquitectura

- Next.js 16 App Router, React 19, Server Components y Server Actions.
- PostgreSQL + Prisma. El cliente scoped de `src/server/db.ts` inyecta `tenantId`, y las claves compuestas también impiden cruces de tenant en la base.
- Supabase Auth para dueños. Sin Supabase, el modo demo solo existe en desarrollo; producción falla cerrada.
- Mercado Pago Suscripciones con una preapproval individual por tenant, webhook firmado, idempotencia persistente y estados de trial, gracia y bloqueo.
- `Turnos` — ARS 15.000/mes: agenda, reservas, clientes, promos, links de WhatsApp y email opcional.
- `Turnos Pro` — ARS 30.000/mes: agrega profesionales, temas y automatización de WhatsApp.

La reserva valida disponibilidad y escribe cliente + turno dentro de una transacción. PostgreSQL aplica además la exclusión GiST `appointment_no_overlap`. Los enlaces privados usan tokens aleatorios por turno dentro del fragmento de URL; el servidor los intercambia por cookies HttpOnly y nunca toma el teléfono como prueba de identidad.

## Variables

Ver `.env.example`. `RATE_LIMIT_SALT` debe ser un secreto aleatorio estable. Para Gmail se usa una contraseña de aplicación en `SMTP_USER`/`SMTP_PASS`. El webhook de Mercado Pago es `/api/mp/webhook`.

## Worker de WhatsApp

El worker vive en `wa-server/` y debe ejecutarse como proceso persistente, aislado de Next.js:

```bash
cd wa-server
npm install
WA_SERVER_TOKEN=... IMAN_CORE_URL=https://app.example.com npm start
```

- Escucha en `127.0.0.1` por defecto. Exponerlo requiere un proxy privado/TLS y el bearer token.
- Cada tenant guarda su sesión exclusivamente debajo de `wa-server/sessions/<tenantId>`.
- Usa WhatsApp Web mediante `whatsapp-web.js`; sigue siendo una integración no oficial y requiere aceptación explícita del riesgo.
- Los mensajes se persisten en `MessageJob`. El worker usa leases recuperables, lotes pequeños, ritmo aleatorio de 25–70 segundos y backoff.
- Tras agotar reintentos, el mensaje pasa a `FALLBACK` para continuar con `wa.me`.
- La caída o el bloqueo del worker no afecta agenda, reservas ni facturación.

Nunca copies sesiones entre tenants ni las subas a Git.

## Seguridad y privacidad

- La reserva pública tiene rate limiting persistente por IP anonimizada y teléfono.
- Los tenants sin acceso vigente no pueden recibir reservas.
- Los datos públicos se exponen mediante DTOs mínimos; credenciales y facturación no se serializan al navegador.
- Se aplican CSP y headers de seguridad, validación estricta de links externos y controles de origen/identidad en billing y webhooks.
- La autorización del débito y el cobro son estados separados: el panel consulta las facturas de Mercado Pago y solo muestra “pago verificado” ante un pago aprobado.
- No se carga Meta Pixel. La política pública está en `/privacidad`.

## Migraciones

Las migraciones son parte del despliegue y deben aplicarse antes de iniciar la nueva versión:

```bash
npm run db:migrate
```

`20260713010000_security_hardening` agrega tokens por turno, idempotencia de webhooks, rate limiting, leases del worker e integridad multi-tenant, e invalida los tokens históricos por cliente. La columna legacy se conserva temporalmente para un rollout sin caída y ya no se usa en el código nuevo.

La ruta protegida `/api/mp/reconcile` revisa diariamente suscripciones abandonadas, vínculos y cobros. En Vercel requiere `CRON_SECRET`; el cron está declarado en `vercel.json`.
