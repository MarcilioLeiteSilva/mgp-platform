import * as crypto from 'crypto';
import { TelemetryAntifraudService } from './telemetry-antifraud.service';
import { AppConfigService } from '../../../config/app-config.service';
import { TelemetryEventDto, DeviceContextDto } from '@mgp/contracts';

describe('TelemetryAntifraudService (Segurança e Validação Criptográfica)', () => {
  let service: TelemetryAntifraudService;
  let mockConfig: Partial<AppConfigService>;

  beforeEach(() => {
    mockConfig = {
      redisUrl: 'redis://127.0.0.1:6379',
    };
    service = new TelemetryAntifraudService(mockConfig as AppConfigService);
    // Não conecta ao Redis real durante unit tests, utiliza fallback em memória
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('validateHmacSignature', () => {
    const sdkKey = 'mgp_test_secret_key_123456';
    const eventId = '11111111-2222-3333-4444-555555555555';
    const eventType = 'APP_OPEN';
    const sessionId = 'session_alpha';
    const timestamp = '2026-11-06T14:30:00.000Z';
    const nonce = 'nonce_abcdef123456';

    it('deve aprovar evento com assinatura HMAC-SHA256 válida', () => {
      const canonical = `${eventId}|${eventType}|${sessionId}|${timestamp}|${nonce}`;
      const validSig = crypto.createHmac('sha256', sdkKey).update(canonical, 'utf-8').digest('hex');

      const event: TelemetryEventDto = {
        eventId,
        eventType,
        sessionId,
        timestamp,
        nonce,
        properties: {},
        signature: validSig,
      };

      expect(service.validateHmacSignature(event, sdkKey)).toBe(true);
    });

    it('deve rejeitar evento adulterado (Tampered Event)', () => {
      const canonical = `${eventId}|${eventType}|${sessionId}|${timestamp}|${nonce}`;
      const validSig = crypto.createHmac('sha256', sdkKey).update(canonical, 'utf-8').digest('hex');

      const tamperedEvent: TelemetryEventDto = {
        eventId,
        eventType: 'SESSION_END', // Tipo alterado após assinatura
        sessionId,
        timestamp,
        nonce,
        properties: {},
        signature: validSig,
      };

      expect(service.validateHmacSignature(tamperedEvent, sdkKey)).toBe(false);
    });

    it('deve rejeitar assinatura calculada com chave incorreta', () => {
      const canonical = `${eventId}|${eventType}|${sessionId}|${timestamp}|${nonce}`;
      const wrongSig = crypto.createHmac('sha256', 'wrong_key').update(canonical, 'utf-8').digest('hex');

      const event: TelemetryEventDto = {
        eventId,
        eventType,
        sessionId,
        timestamp,
        nonce,
        properties: {},
        signature: wrongSig,
      };

      expect(service.validateHmacSignature(event, sdkKey)).toBe(false);
    });
  });

  describe('validateTimestamp', () => {
    it('deve aceitar timestamp contemporâneo', () => {
      const nowIso = new Date().toISOString();
      expect(service.validateTimestamp(nowIso)).toBe(true);
    });

    it('deve aceitar evento recente ocorrido há 2 horas (buffer offline)', () => {
      const past2Hours = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(service.validateTimestamp(past2Hours)).toBe(true);
    });

    it('deve rejeitar evento expirado com mais de 24 horas no passado', () => {
      const expiredPast = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      expect(service.validateTimestamp(expiredPast)).toBe(false);
    });

    it('deve rejeitar timestamp futuro com mais de 5 minutos de desvio', () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      expect(service.validateTimestamp(futureTime)).toBe(false);
    });

    it('deve rejeitar string inválida', () => {
      expect(service.validateTimestamp('invalid-date-string')).toBe(false);
    });
  });

  describe('checkAndRecordNonce', () => {
    it('deve registrar nonce inédito e rejeitar repetição imediata (Replay Attack)', async () => {
      const nonce = 'unique_nonce_' + Date.now();

      const firstAttempt = await service.checkAndRecordNonce(nonce, 60);
      expect(firstAttempt).toBe(true);

      const replayAttempt = await service.checkAndRecordNonce(nonce, 60);
      expect(replayAttempt).toBe(false);
    });
  });

  describe('inspectFraudSignals', () => {
    it('deve detectar dispositivo emulador', () => {
      const device: DeviceContextDto = {
        platform: 'ANDROID',
        osVersion: '14',
        deviceModel: 'sdk_gphone',
        manufacturer: 'Google',
        screenWidth: 1080,
        screenHeight: 1920,
        screenDensity: 2.0,
        locale: 'pt-BR',
        timezone: 'UTC',
        isEmulator: true,
        isRooted: false,
        isLimitAdTracking: false,
      };

      const event: TelemetryEventDto = {
        eventId: 'ev_1',
        eventType: 'APP_OPEN',
        sessionId: 's_1',
        timestamp: new Date().toISOString(),
        nonce: 'n_1',
        properties: {},
        signature: 'sig_1',
      };

      const signals = service.inspectFraudSignals(event, device);
      expect(signals.isSuspicious).toBe(true);
      expect(signals.flags).toContain('EMULATOR_ENVIRONMENT');
    });

    it('deve detectar dispositivo com root', () => {
      const device: DeviceContextDto = {
        platform: 'ANDROID',
        osVersion: '14',
        deviceModel: 'Pixel 8',
        manufacturer: 'Google',
        screenWidth: 1080,
        screenHeight: 1920,
        screenDensity: 2.0,
        locale: 'pt-BR',
        timezone: 'UTC',
        isEmulator: false,
        isRooted: true,
        isLimitAdTracking: false,
      };

      const event: TelemetryEventDto = {
        eventId: 'ev_2',
        eventType: 'HEARTBEAT',
        sessionId: 's_2',
        timestamp: new Date().toISOString(),
        nonce: 'n_2',
        properties: {},
        signature: 'sig_2',
      };

      const signals = service.inspectFraudSignals(event, device);
      expect(signals.isSuspicious).toBe(true);
      expect(signals.flags).toContain('ROOTED_DEVICE');
    });
  });
});
