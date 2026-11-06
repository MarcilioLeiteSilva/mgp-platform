import { TokenService } from './token.service';
import { AdTrackingTokenPayload } from '@mgp/contracts';

describe('TokenService (Assinatura e Verificação Criptográfica de Tokens de Anúncios)', () => {
  const secret = 'super_secret_test_key_12345';
  let service: TokenService;

  beforeEach(() => {
    service = new TokenService(secret);
  });

  const basePayload: AdTrackingTokenPayload = {
    requestId: 'req_123456',
    adUnitId: 'adunit_banner_01',
    campaignId: 'cmp_001',
    creativeId: 'crt_001',
    publisherAppId: 'app_pub_001',
    publisherOrgId: 'org_pub_001',
    advertiserOrgId: 'org_adv_001',
    bidAmount: 2.5,
    billingModel: 'CPM',
    format: 'BANNER',
    actionUrl: 'https://exemplo.com/landing-page',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 60000, // expira em 1 minuto
  };

  it('deve gerar e verificar com sucesso um token de rastreamento válido', () => {
    const token = service.generateTrackingToken(basePayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const verified = service.verifyTrackingToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.requestId).toBe('req_123456');
    expect(verified?.adUnitId).toBe('adunit_banner_01');
    expect(verified?.bidAmount).toBe(2.5);
    expect(verified?.actionUrl).toBe('https://exemplo.com/landing-page');
  });

  it('deve rejeitar token adulterado (Tampered Token)', () => {
    const token = service.generateTrackingToken(basePayload);
    const [payloadB64, sig] = token.split('.');

    // Altera o payload decodificado e re-codifica sem atualizar a assinatura
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    decoded.bidAmount = 999.0;
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    const tamperedToken = `${tamperedPayloadB64}.${sig}`;

    const verified = service.verifyTrackingToken(tamperedToken);
    expect(verified).toBeNull();
  });

  it('deve rejeitar token assinado com chave secreta incorreta', () => {
    const foreignService = new TokenService('different_wrong_secret_key');
    const token = foreignService.generateTrackingToken(basePayload);

    const verified = service.verifyTrackingToken(token);
    expect(verified).toBeNull();
  });

  it('deve rejeitar token expirado', () => {
    const expiredPayload: AdTrackingTokenPayload = {
      ...basePayload,
      expiresAt: Date.now() - 5000, // expirou há 5 segundos
    };

    const token = service.generateTrackingToken(expiredPayload);
    const verified = service.verifyTrackingToken(token);
    expect(verified).toBeNull();
  });

  it('deve rejeitar tokens malformados ou nulos', () => {
    expect(service.verifyTrackingToken('')).toBeNull();
    expect(service.verifyTrackingToken('invalid_token_no_dot')).toBeNull();
    expect(service.verifyTrackingToken('a.b.c')).toBeNull();
    expect(service.verifyTrackingToken(null as any)).toBeNull();
  });
});
