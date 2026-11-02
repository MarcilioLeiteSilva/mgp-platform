import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z.string().email('E-mail informado é inválido'),
  password: z.string().min(8, 'A senha deve conter no mínimo 8 caracteres'),
});

export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  fullName: z.string().min(3, 'O nome deve conter pelo menos 3 caracteres'),
  email: z.string().email('E-mail informado é inválido'),
  password: z.string().min(8, 'A senha deve conter no mínimo 8 caracteres'),
  organizationName: z.string().min(2, 'Nome da organização é obrigatório'),
});

export type RegisterRequestDto = z.infer<typeof RegisterRequestSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

export type RefreshTokenRequestDto = z.infer<typeof RefreshTokenRequestSchema>;

