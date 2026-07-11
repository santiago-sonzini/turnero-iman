/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

const config = {
    experimental: {
        // PGlite (modo demo) es WASM nativo de Node: no debe pasar por webpack
        serverComponentsExternalPackages: ['@electric-sql/pglite', 'pglite-prisma-adapter'],
    },
    images: {
        remotePatterns: [
          {
            protocol: 'https', // Or 'http' if necessary
            hostname: 'ggpqgxddeayvmgmymrdc.supabase.co', // The domain of your external images
            port: '', // Optional: specify a port if needed
          },
          // Add more objects for other allowed domains
        ],
      },
      eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
      },
};

export default config;
