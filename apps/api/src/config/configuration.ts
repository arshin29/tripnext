export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  geminiApiKey?: string;
  geminiModel: string;
  aiTimeoutMs: number;
  aiRateLimitMaxPerMinute: number;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/tripnest?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'tripnest_default_jwt_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  aiTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '20000', 10),
  aiRateLimitMaxPerMinute: parseInt(process.env.AI_RATE_LIMIT_MAX_PER_MINUTE || '5', 10),
});
