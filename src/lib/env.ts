import { z } from "zod";

const envSchema = z.object({
  // Authentication
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  ADMIN_USER: z.string().min(1, "ADMIN_USER is required"),
  ADMIN_PASSWORD_HASH: z.string().min(1, "ADMIN_PASSWORD_HASH is required"),
  
  // Cron Job Protection
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters"),
  
  // Google Sheets Integration
  GOOGLE_SHEET_ID: z.string().min(1, "GOOGLE_SHEET_ID is required in production"),
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().email("GOOGLE_SHEETS_CLIENT_EMAIL must be a valid email"),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().min(1, "GOOGLE_SHEETS_PRIVATE_KEY is required in production"),
  
  // Optional: Separate spreadsheet IDs
  OPPORTUNITY_OGV_SPREADSHEET_ID: z.string().optional(),
  OPPORTUNITY_OGT_SPREADSHEET_ID: z.string().optional(),
  
  // Upstash Redis for rate limiting (optional for development, required for production)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

// Validate at runtime (not during build)
function validateEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const isBuild = process.env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-development-build";
  
  // Skip validation during build time only
  if (isBuild) {
    return process.env as unknown as z.infer<typeof envSchema>;
  }
  
  // At runtime (including next start with NODE_ENV=production), validate strictly
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
    const error = new Error(`Environment validation failed: ${errors}`);
    
    if (isProduction) {
      // In production, throw immediately
      throw error;
    } else {
      // In development, log warning but don't crash (for local development convenience)
      console.warn("[env] Environment validation failed:", errors);
      console.warn("[env] This will cause errors in production. Please set all required environment variables.");
      return process.env as unknown as z.infer<typeof envSchema>;
    }
  }
  
  return parsed.data;
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
