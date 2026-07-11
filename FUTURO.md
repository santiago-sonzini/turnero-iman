# Imán — Notas de arquitectura y ganchos futuros

Nota breve para no olvidar por qué el código está partido donde está partido.

## Modelo de datos: un negocio por deploy

Cada instalación es **un solo negocio**. `BusinessProfile` es una fila única
(`findFirst`, sin filtro) y ninguna tabla tiene `businessId`/`tenantId`: todo
lo que hay en la base ES el negocio. La frontera del inquilino es el deploy
mismo (su `DATABASE_URL`, o su archivo PGlite en demo). No hay multi-tenancy
adentro de una base — y no la va a haber: la conexión entre negocios es por
HTTP (ver "Conexión partner" abajo).

## Conexión partner distribuidora ↔ comercio (por URL, ya construida)

Dos deploys single-tenant se hablan por **URL + token, opt-in de los dos
lados**. No comparten base. Implementado:
- **Comercio ⟵ distribuidora (precios):** el comercio guarda `supplierUrl`
  (+`supplierToken`) en Ajustes y desde Productos corre "Actualizar precios del
  proveedor" → trae la lista, muestra un diff (costo actual → nuevo + margen
  resultante) y aplica **solo lo confirmado**. Actualiza `Product.cost` y marca
  `supplierLinked`. Ver `src/app/actions/partner.ts`.
- **Comercio ⟶ distribuidora (stock):** opt-in `shareStockEnabled` expone
  `GET /api/partner/stock?token=…` con el stock de los productos
  `supplierLinked`. La distribuidora consume esa URL desde su propio deploy.
- **Distribuidora ⟶ comercios (lista de precios):** opt-in
  `sharePricelistEnabled` expone `GET /api/partner/pricelist?token=…` con su
  catálogo. Es la URL que un comercio pega en `supplierUrl`.
- Auth de los endpoints: `src/app/api/partner/_auth.ts` (token === `partnerToken`
  del negocio **y** el flag correspondiente en true). Sin sesión de dashboard.

**Fuera de alcance (todavía):** el panel propio de la distribuidora que agrega
el stock de muchos comercios (consumiría cada `/api/partner/stock`) — es su
deploy aparte. Qué otra info se compartirá se irá definiendo; el contrato JSON
(`{ products: [{ code, name, price|stock }] }`) es el punto de extensión.

## El futuro que NO está construido (a propósito)

Una distribuidora va a poder regalar copias white-label de la app a sus
comercios minoristas. La conexión de datos ya está (arriba); lo que falta es
el reparto de las copias y el panel agregador de la distribuidora. Los puntos
de corte para que eso no duela:

### 1. El motor es puro — `src/server/iman/engine.ts`
Clasificación, ciclos y recuperos reciben **filas planas** (`VentaRow`,
`ContactoRow`) y no consultan la base. Para correr el motor sobre los datos de
otro negocio (o de muchos), solo cambia quién arma las filas, no la lógica.
Lo mismo vale para `normalize.ts` (duplicados) y `src/lib/whatsapp.ts`
(mensajes): funciones puras sin estado global.

### 2. La fuente de datos se decide en UN lugar — `src/server/db.ts`
`DEMO_MODE` (sin `DATABASE_URL` → PGlite embebido + seed) demuestra que el
origen de datos es intercambiable detrás del mismo `db`. Un tenant remoto, una
réplica de solo lectura para la distribuidora, o un Postgres por cliente
entran por esa misma puerta.

### 3. `BusinessProfile` es el ancla por-negocio — `prisma/schema.prisma`
Hoy tiene una sola fila (nombre, teléfono, CUIT, logo, acento de marca). El día
white-label, "de qué negocio es este dato" cuelga de esta entidad — por eso los
mensajes usan `{negocio}` desde acá y no hardcodeado. **No** se agregó
`businessId` a las tablas todavía: sería fingir multi-tenancy sin tenerla; la
migración es mecánica cuando exista el segundo negocio.

### 4. El tema es intercambiable por deploy — `src/styles/globals.css`
Todos los colores (marca, semáforo, WhatsApp) son variables CSS bajo el
comentario `TEMA DEL DEPLOY`; los componentes shadcn usan tokens semánticos,
no paleta hardcodeada. Cambiar la estética de un cliente = cambiar esas
variables + el logo (`src/components/iman/logo.tsx` o
`BusinessProfile.logoUrl`). La demo usa la marca Imán.

