import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginRequestDto, RegisterRequestDto, RefreshTokenRequestDto } from '@mgp/contracts';

@ApiTags('Autenticação e Identidade')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Cadastra um novo usuário e cria sua organização inicial' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso.' })
  async register(@Body() dto: RegisterRequestDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica um usuário existente e emite tokens JWT' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso.' })
  async login(@Body() dto: LoginRequestDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova access token através da rotação de refresh token' })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso.' })
  async refreshToken(@Body() dto: RefreshTokenRequestDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoga o refresh token e encerra a sessão ativa' })
  @ApiResponse({ status: 200, description: 'Logout realizado.' })
  async logout() {
    return this.authService.logout();
  }
}

