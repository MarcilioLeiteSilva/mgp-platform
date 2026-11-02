import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  async getProfile(userId: string) {
    return {
      userId,
      message: 'Módulo de usuários configurado. Detalhamento na Fase 06 e 07.',
    };
  }
}

