import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizações e Multi-Tenancy')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista organizações às quais o usuário logado pertence' })
  @ApiResponse({ status: 200, description: 'Lista de organizações retornada com sucesso.' })
  async listUserOrganizations() {
    return this.orgService.listUserOrganizations();
  }
}

