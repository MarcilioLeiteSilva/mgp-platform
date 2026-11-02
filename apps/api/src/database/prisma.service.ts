import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@mgp/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conexão com PostgreSQL estabelecida com sucesso via Prisma.');
    } catch (error) {
      this.logger.warn(
        'Aviso: Não foi possível conectar ao PostgreSQL durante o bootstrap (o banco pode estar em inicialização).',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexão com PostgreSQL encerrada.');
  }
}

