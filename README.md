# Imán

**Vendé más con los clientes que ya tenés.** Sistema de facturación +
inteligencia de clientes: cada venta registrada alimenta un semáforo
(activo / en riesgo / dormido / perdido) calculado contra el ciclo de compra
propio de cada cliente, con recupero por WhatsApp (nada se manda solo) y
medición de resultados.

## Correr la demo (sin base de datos)

```bash
npm install
npm run dev
```

Sin `DATABASE_URL`, la app arranca en **modo demo**: Postgres embebido
(PGlite) que se seedea solo con un negocio ficticio según el pack elegido
(`?tipo=comercio&rubro=petshop`, etc.) — clientes con historia de ~9 meses,
productos, plantillas y un recupero ya registrado. Cada pack es una base
aislada con su propio tenant demo (plan Completo activo, sin onboarding).
Los datos viven en `.pglite-demos-v2/`:

```bash
npm run demo:reset   # borra la demo; el próximo arranque re-seedea
```

## WhatsApp directo e imágenes (opcional)

Por defecto nada se manda solo: cada botón abre **wa.me** con el mensaje
listo. Si querés **enviar directo desde la app** (incluso imágenes: flyers,
promos 2x1), levantá el servidor opcional de WhatsApp (Baileys, sin Chromium):

```bash
cd wa-server
npm install    # rápido, sin navegador
npm start      # después abrí http://localhost:8321/qr y escaneá el QR
```

y en el `.env` de la app: `WA_SERVER_URL=http://localhost:8321`.
⚠️ Es un proceso persistente (mantiene la sesión de WhatsApp viva): corre en
una compu o VPS prendida, **no en serverless**. Sin él, todo sigue
funcionando por wa.me.

Las **plantillas** (Promos → Plantillas) aceptan una imagen opcional (ej: un
flyer 2x1, hay uno de ejemplo en la demo) y el armador de promos permite
subir un flyer o usar la foto del producto. Con el servidor conectado la
imagen sale junto al mensaje; por wa.me va solo el texto (la adjuntás a
mano). Sin Supabase, las imágenes suben a `public/uploads/` del server.

**Email marketing** (Promos → pestaña Email): mismos segmentos y plantillas,
con asunto propio. Sin configurar nada, cada botón abre tu cliente de correo
(mailto:) con el email listo; con `SMTP_USER`/`SMTP_PASS` en el `.env` se
envía directo desde la app (con la imagen embebida). Todo contacto queda
registrado igual que WhatsApp.

> **Resultados** está deshabilitado por ahora (atribuir recuperos es difícil
> de medir con precisión). El cálculo sigue en el motor; para reactivar la
> pantalla ver `src/app/dashboard/resultados/page.tsx`.

## SaaS multi-tenant

La app es **multi-tenant**: un solo deploy (app.iman.ar), una sola base, muchos
negocios. Cada negocio es un `Tenant`; el registro crea tenant + usuario dueño
y arranca el onboarding.

### Aislamiento: base compartida + `tenantId` por fila

Elegido por costo y simplicidad (Postgres/Supabase ya estaba en el stack; una
base por tenant sería carísima de operar para comercios chicos). Lo importante
es **dónde** se aplica el filtro:

- **Un solo choke point**: `src/server/db.ts` exporta `db`, un Proxy sobre
  Prisma que **inyecta `tenantId` en cada operación** (en el `where` de
  lecturas/updates/deletes, en el `data` de creates, y adentro de
  `$transaction`). Ningún action filtra a mano — no hay forma de "olvidarse".
- El tenant sale de la sesión (`src/server/tenant-context.ts`, cacheado por
  request). **Sin sesión no hay datos**: la query lanza `TenantError`.
- `ProductInOrder` y `PaymentAllocation` no llevan columna propia: heredan el
  tenant del padre (Order/Payment) y el choke point los filtra por relación.
- `systemDb` es el escape SIN scoping, solo para: resolver sesión→tenant,
  webhooks de MP (el tenant llega por `external_reference`), lookups por token
  (partner API) y el alta de tenants en el signup. Todo uso nuevo de
  `systemDb` es sospechoso por definición.
