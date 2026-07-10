const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET"] as const;

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(
      `[env] Missing required environment variable: ${varName}. ` +
        `Ensure it is set in .env or the deployment environment.`
    );
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  NODE_ENV: (process.env.NODE_ENV ?? "development") as "development" | "production" | "test",
} as const;
