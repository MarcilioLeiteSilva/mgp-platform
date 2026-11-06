import {
  TelemetryEventTypeEnum,
  DeviceContextSchema,
  AppContextSchema,
  NetworkContextSchema,
  TelemetryEventSchema,
  TelemetryBatchSchema,
  TelemetryResponseSchema,
} from '@mgp/contracts';

describe('Contratos de Telemetria e Antifraude (Fase 17 — Zod Schemas)', () => {
  describe('TelemetryEventTypeEnum', () => {
    it('deve validar todos os 5 tipos canônicos de eventos de telemetria', () => {
      const validTypes = [
        'APP_OPEN',
        'SESSION_START',
        'HEARTBEAT',
        'SESSION_END',
        'CUSTOM_EVENT',
      ];

      validTypes.forEach((type) => {
        expect(TelemetryEventTypeEnum.parse(type)).toBe(type);
      });
    });

    it('deve rejeitar tipos de eventos não reconhecidos', () => {
      expect(() => TelemetryEventTypeEnum.parse('UNKNOWN_EVENT')).toThrow();
    });
  });

  describe('DeviceContextSchema', () => {
    it('deve validar contexto de dispositivo em compliance Google Play', () => {
      const validDevice = {
        platform: 'ANDROID',
        osVersion: '14',
        apiLevel: 34,
        deviceModel: 'Pixel 8 Pro',
        manufacturer: 'Google',
        screenWidth: 1344,
        screenHeight: 2992,
        screenDensity: 3.0,
        locale: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        advertisingId: '4a5b6c7d-8e9f-0123-4567-89abcdef0123',
        isLimitAdTracking: false,
        isEmulator: false,
        isRooted: false,
      };

      const parsed = DeviceContextSchema.parse(validDevice);
      expect(parsed.platform).toBe('ANDROID');
      expect(parsed.deviceModel).toBe('Pixel 8 Pro');
      expect(parsed.isEmulator).toBe(false);
    });

    it('deve falhar se dimensão de tela for inválida ou negativa', () => {
      const invalidDevice = {
        platform: 'ANDROID',
        osVersion: '14',
        deviceModel: 'Pixel',
        manufacturer: 'Google',
        screenWidth: -100,
        screenHeight: 1920,
        screenDensity: 2.0,
      };

      expect(() => DeviceContextSchema.parse(invalidDevice)).toThrow();
    });
  });

  describe('AppContextSchema', () => {
    it('deve validar contexto do app host', () => {
      const validApp = {
        packageName: 'com.acmegames.runner3d',
        appVersion: '2.4.1',
        versionCode: 20401,
        sdkVersion: '0.1.0',
        installSource: 'com.android.vending',
      };

      const parsed = AppContextSchema.parse(validApp);
      expect(parsed.packageName).toBe('com.acmegames.runner3d');
      expect(parsed.versionCode).toBe(20401);
    });
  });

  describe('TelemetryBatchSchema', () => {
    it('deve validar envelope completo de lote de telemetria com HMAC e Nonce', () => {
      const validBatch = {
        batchId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        sentAt: '2026-11-06T14:30:00.000Z',
        sdkKey: 'mgp_live_sdk_9f8e7d6c5b4a3210',
        device: {
          platform: 'ANDROID',
          osVersion: '14',
          deviceModel: 'Galaxy S24',
          manufacturer: 'Samsung',
          screenWidth: 1080,
          screenHeight: 2340,
          screenDensity: 2.75,
        },
        app: {
          packageName: 'com.acmegames.runner3d',
          appVersion: '1.0.0',
          versionCode: 100,
        },
        network: {
          networkType: 'WIFI',
          carrier: 'Vivo',
        },
        events: [
          {
            eventId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
            eventType: 'SESSION_START',
            sessionId: 'sess_12345',
            timestamp: '2026-11-06T14:29:50.000Z',
            sequenceNumber: 1,
            nonce: 'nonce_random_string_12345678',
            signature: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            properties: { entryPoint: 'HOME_SCREEN' },
          },
          {
            eventId: '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bee',
            eventType: 'HEARTBEAT',
            sessionId: 'sess_12345',
            timestamp: '2026-11-06T14:30:50.000Z',
            sequenceNumber: 2,
            nonce: 'nonce_random_string_87654321',
            signature: '123456abcdef7890abcdef1234567890abcdef1234567890abcdef1234567890',
            properties: { activeDurationSeconds: 60 },
          },
        ],
      };

      const parsed = TelemetryBatchSchema.parse(validBatch);
      expect(parsed.events.length).toBe(2);
      expect(parsed.events[0].eventType).toBe('SESSION_START');
      expect(parsed.events[1].eventType).toBe('HEARTBEAT');
    });

    it('deve rejeitar lote sem nenhum evento', () => {
      const emptyBatch = {
        batchId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        sentAt: '2026-11-06T14:30:00.000Z',
        sdkKey: 'mgp_live_sdk_key',
        device: {
          platform: 'ANDROID',
          osVersion: '14',
          deviceModel: 'Model',
          manufacturer: 'Brand',
          screenWidth: 1080,
          screenHeight: 1920,
          screenDensity: 2.0,
        },
        app: {
          packageName: 'com.test',
          appVersion: '1.0',
          versionCode: 1,
        },
        events: [],
      };

      expect(() => TelemetryBatchSchema.parse(emptyBatch)).toThrow();
    });
  });

  describe('TelemetryResponseSchema', () => {
    it('deve validar resposta afirmativa de ingestão', () => {
      const response = {
        success: true,
        batchId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        processedCount: 15,
        rejectedCount: 0,
        serverTime: '2026-11-06T14:30:01.000Z',
      };

      const parsed = TelemetryResponseSchema.parse(response);
      expect(parsed.success).toBe(true);
      expect(parsed.processedCount).toBe(15);
    });

    it('deve validar consistencia da assinatura HMAC-SHA256 gerada pelo SDK', () => {
      const crypto = require('crypto');
      const sdkKey = 'mgp_live_sdk_9f8e7d6c5b4a3210';
      const eventId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
      const eventType = 'APP_OPEN';
      const sessionId = 'sess_xyz';
      const timestamp = '2026-11-06T14:30:00.000Z';
      const nonce = 'nonce_1234567890abcdef';

      const canonicalString = `${eventId}|${eventType}|${sessionId}|${timestamp}|${nonce}`;
      const serverHmac = crypto.createHmac('sha256', sdkKey).update(canonicalString).digest('hex');

      expect(serverHmac).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(serverHmac)).toBe(true);
    });

    it('deve validar eventos customizados (CUSTOM_EVENT) com propriedades flexíveis', () => {
      const event = {
        eventId: '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bef',
        eventType: 'CUSTOM_EVENT',
        sessionId: 'sess_12345',
        timestamp: '2026-11-06T14:35:00.000Z',
        sequenceNumber: 3,
        nonce: 'nonce_custom_event_12345',
        signature: '123456abcdef7890abcdef1234567890abcdef1234567890abcdef1234567890',
        properties: {
          customEventName: 'level_complete',
          level_number: 12,
          stars_earned: 3,
          duration_seconds: 94.5,
        },
      };

      const parsed = TelemetryEventSchema.parse(event);
      expect(parsed.eventType).toBe('CUSTOM_EVENT');
      expect(parsed.properties?.customEventName).toBe('level_complete');
      expect(parsed.properties?.stars_earned).toBe(3);
    });
  });
});

