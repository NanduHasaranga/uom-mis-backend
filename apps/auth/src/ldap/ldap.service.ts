import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'ldapts';
import { createHash, randomBytes } from 'crypto';

export interface LdapUserEntry {
  uid: string;
  cn: string;
  sn: string;
  givenName: string;
  mail: string;
  address?: string;
  employeeId?: string;
  password: string;
}

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);

  private readonly url: string;
  private readonly baseDn: string;
  private readonly usersOu: string;
  private readonly adminDn: string;
  private readonly adminPassword: string;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.getOrThrow<string>('LDAP_URL');
    this.baseDn = this.configService.getOrThrow<string>('LDAP_BASE_DN');
    this.usersOu = this.configService.getOrThrow<string>('LDAP_USERS_OU');
    this.adminDn = this.configService.getOrThrow<string>('LDAP_ADMIN_DN');
    this.adminPassword = this.configService.getOrThrow<string>(
      'LDAP_ADMIN_PASSWORD',
    );
  }

  private hashPassword(plain: string): string {
    const salt = randomBytes(4);
    const digest = createHash('sha1')
      .update(Buffer.concat([Buffer.from(plain, 'utf8'), salt]))
      .digest();
    return `{SSHA}${Buffer.concat([digest, salt]).toString('base64')}`;
  }

  async createUser(entry: LdapUserEntry): Promise<string> {
    for (const field of ['uid', 'cn', 'sn', 'givenName', 'mail', 'password'] as const) {
      if (!entry[field]) {
        throw new Error(`LdapService.createUser: missing required field "${field}"`);
      }
    }

    const client = new Client({ url: this.url });
    const dn = `uid=${entry.uid},${this.usersOu}`;

    try {
      await client.bind(this.adminDn, this.adminPassword);

      const existing = await client.search(this.usersOu, {
        scope: 'one',
        filter: `(uid=${entry.uid})`,
      });

      if (existing.searchEntries.length > 0) {
        this.logger.log({
          message: 'LDAP entry already exists, skipping create',
          dn,
        });
        return dn;
      }

      await client.add(dn, {
        objectClass: ['inetOrgPerson', 'organizationalPerson', 'person', 'top'],
        uid: entry.uid,
        cn: entry.cn,
        sn: entry.sn,
        givenName: entry.givenName,
        mail: entry.mail,
        ...(entry.address ? { postalAddress: entry.address } : {}),
        ...(entry.employeeId ? { employeeNumber: entry.employeeId } : {}),
        userPassword: this.hashPassword(entry.password),
      });

      this.logger.log({ message: 'LDAP entry created', dn });
      return dn;
    } finally {
      await client.unbind();
    }
  }
}
