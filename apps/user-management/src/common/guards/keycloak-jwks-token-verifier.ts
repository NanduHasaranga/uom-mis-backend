import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { JwtPayload } from 'jsonwebtoken';
import JwksRsa from 'jwks-rsa';
import type { TokenPayload, TokenVerifier } from './token-verifier.interface';

@Injectable()
export class KeycloakJwksTokenVerifier implements TokenVerifier {
  private readonly jwksClient: JwksRsa.JwksClient;

  constructor(config: ConfigService) {
    const jwksUri = config.get<string>('keycloak.jwksUri');
    if (!jwksUri) {
      throw new Error('KEYCLOAK_JWKS_URI is not configured');
    }
    this.jwksClient = JwksRsa({ jwksUri, cache: true, rateLimit: true });
  }

  async verify(token: string): Promise<TokenPayload> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
      throw new Error('Malformed token: missing kid');
    }

    const signingKey = await this.jwksClient.getSigningKey(decoded.header.kid);
    const payload = jwt.verify(token, signingKey.getPublicKey()) as JwtPayload;

    return {
      ...payload,
      sub: payload.sub ?? '',
      roles: extractRoles(payload),
    };
  }
}

function extractRoles(payload: JwtPayload): string[] {
  const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
  return realmAccess?.roles ?? [];
}
