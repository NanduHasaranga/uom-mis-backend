export interface TokenPayload {
  sub: string;
  roles: string[];
  [claim: string]: unknown;
}

export interface TokenVerifier {
  verify(token: string): Promise<TokenPayload>;
}

export const TOKEN_VERIFIER = 'TOKEN_VERIFIER';
