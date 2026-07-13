import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KcAdminClient from '@keycloak/keycloak-admin-client';

@Injectable()
export class KeycloakAdminService {
  private readonly kcAdminClient: KcAdminClient;

  constructor(private readonly configService: ConfigService) {
    this.kcAdminClient = new KcAdminClient({
      baseUrl: this.configService.getOrThrow<string>('KEYCLOAK_BASE_URL'),
      realmName: this.configService.getOrThrow<string>('KEYCLOAK_REALM'),
    });
  }

  private async authenticateAdminClient() {
    await this.kcAdminClient.auth({
      grantType: 'client_credentials',
      clientId: this.configService.getOrThrow<string>('KEYCLOAK_CLIENT_ID'),
      clientSecret: this.configService.getOrThrow<string>(
        'KEYCLOAK_CLIENT_SECRET',
      ),
    });
  }

  async createUserIfNotExists(params: {
    email: string;
    fullName: string;
    role: string;
  }): Promise<string> {
    await this.authenticateAdminClient();

    const existingUsers = await this.kcAdminClient.users.find({
      email: params.email,
      exact: true,
    });

    if (existingUsers.length > 0 && existingUsers[0].id) {
      return existingUsers[0].id;
    }

    const createdUser = await this.kcAdminClient.users.create({
      username: params.email,
      email: params.email,
      firstName: params.fullName,
      enabled: true,
      emailVerified: false,
      requiredActions: ['UPDATE_PASSWORD'],
    });

    const keycloakUserId = createdUser.id;

    await this.assignRealmRole(keycloakUserId, params.role);

    return keycloakUserId;
  }

  private async assignRealmRole(userId: string, roleName: string) {
    await this.authenticateAdminClient();

    const role = await this.kcAdminClient.roles.findOneByName({
      name: roleName,
    });

    if (!role || !role.id || !role.name) {
      throw new Error(`Keycloak role not found: ${roleName}`);
    }

    await this.kcAdminClient.users.addRealmRoleMappings({
      id: userId,
      roles: [
        {
          id: role.id,
          name: role.name,
        },
      ],
    });
  }
}