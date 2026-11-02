import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('Administração Central (NOC)')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Visão geral operacional da plataforma para superadministradores' })
  @ApiResponse({ status: 200, description: 'Status operacional do sistema.' })
  async getSystemOverview() {
    return this.adminService.getSystemOverview();
  }
}

