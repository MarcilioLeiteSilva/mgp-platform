import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  it('deve estar definido', () => {
    expect(appController).toBeDefined();
  });

  describe('getRoot', () => {
    it('deve retornar metadados da plataforma com status online e links', () => {
      const result = appController.getRoot();
      expect(result).toHaveProperty('name', 'Mobile Growth Platform (MGP) — Core API');
      expect(result).toHaveProperty('status', 'online');
      expect(result).toHaveProperty('docs', '/api/docs');
      expect(result.health).toHaveProperty('liveness', '/health/liveness');
      expect(result.health).toHaveProperty('readiness', '/health/readiness');
    });
  });
});

