import { NextFunction, Request, Response } from 'express';
import { config } from '../lib/config';
import { AppError } from '../lib/errors';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_TRACKED_KEYS = 10_000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

// Limite simples em memória para login/registro. Reinicia com o processo, o que
// é aceitável para uma API de instância única; com múltiplas réplicas use Redis.
export function authRateLimit(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'test') return next();

  const now = Date.now();
  const key = `${req.ip ?? 'desconhecido'}:${req.path}`;
  if (buckets.size > MAX_TRACKED_KEYS) pruneExpired(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count > MAX_ATTEMPTS) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
    return next(new AppError(429, 'TOO_MANY_ATTEMPTS', 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.'));
  }

  res.on('finish', () => {
    if (res.statusCode < 400 && buckets.get(key) === bucket) buckets.delete(key);
  });
  next();
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}
