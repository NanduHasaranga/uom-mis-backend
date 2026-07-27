import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenPayload, TokenVerifier } from './token-verifier.interface';

/**
 * Decodes the JWT payload WITHOUT verifying the signature. For local dev/tests
 * only, so the RolesGuard can be exercised without a running Keycloak instance.
 * Selected via TOKEN_VERIFIER_MODE=stub — see app.module.ts.
 */
@Injectable()
export class StubTokenVerifier implements TokenVerifier {
  async verify(token: string): Promise<TokenPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed token');
    }
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as {
        sub?: string;
        roles?: string[];
      };
      return {
        ...payload,
        sub: payload.sub ?? 'stub-user',
        roles: payload.roles ?? ['admin'],
      };
    } catch {
      throw new UnauthorizedException('Malformed token');
    }
  }
}
