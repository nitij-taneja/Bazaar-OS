export const ENV = {
  appId: process.env.VITE_APP_ID || "bazaar-os",
  cookieSecret: process.env.JWT_SECRET || process.env.COOKIE_SECRET || "bazaar-os-super-secret-jwt-key-2026-development-minimum-32-chars",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID || "demo-admin-1",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
