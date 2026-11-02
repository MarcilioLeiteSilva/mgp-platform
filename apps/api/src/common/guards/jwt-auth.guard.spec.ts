import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../../config/app-config.service';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@mgp/database';

describe('JwtAuthGuard (Proteção de Rotas com JWT)', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let jwtService: JwtService;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    jwtAccessSecret: 'super-secret-access-key-32-chars-long!',
  };

  const createMockContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const req: any = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        Reflector,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AppConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(guard).toBeDefined();
  });

  it('deve permitir acesso sem token se a rota estiver anotada com @Public()', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const ctx = createMockContext({});

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('deve lançar UnauthorizedException se o cabeçalho Authorization estiver ausente', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({});

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('deve lançar UnauthorizedException se o esquema não for Bearer', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({ authorization: 'Basic dXNlcjpwYXNz' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('deve lançar UnauthorizedException se o token for inválido ou expirado', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({ authorization: 'Bearer invalid_token' });

    mockJwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('deve decodificar o token, anexar request.user e permitir o acesso quando o token for válido', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({ authorization: 'Bearer valid_jwt_token' });

    const mockPayload = {
      sub: 'usr_carlos_123',
      email: 'carlos@empresa.com',
      fullName: 'Carlos Mendes',
      isSuperadmin: false,
      activeOrgId: 'org_alpha',
      role: UserRole.OWNER,
    };

    mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const req = ctx.switchToHttp().getRequest();
    expect(req.user).toEqual({
      id: 'usr_carlos_123',
      email: 'carlos@empresa.com',
      fullName: 'Carlos Mendes',
      isSuperadmin: false,
      activeOrgId: 'org_alpha',
      role: UserRole.OWNER,
    });
  });
});

