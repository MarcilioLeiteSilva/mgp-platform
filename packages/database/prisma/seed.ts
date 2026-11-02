import {
  PrismaClient,
  UserRole,
  AppPlatform,
  AppStatus,
  AdFormat,
  CampaignType,
  CampaignBillingModel,
  CampaignStatus,
  WalletAccountType,
  LedgerTransactionType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Iniciando seed do banco de dados MGP...');

  // 1. Superadmin Global da Plataforma
  const superadmin = await prisma.user.upsert({
    where: { email: 'admin@mgp.com.br' },
    update: {},
    create: {
      email: 'admin@mgp.com.br',
      fullName: 'Administrador do Sistema MGP',
      // Hash inicial seguro (substituível no login real)
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dGVzdF9zYWx0X21ncF8yMDI2$8h7GZ4v+t+zYjQvU7b1A6a2Q3f8K9L4m5N6P7Q8R9S0',
      isActive: true,
      isSuperadmin: true,
    },
  });
  console.info(`✅ Superadmin configurado: ${superadmin.email}`);

  // 2. Organização Master do Sistema (Plataforma MGP)
  const masterOrg = await prisma.organization.upsert({
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

  // Membresia do Superadmin na Org Master
  await prisma.membership.upsert({
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
      role: UserRole.OWNER,
      isDefault: true,
    },
  });

  // Carteira Master e Contas Contábeis
  const masterWallet = await prisma.wallet.upsert({
    where: { organizationId: masterOrg.id },
    update: {},
    create: {
      organizationId: masterOrg.id,
    },
  });

  for (const accountType of [
    WalletAccountType.ADVERTISING_CREDITS,
    WalletAccountType.EXCHANGE_CREDITS,
    WalletAccountType.PUBLISHER_EARNINGS,
  ]) {
    await prisma.walletAccount.upsert({
      where: {
        walletId_type: {
          walletId: masterWallet.id,
          type: accountType,
        },
      },
      update: {},
      create: {
        walletId: masterWallet.id,
        type: accountType,
        currency: 'BRL',
        cachedBalance: 0.0,
      },
    });
  }
  console.info(`✅ Organização Master provisionada: ${masterOrg.name} (${masterOrg.slug})`);

  // 3. Organização Demo 1 (Acme Games Studio)
  const acmeUser = await prisma.user.upsert({
    where: { email: 'developer@acmegames.com' },
    update: {},
    create: {
      email: 'developer@acmegames.com',
      fullName: 'Carlos Mendes (Acme Dev)',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dGVzdF9zYWx0X2FjbWVfMjAyNg$1a2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2',
      isActive: true,
      isSuperadmin: false,
    },
  });

  const acmeOrg = await prisma.organization.upsert({
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

  await prisma.membership.upsert({
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
      role: UserRole.OWNER,
      isDefault: true,
    },
  });

  const acmeWallet = await prisma.wallet.upsert({
    where: { organizationId: acmeOrg.id },
    update: {},
    create: { organizationId: acmeOrg.id },
  });

  // Criação das contas e lançamento inicial no Razão Contábil (Ledger)
  const acmeAdAccount = await prisma.walletAccount.upsert({
    where: {
      walletId_type: {
        walletId: acmeWallet.id,
        type: WalletAccountType.ADVERTISING_CREDITS,
      },
    },
    update: {},
    create: {
      walletId: acmeWallet.id,
      type: WalletAccountType.ADVERTISING_CREDITS,
      currency: 'BRL',
      cachedBalance: 500.0,
    },
  });

  const acmeExchangeAccount = await prisma.walletAccount.upsert({
    where: {
      walletId_type: {
        walletId: acmeWallet.id,
        type: WalletAccountType.EXCHANGE_CREDITS,
      },
    },
    update: {},
    create: {
      walletId: acmeWallet.id,
      type: WalletAccountType.EXCHANGE_CREDITS,
      currency: 'CREDITS',
      cachedBalance: 200.0,
    },
  });

  await prisma.walletAccount.upsert({
    where: {
      walletId_type: {
        walletId: acmeWallet.id,
        type: WalletAccountType.PUBLISHER_EARNINGS,
      },
    },
    update: {},
    create: {
      walletId: acmeWallet.id,
      type: WalletAccountType.PUBLISHER_EARNINGS,
      currency: 'BRL',
      cachedBalance: 0.0,
    },
  });

  // Lançamentos contábeis imutáveis no Ledger para a Acme Games
  await prisma.walletLedger.upsert({
    where: { idempotencyKey: 'seed_acme_fiat_deposit_001' },
    update: {},
    create: {
      accountId: acmeAdAccount.id,
      transactionType: LedgerTransactionType.DEPOSIT_FIAT,
      amount: 500.0,
      balanceAfter: 500.0,
      idempotencyKey: 'seed_acme_fiat_deposit_001',
      description: 'Depósito inicial demonstrativo via PIX (R$ 500,00)',
      metadata: { gateway: 'PIX_DIRECT', txId: 'tx_demo_pix_001' },
    },
  });

  await prisma.walletLedger.upsert({
    where: { idempotencyKey: 'seed_acme_exchange_grant_001' },
    update: {},
    create: {
      accountId: acmeExchangeAccount.id,
      transactionType: LedgerTransactionType.EXCHANGE_EARNED,
      amount: 200.0,
      balanceAfter: 200.0,
      idempotencyKey: 'seed_acme_exchange_grant_001',
      description: 'Créditos concedidos por exibição em rede de permuta (200 créditos)',
      metadata: { network: 'MGP_EXCHANGE' },
    },
  });

  // App de demonstração: Acme Runner 3D
  const acmeApp = await prisma.app.upsert({
    where: {
      organizationId_packageName_platform: {
        organizationId: acmeOrg.id,
        packageName: 'com.acmegames.runner3d',
        platform: AppPlatform.ANDROID,
      },
    },
    update: {},
    create: {
      organizationId: acmeOrg.id,
      name: 'Acme Runner 3D',
      packageName: 'com.acmegames.runner3d',
      platform: AppPlatform.ANDROID,
      status: AppStatus.ACTIVE,
      sdkKey: 'sdk_acme_runner3d_live_key_001',
    },
  });

  // Blocos de Anúncio (Ad Units)
  await prisma.adUnit.createMany({
    data: [
      {
        appId: acmeApp.id,
        name: 'Banner Principal - Tela Inicial',
        format: AdFormat.BANNER,
        placement: 'home_bottom',
        floorEcpm: 0.5,
        isActive: true,
      },
      {
        appId: acmeApp.id,
        name: 'Intersticial - Fim de Partida',
        format: AdFormat.INTERSTITIAL,
        placement: 'game_over',
        floorEcpm: 3.5,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  // Campanha Publicitária de Demonstração
  const campaign = await prisma.campaign.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Campanha Brasil - Lançamento Acme Runner',
      type: CampaignType.PAID,
      billingModel: CampaignBillingModel.CPM,
      bidAmount: 2.5,
      dailyBudget: 50.0,
      totalBudget: 500.0,
      status: CampaignStatus.ACTIVE,
      targetCountry: 'BR',
      creatives: {
        create: {
          format: AdFormat.BANNER,
          title: 'Jogue Acme Runner 3D Grátis!',
          description: 'O melhor jogo de corrida infinita de 2026. Baixe já!',
          imageUrl: 'https://cdn.mgp.com.br/creatives/acme_banner_320x50.png',
          actionUrl: 'https://play.google.com/store/apps/details?id=com.acmegames.runner3d',
          width: 320,
          height: 50,
          isActive: true,
        },
      },
    },
  });
  console.info(`✅ Organização Acme Games e Campanha provisionadas: ${campaign.name}`);

  // 4. Organização Demo 2 (Beta Apps Studio — Isolamento Multi-Tenant)
  const betaUser = await prisma.user.upsert({
    where: { email: 'user@betaapps.com' },
    update: {},
    create: {
      email: 'user@betaapps.com',
      fullName: 'Beatriz Lima (Beta Apps)',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dGVzdF9zYWx0X2JldGFfMjAyNg$2b3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3',
      isActive: true,
      isSuperadmin: false,
    },
  });

  const betaOrg = await prisma.organization.upsert({
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

  await prisma.membership.upsert({
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
      role: UserRole.OWNER,
      isDefault: true,
    },
  });

  await prisma.app.upsert({
    where: {
      organizationId_packageName_platform: {
        organizationId: betaOrg.id,
        packageName: 'com.betaapps.productivity',
        platform: AppPlatform.ANDROID,
      },
    },
    update: {},
    create: {
      organizationId: betaOrg.id,
      name: 'Beta Productivity Tool',
      packageName: 'com.betaapps.productivity',
      platform: AppPlatform.ANDROID,
      status: AppStatus.ACTIVE,
      sdkKey: 'sdk_beta_productivity_key_002',
    },
  });
  console.info(`✅ Organização Beta Apps provisionada para validação de isolamento: ${betaOrg.name}`);

  console.info('🎉 Seed do banco de dados MGP concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed do banco de dados:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

