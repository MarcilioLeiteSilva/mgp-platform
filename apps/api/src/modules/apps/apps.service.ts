import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAppDto } from './dto/create-app.dto';
import { AppPlatform, AppStatus } from '@mgp/database';
import { randomUUID } from 'crypto';

@Injectable()
export class AppsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todos os aplicativos da organização garantindo o filtro de tenant.
   */
  async listApps(organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException('organizationId é obrigatório para consultar aplicativos.');
    }

    return this.prisma.app.findMany({
      where: { organizationId },
      include: {
        adUnits: true,
        _count: {
          select: { adUnits: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Busca um aplicativo por ID com isolamento estrito de tenant (Zero Data Leakage).
   * Se o app pertencer a outro tenant, retorna NotFoundException, impedindo inferência de dados.
   */
  async findAppById(appId: string, organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException('organizationId é obrigatório para consultar o aplicativo.');
    }

    const app = await this.prisma.app.findFirst({
      where: {
        id: appId,
        organizationId, // Cláusula mandatória de isolamento
      },
      include: {
        adUnits: true,
      },
    });

    if (!app) {
      throw new NotFoundException(`Aplicativo '${appId}' não encontrado nesta organização.`);
    }

    return app;
  }

  /**
   * Cadastra um novo aplicativo no tenant com chave SDK gerada automaticamente.
   */
  async createApp(organizationId: string, dto: CreateAppDto, userId?: string) {
    const platform = dto.platform || AppPlatform.ANDROID;

    // Checar se já existe o mesmo package_name nesta organização para a plataforma
    const existing = await this.prisma.app.findUnique({
      where: {
        organizationId_packageName_platform: {
          organizationId,
          packageName: dto.packageName,
          platform,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `O aplicativo '${dto.packageName}' para ${platform} já está cadastrado nesta organização.`,
      );
    }

    const sdkKey = `sdk_${randomUUID().replace(/-/g, '')}`;

    const app = await this.prisma.app.create({
      data: {
        organizationId,
        name: dto.name,
        packageName: dto.packageName,
        platform,
        status: AppStatus.ACTIVE,
        sdkKey,
      },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'APP_CREATED',
          entityType: 'App',
          entityId: app.id,
          diffAfter: { name: app.name, packageName: app.packageName, platform: app.platform },
        },
      });
    }

    return app;
  }
}

