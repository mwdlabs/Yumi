import { SignJWT, jwtVerify } from 'jose';
import type { Env } from '../../config/env.ts';
import type { AuthContext } from '../../http/middlewares/authenticate.ts';

const AUDIENCE = 'yumi-app';

/** Émission et vérification des jetons d'accès (JWT HS256, courte durée). */
export class TokenService {
  private readonly key: Uint8Array;

  constructor(private readonly env: Env) {
    this.key = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  }

  get accessTokenTtlSeconds(): number {
    return this.env.ACCESS_TOKEN_TTL_SECONDS;
  }

  async signAccessToken(auth: AuthContext): Promise<string> {
    return new SignJWT({ sid: auth.sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(auth.userId)
      .setIssuer(this.env.JWT_ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${this.env.ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(this.key);
  }

  /** Retourne l'identité portée par le jeton, ou `null` s'il est invalide ou expiré. */
  async verifyAccessToken(token: string): Promise<AuthContext | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: this.env.JWT_ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
      });
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      return null;
    }
  }
}
