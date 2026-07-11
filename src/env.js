import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    // Sin DATABASE_URL la app corre en MODO DEMO: Postgres embebido (PGlite)
    // con datos de una distribuidora ficticia. Ver src/server/db.ts.
    DATABASE_URL: z.string().url().optional(),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    // Servidor opcional de WhatsApp (open-wa, ver wa-server/). Si está seteado,
    // la app puede mandar mensajes directo además de abrir wa.me.
    WA_SERVER_URL: z.string().url().optional(),
    WA_SERVER_TOKEN: z.string().optional(),
    // SMTP opcional para la pestaña de Email (sin esto, queda el mailto:)
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    // "1" = demo efímera: PGlite en MEMORIA (deploy por link); sin persistencia.
    // En Vercel se activa solo. Ver src/server/demo/bootstrap.ts.
    DEMO_EPHEMERAL: z.string().optional(),
    // ── Mercado Pago Suscripciones (preapproval) ──────────────────────────
    // Access token del vendedor. SANDBOX primero: usar el token de PRODUCCIÓN
    // (APP_USR-...) de una CUENTA DE PRUEBA vendedor — las credenciales
    // TEST-... no aplican a Suscripciones. Ver .env.example.
    MP_ACCESS_TOKEN: z.string().optional(),
    // "Firma secreta" del panel de Webhooks de MP: valida x-signature.
    MP_WEBHOOK_SECRET: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // URL pública de la app (ej: https://app.iman.ar). La usa el back_url de
    // Mercado Pago y los links absolutos del onboarding.
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    WA_SERVER_URL: process.env.WA_SERVER_URL,
    WA_SERVER_TOKEN: process.env.WA_SERVER_TOKEN,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    DEMO_EPHEMERAL: process.env.DEMO_EPHEMERAL,
    MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
    MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
