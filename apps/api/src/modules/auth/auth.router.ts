import { refreshTokenBodySchema, requestOtpBodySchema, verifyOtpBodySchema } from '@yumi/shared';
import { Router } from 'express';
import { createRateLimit, type RateLimitStoreFactory } from '../../http/middlewares/rate-limit.ts';
import type { AuthService } from './auth.service.ts';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export function authRouter(auth: AuthService, storeFactory?: RateLimitStoreFactory): Router {
  const router = Router();

  // Limites par IP, en plus des limites par adresse courriel appliquées dans le service.
  const otpRequestLimit = createRateLimit({
    name: 'otp-request',
    windowMs: FIFTEEN_MINUTES,
    limit: 20,
    storeFactory,
  });
  const otpVerifyLimit = createRateLimit({
    name: 'otp-verify',
    windowMs: FIFTEEN_MINUTES,
    limit: 30,
    storeFactory,
  });

  router.post('/otp/request', otpRequestLimit, async (req, res) => {
    const body = requestOtpBodySchema.parse(req.body);
    await auth.requestOtp(body.email);
    res.status(204).end();
  });

  router.post('/otp/verify', otpVerifyLimit, async (req, res) => {
    const body = verifyOtpBodySchema.parse(req.body);
    res.json(await auth.verifyOtp(body));
  });

  router.post('/refresh', async (req, res) => {
    const body = refreshTokenBodySchema.parse(req.body);
    res.json(await auth.refresh(body.refreshToken));
  });

  router.post('/logout', async (req, res) => {
    const body = refreshTokenBodySchema.parse(req.body);
    await auth.logout(body.refreshToken);
    res.status(204).end();
  });

  return router;
}
