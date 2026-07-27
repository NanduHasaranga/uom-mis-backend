import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesGuard } from './guards/roles.guard';
import { KeycloakJwksTokenVerifier } from './guards/keycloak-jwks-token-verifier';
import { StubTokenVerifier } from './guards/stub-token-verifier';
import { TOKEN_VERIFIER } from './guards/token-verifier.interface';

// RolesGuard and TOKEN_VERIFIER are used by controllers living in UsersModule
// and BulkUploadModule — siblings that AppModule imports. A module only gets
// access to what it imports, not to its parent's own providers, so these must
// live in a module those two actually import.
@Module({
  imports: [ConfigModule],
  providers: [
    RolesGuard,
    {
      provide: TOKEN_VERIFIER,
      useFactory: (config: ConfigService) =>
        config.get<string>('tokenVerifierMode') === 'stub'
          ? new StubTokenVerifier()
          : new KeycloakJwksTokenVerifier(config),
      inject: [ConfigService],
    },
  ],
  exports: [RolesGuard, TOKEN_VERIFIER],
})
export class CommonModule {}
