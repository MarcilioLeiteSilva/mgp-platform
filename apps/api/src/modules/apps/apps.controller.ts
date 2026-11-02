import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';

@ApiTags('Aplicativos e SDK')
@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista aplicativos da organização ativa (Multi-Tenant)',
    description: 'Retorna exclusivamente os aplicativos pertencentes à organização informada no cabeçalho X-Organization-Id.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de aplicativos retornada com sucesso.',
  })
  async listApps(
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.appsService.listApps(organizationId);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra um novo aplicativo na organização ativa',
    description: 'Vincula o aplicativo à organização e gera a chave SDK.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({
    status: 201,
    description: 'Aplicativo cadastrado com sucesso e chave SDK gerada.',
  })
  async createApp(
    @Body() dto: CreateAppDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Headers('x-user-id') userIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id || userIdHeader;
    return this.appsService.createApp(organizationId, dto, userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtém detalhes de um aplicativo com validação de isolamento',
    description: 'Retorna o aplicativo apenas se ele pertencer à organização informada.',
  })
  @ApiParam({ name: 'id', description: 'UUID do aplicativo' })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do aplicativo retornados com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Aplicativo não encontrado ou pertencente a outra organização.',
  })
  async getApp(
    @Param('id') appId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.appsService.findAppById(appId, organizationId);
  }
}

