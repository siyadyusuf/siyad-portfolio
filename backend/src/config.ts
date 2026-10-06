export interface Config {
  adminPasswordHash: string;
  sessionSecret: string;
  resendApiKey?: string;
  contactTo: string;
  contactFrom: string;
  githubUser: string;
  githubToken?: string;
  corsOrigin?: string;
  secureCookies: boolean;
}

export function loadConfig(env = process.env): Config {
  const required = (k: string) => {
    const v = env[k];
    if (!v) throw new Error(`Missing env var ${k}`);
    return v;
  };
  return {
    adminPasswordHash: required("ADMIN_PASSWORD_HASH"),
    sessionSecret: required("SESSION_SECRET"),
    resendApiKey: env.RESEND_API_KEY,
    contactTo: env.CONTACT_TO ?? "syusuf9@gmu.edu",
    contactFrom: env.CONTACT_FROM ?? "Portfolio <onboarding@resend.dev>",
    githubUser: env.GITHUB_USER ?? "siyadyusuf",
    githubToken: env.GITHUB_TOKEN,
    corsOrigin: env.CORS_ORIGIN,
    secureCookies: env.NODE_ENV === "production",
  };
}
