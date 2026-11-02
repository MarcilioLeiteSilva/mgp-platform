import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@mgp/database';

describe('RolesGuard (Controle de Acesso RBAC)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (tenant: any, user: any = { isSuperadmin: false }): ExecutionContext => {
    const req: any = { tenant, user };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('deve permitir acesso se a rota não possuir restrição de papéis (@Roles)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const ctx = createMockContext({ role: UserRole.ANALYST });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('deve permitir acesso irrestrito ao OWNER dentro da organização', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const ctx = createMockContext({ role: UserRole.OWNER });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('deve permitir acesso irrestrito se o usuário for superadmin global', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.OWNER]);
    const ctx = createMockContext({ role: UserRole.DEVELOPER }, { isSuperadmin: true });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('deve permitir acesso se o papel do usuário corresponder exatamente ao papel exigido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.DEVELOPER, UserRole.MANAGER]);
    const ctx = createMockContext({ role: UserRole.DEVELOPER });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('deve permitir acesso se o papel do usuário possuir hierarquia gerencial superior à exigida', () => {
    // Exigência: MANAGER, Papel do usuário: ADMIN (Hierarquia 80 > 60)
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.MANAGER]);
    const ctx = createMockContext({ role: UserRole.ADMIN });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('deve lançar ForbiddenException se o papel for inferior ao exigido', () => {
    // Exigência: ADMIN, Papel do usuário: DEVELOPER (Hierarquia 40 < 80)
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const ctx = createMockContext({ role: UserRole.DEVELOPER });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});