- Fail-closed: `tenantId` tiene default `""` en la base; si algún código
  escribiera sin pasar por el choke point, la FK a `Tenant` lo rechaza en vez
  de filtrar datos a otro negocio.
- Unicidades por tenant: `slug` de productos/categorías, `name`/`phone` de
  clientes y `orderNumber` son únicos **por negocio** (índices compuestos).

**Migrar una base existente (single-tenant, CON datos):** backup y después
`npx prisma db execute --file scripts/migrate-multitenant.sql`, luego
`npx prisma db push && npx prisma generate`. El script crea el tenant
"principal" y le cuelga todas las filas existentes. En una base nueva alcanza
con `db push`. Los seeds legacy (`prisma/seed.ts`, `seed2.ts`,
`seed_products.ts`) quedaron single-tenant y deprecados; el vigente es
`prisma/seed_full.ts`.

### Planes y gating

Una sola fuente de verdad: `src/server/plans.ts` (planes, features, precios,
estado de acceso). El sidebar filtra por feature, las páginas/actions pagas
llaman `requireFeature()` (`src/server/gate.ts`).

| Plan | Precio | Incluye |
|---|---|---|
| **Simple** | $ 10.000/mes | Import CSV/Excel asistido, semáforo de clientes, WhatsApp con plantillas, email |
| **Completo** | $ 30.000/mes | Todo Simple + recibos PDF (presupuesto/remito/ticket), productos y listas de precios, sync en la nube |
| **Personalizado** | a medida | Distribuidoras / canal. Sin checkout: se activa a mano (`plan=PERSONALIZADO`, `planStatus=ACTIVE`, sin suscripción MP) |

- **Facturación electrónica ARCA**: NO es un plan — queda armado como **add-on
  pago futuro** sobre Completo. `Tenant.addons` (`String[]`) ya lo lee el gate
  (`tieneFeature`): implementarlo será crear su suscripción/monto en MP y
  pushear `"arca"` al array. Nada más que tocar.
- Estados de acceso (`accesoDe`): `TRIALING`/`ACTIVE` → todo; `PAST_DUE` →
  banner de reintento + **7 días de gracia**; vencida la gracia, `CANCELLED` o
  trial vencido → lock a `/suscripcion`. **Los datos nunca se borran.**

### Mercado Pago Suscripciones (preapproval)

Débito automático mensual en ARS, flujo "pending" (sin card token propio):

1. `elegirPlan()` (fin del onboarding) marca `TRIALING` (14 días) y crea la
   preapproval (`POST /preapproval`) con `external_reference = tenant.id` y
   `start_date =` fin del trial → redirige al `init_point` de MP donde el
   cliente autoriza el débito. Se puede saltear ("probar sin cargar el pago").
2. Retorno (`/suscripcion/retorno`): se verifica la preapproval **contra la
   API** (`GET /preapproval/{id}`) — nunca se confía en el query string.
3. Webhook `/api/mp/webhook`: valida la firma `x-signature` (HMAC-SHA256 del
   manifest `id:...;request-id:...;ts:...;` con `MP_WEBHOOK_SECRET`) y procesa
   `subscription_preapproval` (authorized/paused/cancelled → estado del
   tenant) y `subscription_authorized_payment` / `payment` (aprobado →
   `ACTIVE`; rechazado → `PAST_DUE` + gracia). Responde 200 rápido; con error
   devuelve 500 y MP reintenta.
4. Upgrade/downgrade: `PUT /preapproval/{id}` con el monto nuevo — MP lo aplica
   **al próximo ciclo** (sin prorrateo); las features cambian al instante.
   Cancelar: `PUT` con `status=cancelled` (datos intactos).

**Sandbox primero**: las credenciales `TEST-...` NO sirven para Suscripciones
(`/preapproval` devuelve 500) — se usa el access token de **producción**
(`APP_USR-...`) de una **cuenta de prueba vendedor**, y se paga logueado como
el comprador de prueba con tarjetas de prueba (ver `.env.example`). El webhook
se configura en el panel de MP (de la app del vendedor de prueba en sandbox)
apuntando a `{NEXT_PUBLIC_APP_URL}/api/mp/webhook`; para probarlo local, usar
el simulador de webhooks del panel o un túnel (ngrok).

