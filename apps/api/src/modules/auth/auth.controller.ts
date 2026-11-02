import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('Autenticação e Identidade')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Cadastra um novo usuário e cria sua organização inicial com carteira contábil',
    description: 'Cria o registro do usuário com senha criptografada, seu tenant inicial com papel de OWNER e emite tokens JWT.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário registrado com sucesso e autenticado.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado na plataforma.' })
  async register(@Body() dto: RegisterDto, @Req() req: any): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, ipAddress, userAgent);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica um usuário existente e emite tokens JWT com rastreamento de sessão',
    description: 'Valida e-mail e senha com Bcrypt e emite um Access Token (15m) e um Refresh Token (7d).',
  })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'E-mail ou senha incorretos.' })
  async login(@Body() dto: LoginDto, @Req() req: any): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renova o access token através da rotação de refresh token',
    description: 'Invalida o refresh token atual, emite um novo par de tokens e detecta tentativas de reuso/roubo de sessão.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados com sucesso.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido, expirado ou com reuso detectado.',
  })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: any,
  ): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshToken(dto.refreshToken, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Revoga o refresh token e encerra a sessão ativa',
  })
  @ApiResponse({ status: 200, description: 'Sessão encerrada com sucesso.' })
  async logout(@Body() dto: Partial<RefreshTokenDto>) {
    return this.authService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Retorna o perfil do usuário logado e suas organizações vinculadas',
  })
  @ApiResponse({ status: 200, description: 'Perfil do usuário retornado com sucesso.' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
