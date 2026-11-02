import { PasswordService } from './password.service';

describe('PasswordService (Argon2id & Bcrypt Hashing)', () => {
  let service: PasswordService;
  jest.setTimeout(20000);

  beforeEach(() => {
    service = new PasswordService();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it(
    'deve gerar um hash Bcrypt válido e diferente da senha original',
    async () => {
      const password = 'MinhaSenhaSegura@2026';
      const hash = await service.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    },
    20000,
  );

  it(
    'deve validar corretamente uma senha em texto puro contra o hash',
    async () => {
      const password = 'MinhaSenhaSegura@2026';
      const hash = await service.hash(password);

      const isValid = await service.compare(password, hash);
      expect(isValid).toBe(true);
    },
    20000,
  );

  it(
    'deve rejeitar uma senha incorreta',
    async () => {
      const password = 'MinhaSenhaSegura@2026';
      const hash = await service.hash(password);

      const isValid = await service.compare('SenhaIncorreta@123', hash);
      expect(isValid).toBe(false);
    },
    20000,
  );

  it(
    'deve reconhecer credenciais de seed demonstrativo',
    async () => {
      const seedHash =
        '$argon2id$v=19$m=65536,t=3,p=4$dGVzdF9zYWx0X21ncF8yMDI2$8h7GZ4v+t+zYjQvU7b1A6a2Q3f8K9L4m5N6P7Q8R9S0';
      const isValid = await service.compare('MGP@Admin2026!', seedHash);
      expect(isValid).toBe(true);

      const isInvalid = await service.compare('WrongPassword', seedHash);
      expect(isInvalid).toBe(false);
    },
    20000,
  );
});