### Onboarding-first (valor antes del precio)

`/onboarding` (import guiado con preview, dd/mm y montos AR tolerados, o datos
de ejemplo) → `/onboarding/revelacion` (el "aha" sobre SUS datos: semáforo,
"tenés N clientes enfriándose", top clientes y el primer WhatsApp listo) →
`/onboarding/plan` (recomendación contextual Simple/Completo, ahí arranca el
trial). El paso queda persistido en `Tenant.onboardingStep` (retomable) y cada
paso emite un `FunnelEvent` (`cuenta_creada`, `datos_importados`,
`resultado_revelado`, `plan_seleccionado`, `suscripcion_iniciada`,
`pago_aprobado`...) — el funnel se mide con SQL sobre esa tabla.

### Gancho futuro: canal distribuidora → comercios (NO construido)

Una distribuidora (Plan Personalizado) va a poder regalar copias white-label a
sus comercios, con visibilidad **opt-in** del stock/rotación de SUS productos
solamente. Puntos de anclaje ya dejados:

- `model Tenant` (schema.prisma): comentario con el diseño (`parentTenantId`
  self-relation).
- `Product.supplierLinked`: marca qué productos serán visibles al canal.
- La partner API por token (`/api/partner/*`) es el equivalente actual entre
  deploys separados; cuando ambos negocios convivan en esta base se reemplaza
  por la relación Tenant→Tenant.
- El motor (`src/server/iman/engine.ts`) es puro (no consulta la base): sirve
  para calcular rotación sobre cualquier subconjunto de ventas.

## Conexión con proveedor / distribuidora (opcional)

En **Ajustes → Conexión con proveedor / distribuidora**, cada negocio decide
qué comparte, sin que las bases se toquen:

- **Actualizar precios del proveedor:** el comercio pega la URL de lista de
  precios de su distribuidora (`supplierUrl`). Después, desde **Productos →
  "Actualizar precios del proveedor"**, trae la lista, ve un diff (costo actual
  → nuevo, con el margen que queda) y aplica **solo lo que confirma**.
- **Compartir stock:** opt-in que expone `GET /api/partner/stock?token=…` con el
  stock de los productos importados del proveedor.
- **Soy distribuidora — exponer lista de precios:** opt-in que expone
  `GET /api/partner/pricelist?token=…` con el catálogo, para que los comercios
  la usen como `supplierUrl`.

Los endpoints se autentican por token (el que muestra Ajustes) y solo devuelven
datos si el opt-in está activo. La demo viene con todo esto pre-armado contra
una lista de ejemplo (`public/demo/pricelist-proveedor.json`).

## Pantallas

| Ruta | Qué es |
|---|---|
| `/dashboard` | **Semáforo de clientes** (pantalla principal): ordenados por días sin comprar, filtros por estado, fusión de duplicados, import CSV, WhatsApp por cliente |
| `/dashboard/clients/[id]` | Ficha del cliente: ciclo, gasto, productos frecuentes, historial de compras y contactos |
| `/dashboard/promos` | Promos por segmento (WhatsApp / Email) + editor de plantillas |
| `/dashboard/invoices/create` | Vender / crear factura (mostrador) |
| `/dashboard/invoices`, `/orders` | Facturas y pedidos |
| `/dashboard/products` | Productos, precios y stock. Selección tipo Excel (checkbox + arrastre) con aumento/margen en masa; márgenes y aumentos por categoría/catálogo; actualizar precios del proveedor |
| `/dashboard/ajustes` | Datos del negocio, marca, servidor WhatsApp y conexión con proveedor |
| `/dashboard/resumen`, `/analytics` | Números de facturación |
| `/dashboard/ajustes` | Datos del negocio |

Arquitectura, reglas del motor y ganchos futuros (white-label para
distribuidoras): ver [FUTURO.md](./FUTURO.md).
