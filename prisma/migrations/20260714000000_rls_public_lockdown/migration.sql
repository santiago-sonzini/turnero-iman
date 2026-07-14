-- ============================================================================
-- RLS lockdown del esquema public (cierre de la Data API de Supabase)
-- ============================================================================
-- QUÉ RESUELVE
--   Sin Row Level Security, TODAS las tablas de `public` quedan expuestas por la
--   Data API de Supabase (PostgREST, https://<ref>.supabase.co/rest/v1/*) a los
--   roles `anon` y `authenticated`, que reciben GRANTs por defecto. Cualquiera
--   con la anon key (que es publicable) podía leer/escribir datos de TODOS los
--   tenants: clientes, teléfonos, emails, turnos, datos de pago de Mercado Pago
--   y sesiones de WhatsApp (incluido el QR). Es la falla "RLS disabled in public"
--   que marca el linter de Supabase.
--
-- CÓMO LO CIERRA
--   Se habilita RLS SIN políticas permisivas => deny-all para anon/authenticated
--   a través de la Data API (RLS activo + cero políticas = nadie que no sea dueño
--   puede leer ninguna fila).
--
-- POR QUÉ NO ROMPE LA APP
--   Toda la app accede a la base SIEMPRE vía Prisma con el rol `postgres`
--   (DATABASE_URL/DIRECT_URL = postgres.<ref>), que es DUEÑO de estas tablas. En
--   Postgres el dueño de la tabla NO está sujeto a RLS mientras no se use
--   FORCE ROW LEVEL SECURITY. Por eso esta migración no necesita ningún cambio de
--   código: el proxy con scope por tenant (src/server/db.ts) y `systemDb` siguen
--   viendo todas las filas, igual que `prisma db seed`. No hay acceso a tablas
--   desde el navegador: el cliente de Supabase solo se usa para auth.*.
--
-- INVARIANTE (no romper)
--   NO agregar FORCE ROW LEVEL SECURITY a estas tablas mientras el acceso siga
--   siendo por el rol dueño. Con FORCE y sin políticas, el propio dueño quedaría
--   bloqueado y TODAS las lecturas devolverían 0 filas. El aislamiento por tenant
--   ya lo garantizan el proxy de aplicación y las claves compuestas (tenantId,id)
--   agregadas en la migración security_hardening. RLS a nivel base por tenant
--   (SET LOCAL app.tenant_id) NO es viable acá: el runtime usa el pooler de
--   pgbouncer en modo transacción (6543, ?pgbouncer=true) y las queries no van
--   todas dentro de una transacción, así que una política por GUC devolvería
--   filas vacías de forma silenciosa.
--
-- CONVENCIÓN (mantener a futuro)
--   Toda migración futura que cree una tabla en `public` debe habilitar RLS sobre
--   ella (repetir el patrón del bloque 1) o quedará expuesta otra vez en la
--   Data API.
-- ============================================================================

-- 1) RLS ON en cada tabla de `public` que sea propiedad del rol actual (postgres).
--    El filtro por dueño evita el error `must be owner of table` por si alguna vez
--    cae en `public` una tabla de extensión o gestionada por otro rol. Incluye a
--    _prisma_migrations a propósito: así el historial de migraciones tampoco queda
--    legible desde la Data API (Prisma sigue funcionando porque migra como dueño).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tableowner = current_user
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- 2) Defensa en profundidad: quitar los GRANT que Supabase da por defecto a los
--    roles de la Data API. RLS ya alcanza para negar; esto refuerza por si a
--    futuro se agrega una política permisiva por error, y saca los privilegios de
--    tabla/secuencia de raíz. Se tocan SOLO anon/authenticated: service_role y
--    postgres quedan intactos. El bloque se guarda por si el rol no existe
--    (Postgres local / CI / cualquier base que no sea Supabase).
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I;', role_name);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I;', role_name);
      -- Objetos futuros creados por el rol actual (postgres, que es quien corre
      -- las migraciones de Prisma). No cubre defaults registrados por otros roles
      -- de bootstrap de Supabase, pero eso no importa: el candado real es RLS.
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I;', role_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I;', role_name);
    END IF;
  END LOOP;
END $$;
