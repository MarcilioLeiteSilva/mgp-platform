import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@mgp/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conexão com PostgreSQL estabelecida com sucesso via Prisma.');
      await this.autoSeedIfEmpty();
    } catch (error: any) {
      this.logger.warn(
        `Aviso: Não foi possível conectar ao PostgreSQL durante o bootstrap: ${error.message}`,
      );
    }
  }

  private async autoSeedIfEmpty() {
    try {
      const count = await this.user.count();
      if (count > 0) return;

      this.logger.log('🌱 Banco vazio detectado. Provisionando credenciais iniciais...');

      // 1. Superadmin Global
      const superadmin = await this.user.upsert({
        where: { email: 'admin@mgp.com.br' },
        update: {},
        create: {
          email: 'admin@mgp.com.br',
          fullName: 'Administrador do Sistema MGP',
          passwordHash:
            '$argon2id$v=19$m=65536,t=3,p=4$dGVzdF9zYWx0X21ncF8yMDI2$8h7GZ4v+t+zYjQvU7b1A6a2Q3f8K9L4m5N6P7Q8R9S0',
          isActive: true,
          isSuperadmin: true,
        },
      });

      // 2. Organização Master
      const masterOrg = await this.organization.upsert({
        where: { slug: 'mgp-master' },
        update: {},
        create: {
          name: 'MGP Platform Master',
          slug: 'mgp-master',
          documentCnpjCpf: '00.000.000/0001-00',
          planTier: 'ENTERPRISE',
          isVerified: true,
        },
      });

      await this.membership.upsert({
        where: {
          userId_organizationId: {
            userId: superadmin.id,
            organizationId: masterOrg.id,
          },
        },
        update: {},
        create: {
          userId: superadmin.id,
          organizationId: masterOrg.id,
          role: 'OWNER' as any,
          isDefault: true,
        },
      });

      const masterWallet = await this.wallet.upsert({
        where: { organizationId: masterOrg.id },
        update: {},
        create: { organizationId: masterOrg.id },
      });

      for (const accountType of [
        'ADVERTISING_CREDITS',
        'EXCHANGE_CREDITS',
        'PUBLISHER_EARNINGS',
      ] as const) {
        await this.walletAccount.upsert({
          where: {
            walletId_type: {
              walletId: masterWallet.id,
              type: accountType as any,
            },
          },
          update: {},
          create: {
            walletId: masterWallet.id,
            type: accountType as any,
            currency: 'BRL',
            cachedBalance: 0,
          },
        });
      }

      // 3. Organização Demo 1 (Acme Games Studio)
      const acmeUser = await this.user.upsert({
        where: { email: 'developer@acmegames.com' },
        update: {},
        create: {
          email: 'developer@acmegames.com',
          fullName: 'Carlos Mendes (Acme Dev)',
          passwordHash:
            '$argon2id$v=19$m=65536,t=3,p=4$dGVzdF9zYWx0X2FjbWVfMjAyNg$1a2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2',
          isActive: true,
          isSuperadmin: false,
        },
      });

      const acmeOrg = await this.organization.upsert({
        where: { slug: 'acme-games' },
        update: {},
        create: {
          name: 'Acme Games Studio',
          slug: 'acme-games',
          documentCnpjCpf: '12.345.678/0001-90',
          planTier: 'PRO',
          isVerified: true,
        },
      });

      await this.membership.upsert({
        where: {
          userId_organizationId: {
            userId: acmeUser.id,
            organizationId: acmeOrg.id,
          },
        },
        update: {},
        create: {
          userId: acmeUser.id,
          organizationId: acmeOrg.id,
          role: 'OWNER' as any,
          isDefault: true,
        },
      });

      const acmeWallet = await this.wallet.upsert({
        where: { organizationId: acmeOrg.id },
        update: {},
        create: { organizationId: acmeOrg.id },
      });

      for (const [accountType, bal, curr] of [
        ['ADVERTISING_CREDITS', 500, 'BRL'],
        ['EXCHANGE_CREDITS', 200, 'CREDITS'],
        ['PUBLISHER_EARNINGS', 0, 'BRL'],
      ] as const) {
        await this.walletAccount.upsert({
          where: {
            walletId_type: {
              walletId: acmeWallet.id,
              type: accountType as any,
            },
          },
          update: {},
          create: {
            walletId: acmeWallet.id,
            type: accountType as any,
            currency: curr,
            cachedBalance: bal,
          },
        });
      }

      // 4. Organização Demo 2 (Beta Apps Studio)
      const betaUser = await this.user.upsert({
        where: { email: 'user@betaapps.com' },
        update: {},
        create: {
          email: 'user@betaapps.com',
          fullName: 'Beatriz Lima (Beta Apps)',
          passwordHash:
            '$argon2id$v=19$m=65536,t=3,p=4$dGVzdF9zYWx0X2JldGFfMjAyNg$2b3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3',
          isActive: true,
          isSuperadmin: false,
        },
      });

      const betaOrg = await this.organization.upsert({
        where: { slug: 'beta-apps' },
        update: {},
        create: {
          name: 'Beta Apps Studio',
          slug: 'beta-apps',
          documentCnpjCpf: '98.765.432/0001-10',
          planTier: 'STARTER',
          isVerified: true,
        },
      });

      await this.membership.upsert({
        where: {
          userId_organizationId: {
            userId: betaUser.id,
            organizationId: betaOrg.id,
          },
        },
        update: {},
        create: {
          userId: betaUser.id,
          organizationId: betaOrg.id,
          role: 'OWNER' as any,
          isDefault: true,
        },
      });

      this.logger.log('✅ Credenciais e organizações iniciais provisionadas automaticamente com sucesso!');
    } catch (err: any) {
      this.logger.warn(`Auto-seed ignorado: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexão com PostgreSQL encerrada.');
  }
}

