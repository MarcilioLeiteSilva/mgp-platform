import { z } from 'zod';
import { AdFormat } from '@mgp/shared';

export const AdFormatEnum = z.nativeEnum(AdFormat);

/**
 * Contrato de criação de bloco de anúncios (Ad Unit).
 */
export const CreateAdUnitSchema = z.object({
  appId: z.string().uuid({ message: 'appId deve ser um UUID válido.' }),
  name: z
    .string()
    .min(2, { message: 'Nome da Ad Unit deve ter no mínimo 2 caracteres.' })
    .max(100, { message: 'Nome da Ad Unit deve ter no máximo 100 caracteres.' }),
  format: AdFormatEnum,
  placement: z.string().max(100).optional(),
  floorEcpm: z.number().nonnegative({ message: 'O floor eCPM não pode ser negativo.' }).default(0.0),
  isActive: z.boolean().default(true),
});

export type CreateAdUnitInput = z.infer<typeof CreateAdUnitSchema>;

/**
 * Contrato de atualização de Ad Unit.
 */
export const UpdateAdUnitSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  placement: z.string().max(100).optional(),
  floorEcpm: z.number().nonnegative({ message: 'O floor eCPM não pode ser negativo.' }).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateAdUnitInput = z.infer<typeof UpdateAdUnitSchema>;

/**
 * Contrato de consulta de Ad Units da organização.
 */
export const ListAdUnitsQuerySchema = z.object({
  appId: z.string().uuid().optional(),
  format: AdFormatEnum.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListAdUnitsQueryInput = z.infer<typeof ListAdUnitsQuerySchema>;

/**
 * Contrato de consulta de métricas de monetização de Publishers.
 */
export const PublisherAnalyticsQuerySchema = z.object({
  appId: z.string().uuid().optional(),
  adUnitId: z.string().uuid().optional(),
  period: z.enum(['today', '7d', '30d', 'all']).default('30d'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type PublisherAnalyticsQueryInput = z.infer<typeof PublisherAnalyticsQuerySchema>;

