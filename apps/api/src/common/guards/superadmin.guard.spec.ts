import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SuperadminGuard } from './superadmin.guard';

describe('SuperadminGuard', () => {
  let guard: SuperadminGuard;

  beforeEach(() => {
    guard = new SuperadminGuard();
  });

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  };

  it('deve permitir acesso quando o usuário for superadmin', () => {
    const context = createMockContext({ id: 'user-1', isSuperadmin: true });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve lançar ForbiddenException quando o usuário não for superadmin', () => {
    const context = createMockContext({ id: 'user-2', isSuperadmin: false });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('deve lançar UnauthorizedException quando não houver usuário no contexto', () => {
    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