### 5. Visibilidad distribuidora→comercio (cuando llegue)
Los datos que la distribuidora querría ver ya existen y quedan bien formados:
`Product` (stock), `ProductInOrder` (rotación con `purchaseDate`), `Order`
(ventas). El opt-in será un permiso sobre `BusinessProfile`, no un cambio de
modelo. Evitar mientras tanto: joins que asuman "hay un solo negocio" fuera de
la capa de acciones.

## Decisiones tomadas en el refactor (julio 2026)

- **Se eliminó por completo** la estructura minorista/mayorista: enum
  `ClientType`, precio ×1.35 redondeado, factura espejo mayorista contra un
  cliente hardcodeado, paneles y filtros por tipo. Un negocio, un precio
  (`Product.price`), sus clientes.
- Modelos nuevos **aditivos**: `MessageTemplate`, `ContactLog` (con
  `statusAtSend`, clave para atribuir recuperos), `BusinessProfile`. No se
  borró ningún modelo existente (`ReorderAlert` y `PurchaseAnalytics` quedan,
  hoy sin uso activo).
- Reglas del motor (portadas del prototipo `landings/iman`): estado por ratio
  días-sin-comprar / ciclo propio (mediana de intervalos) con pisos —
  riesgo ≥1.4× y ≥7d, dormido ≥2.4× y ≥20d, perdido ≥4.5× y ≥45d; fallback al
  ciclo global (o 30 días). Recupero = contacto en estado no-activo + compra
  dentro de 60 días. Duplicados por similitud Jaccard/Levenshtein ≥ 0.82.

## Gaps que se detectaron y se implementaron

1. Sin `DATABASE_URL` la app no arrancaba → modo demo con PGlite + seed
   "Distribuidora El Faro" (`src/server/demo/`).
2. No había registro de contactos → `ContactLog` + `registrarContacto`.
3. No había perfil del negocio → `BusinessProfile` + Ajustes.
4. Formatos ARS/fecha dispersos → `src/lib/format.ts`.
5. Sin backfill de historia → import CSV (`importarVentas` + diálogo).
6. Clientes sin teléfono → carga rápida desde el diálogo de WhatsApp.
7. Duplicados de nombre → sugerencias + fusión real (reasigna ventas, pagos y
   contactos).

## Integraciones opcionales (julio 2026)

- **Servidor de WhatsApp** (`wa-server/`, **Baileys**): proceso standalone con
  su propio package.json — no serverless (mantiene la sesión viva). Se pasó de
  open-wa a Baileys porque open-wa scrapea WhatsApp Web con Chromium y se rompe
  cuando WhatsApp cambia el DOM (timeouts buscando el QR); Baileys habla el
  protocolo por WebSocket, sin navegador, y el QR se genera al toque (lo sirve
  en `/qr`). La app lo usa solo si `WA_SERVER_URL` está seteada; el estado se
  cachea 15 s y todo degrada a wa.me si está caído. Los envíos directos
  registran `ContactLog.channel = "whatsapp-server"`. La API del servidor
  (`/estado`, `/enviar`, `/qr`) no cambió con el switch.
- **Imágenes**: `uploadMediaAction` es dual — Supabase storage si está
  configurado, `public/uploads/` si no (también requiere server con disco).
  `MessageTemplate.imageUrl` (flyers por plantilla, ej. 2x1) y
  `ContactLog.mediaUrl` (qué imagen acompañó cada contacto) son aditivos.
- El seed demo usa `BusinessProfile` como marcador de seed completo (se crea
  último); un seed cortado se limpia y recarga solo. El bootstrap de PGlite es
  lazy: arranca con la primera consulta, nunca al importar (clave para que
  `next build` no lo dispare).

## Pendientes conocidos (no bloqueantes)

- Facturación electrónica ARCA: el prototipo tiene la interfaz pensada
  (`landings/iman/shared/arca/`); acá no se portó nada.
- `Payment` (cuenta corriente) quedó como estaba; la demo no seeda pagos
  parciales.
- `/productos` (catálogo público) sigue funcionando pero quedó fuera del flujo
  Imán; des-Sanigasear si se va a usar.
