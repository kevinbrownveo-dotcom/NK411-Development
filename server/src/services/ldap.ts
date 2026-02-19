/**
 * LDAP / Active Directory Hibrid Autentifikasiya Servisi
 *
 * LDAP_ENABLED=true olarsa LDAP ilə autentifikasiya cəhdi edilir,
 * LDAP əlçatmaz olduqda lokal login avtomatik aktiv olur.
 */

import { logger } from '../utils/logger';

// ldapjs-i dinamik olaraq yükləyirik ki, qurulmamışsa server çöküşü olmasın
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ldap = require('ldapjs');

export interface LdapUser {
  dn: string;
  email: string;
  fullName: string;
  groups: string[];
}

export class LdapService {
  private readonly enabled: boolean;
  private readonly url: string;
  private readonly baseDn: string;
  private readonly bindDn: string;
  private readonly bindPassword: string;
  private readonly groupBaseDn: string;
  private readonly emailAttr: string;
  private readonly nameAttr: string;

  constructor() {
    this.enabled = process.env.LDAP_ENABLED === 'true';
    this.url = process.env.LDAP_URL || 'ldap://localhost:389';
    this.baseDn = process.env.LDAP_BASE_DN || 'dc=example,dc=com';
    this.bindDn = process.env.LDAP_BIND_DN || '';
    this.bindPassword = process.env.LDAP_BIND_PASSWORD || '';
    this.groupBaseDn = process.env.LDAP_GROUP_BASE_DN || this.baseDn;
    this.emailAttr = process.env.LDAP_EMAIL_ATTR || 'mail';
    this.nameAttr = process.env.LDAP_NAME_ATTR || 'displayName';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** LDAP serverinin əlçatanlığını yoxla */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false;
    return new Promise((resolve) => {
      const client = ldap.createClient({
        url: this.url,
        timeout: 3000,
        connectTimeout: 3000,
      });
      client.on('connect', () => {
        client.destroy();
        resolve(true);
      });
      client.on('error', () => {
        resolve(false);
      });
      setTimeout(() => {
        client.destroy();
        resolve(false);
      }, 3500);
    });
  }

  /** İstifadəçini LDAP-da autentifikasiya et */
  async authenticate(username: string, password: string): Promise<LdapUser | null> {
    if (!this.enabled) return null;

    return new Promise((resolve) => {
      // Service account ilə bind et
      const client = ldap.createClient({ url: this.url, timeout: 5000, connectTimeout: 5000 });

      client.on('error', (err: Error) => {
        logger.error('LDAP client xətası:', err.message);
        resolve(null);
      });

      // Əvvəlcə service account ilə bind olub istifadəçini tap
      client.bind(this.bindDn, this.bindPassword, (bindErr: Error | null) => {
        if (bindErr) {
          logger.error('LDAP service bind xəta:', bindErr.message);
          client.destroy();
          resolve(null);
          return;
        }

        // İstifadəçini e-mail ilə axtar
        const searchFilter = `(${this.emailAttr}=${username})`;
        const searchOptions = {
          filter: searchFilter,
          scope: 'sub',
          attributes: ['dn', this.emailAttr, this.nameAttr, 'memberOf'],
        };

        client.search(this.baseDn, searchOptions, (searchErr: Error | null, res: any) => {
          if (searchErr) {
            logger.error('LDAP axtarış xəta:', searchErr.message);
            client.destroy();
            resolve(null);
            return;
          }

          let userDn: string | null = null;
          let userEmail = '';
          let userFullName = '';
          const groups: string[] = [];

          res.on('searchEntry', (entry: any) => {
            userDn = entry.dn.toString();
            userEmail = entry.object[this.emailAttr] as string || username;
            userFullName = entry.object[this.nameAttr] as string || '';
            const memberOf = entry.object['memberOf'];
            if (Array.isArray(memberOf)) {
              groups.push(...memberOf);
            } else if (memberOf) {
              groups.push(memberOf as string);
            }
          });

          res.on('error', (err: Error) => {
            logger.error('LDAP search res xəta:', err.message);
            client.destroy();
            resolve(null);
          });

          res.on('end', () => {
            if (!userDn) {
              client.destroy();
              resolve(null);
              return;
            }

            // İstifadəçinin şifrəsi ilə bind cəhdi et
            client.bind(userDn, password, (userBindErr: Error | null) => {
              client.destroy();
              if (userBindErr) {
                logger.warn(`LDAP auth uğursuz: ${username}`);
                resolve(null);
              } else {
                logger.info(`LDAP auth uğurlu: ${username}`);
                resolve({ dn: userDn!, email: userEmail, fullName: userFullName, groups });
              }
            });
          });
        });
      });
    });
  }
}

export const ldapService = new LdapService();
