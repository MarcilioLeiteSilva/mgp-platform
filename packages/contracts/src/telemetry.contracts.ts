import { z } from 'zod';

export const TelemetryEventTypeEnum = z.enum([
  'APP_OPEN',
  'SESSION_START',
  'HEARTBEAT',
  'SESSION_END',
  'CUSTOM_EVENT',
]);

export type TelemetryEventType = z.infer<typeof TelemetryEventTypeEnum>;

export const NetworkTypeEnum = z.enum([
  'WIFI',
  'CELLULAR_5G',
  'CELLULAR_4G',
  'CELLULAR_3G',
  'OTHER',
  'NONE',
]);

export type NetworkType = z.infer<typeof NetworkTypeEnum>;

/**
 * Contexto de hardware e sistema operacional do dispositivo cliente.
 * Em conformidade estrita com a Google Play Developer Policy (sem identificadores permanentes).
 */
export const DeviceContextSchema = z.object({
  platform: z.enum(['ANDROID', 'IOS']).default('ANDROID'),
  osVersion: z.string().min(1),
  apiLevel: z.number().int().positive().optional(),
  deviceModel: z.string().min(1),
  manufacturer: z.string().min(1),
  brand: z.string().optional(),
  screenWidth: z.number().int().positive(),
  screenHeight: z.number().int().positive(),
  screenDensity: z.number().positive(),
  locale: z.string().default('pt-BR'),
  timezone: z.string().default('UTC'),
  advertisingId: z.string().optional(),
  isLimitAdTracking: z.boolean().default(false),
  isEmulator: z.boolean().default(false),
  isRooted: z.boolean().default(false),
});

export type DeviceContextDto = z.infer<typeof DeviceContextSchema>;

/**
 * Contexto do aplicativo hospedeiro e versão do SDK integrada.
 */
export const AppContextSchema = z.object({
  packageName: z.string().min(1),
  appVersion: z.string().min(1),
  versionCode: z.number().int().positive(),
  sdkVersion: z.string().min(1).default('0.1.0'),
  installSource: z.string().optional(),
});

export type AppContextDto = z.infer<typeof AppContextSchema>;

/**
 * Contexto de rede e conectividade do dispositivo no momento do envio.
 */
export const NetworkContextSchema = z.object({
  networkType: NetworkTypeEnum.default('NONE'),
  carrier: z.string().optional(),
  isVpnActive: z.boolean().default(false),
});

export type NetworkContextDto = z.infer<typeof NetworkContextSchema>;

/**
 * Estrutura individual de um evento de telemetria emitido pelo SDK.
 */
export const TelemetryEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: TelemetryEventTypeEnum,
  sessionId: z.string().min(1),
  timestamp: z.string().datetime(),
  sequenceNumber: z.number().int().nonnegative().optional(),
  properties: z.record(z.any()).optional().default({}),
  nonce: z.string().min(16),
  signature: z.string().min(32),
});

export type TelemetryEventDto = z.infer<typeof TelemetryEventSchema>;

/**
 * Envelope de lote de telemetria (Batch) despachado via HTTP.
 */
export const TelemetryBatchSchema = z.object({
  batchId: z.string().uuid(),
  sentAt: z.string().datetime(),
  sdkKey: z.string().min(1),
  device: DeviceContextSchema,
  app: AppContextSchema,
  network: NetworkContextSchema.optional().default({ networkType: 'NONE' }),
  events: z.array(TelemetryEventSchema).min(1).max(100),
});

export type TelemetryBatchDto = z.infer<typeof TelemetryBatchSchema>;

/**
 * Resposta oficial da API / Ingestor de telemetria.
 */
export const TelemetryResponseSchema = z.object({
  success: z.boolean(),
  batchId: z.string(),
  processedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative().default(0),
  serverTime: z.string().datetime(),
  error: z.string().optional(),
});

export type TelemetryResponseDto = z.infer<typeof TelemetryResponseSchema>;

/**
 * Constantes de filas assíncronas do subsistema de telemetria.
 */
export const TELEMETRY_QUEUES = {
  INGESTION: 'queue-telemetry',
} as const;

/**
 * Carga do Job de telemetria processado pelos workers em segundo plano.
 */
export interface TelemetryBatchJobPayload {
  batchId: string;
  appId: string;
  organizationId: string;
  sdkKey: string;
  clientIp?: string;
  batch: TelemetryBatchDto;
  receivedAt: string;
}


