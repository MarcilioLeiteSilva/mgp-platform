import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PlayScraperEngineService } from '../services/play-scraper-engine.service';
import {
  GetAppQueryDto,
  GetDeveloperAppsQueryDto,
  GetSimilarAppsQueryDto,
  SearchAppsDto,
  SuggestKeywordsDto,
  TopChartsDto,
} from '../dto';
import {
  PlayAppMetadata,
  PlayCategoryItem,
  PlaySearchResultItem,
} from '../types/google-play.types';

@ApiTags('ASO — Motor de Coleta Google Play')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('aso/scraper')
export class PlayScraperController {
  constructor(private readonly scraperService: PlayScraperEngineService) {}

  @Get('app/:appId')
  @ApiOperation({
    summary: 'Coleta metadados completos de um aplicativo (Play Store)',
    description:
      'Retorna metadados detalhados (título, descrição, notas, downloads, prints, categoria, etc.) com cache inteligente de 24h e resiliência via Redis.',
  })
  @ApiParam({
    name: 'appId',
    description: 'Package name do aplicativo (ex: com.whatsapp, com.spotify.music)',
    example: 'com.whatsapp',
  })
  @ApiResponse({
    status: 200,
    description: 'Metadados completos do aplicativo retornados com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Aplicativo não encontrado na Google Play Store.',
  })
  async getApp(
    @Param('appId') appId: string,
    @Query() query: GetAppQueryDto,
  ): Promise<PlayAppMetadata> {
    return this.scraperService.getApp(appId, {
      country: query.country,
      lang: query.lang,
    });
  }

  @Get('search')
  @ApiOperation({
    summary: 'Busca aplicativos por palavra-chave na Play Store',
    description:
      'Executa busca semântica/textual na loja retornando ranking de aplicativos encontrados para a keyword.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de aplicativos correspondentes ao termo pesquisado.',
  })
  async search(
    @Query() query: SearchAppsDto,
  ): Promise<PlaySearchResultItem[]> {
    return this.scraperService.search(query.term, {
      country: query.country,
      lang: query.lang,
      num: query.num,
    });
  }

  @Get('suggest')
  @ApiOperation({
    summary: 'Sugestões de autocomplete do Google Play para expansão de palavras-chave',
    description:
      'Retorna termos preditivos pesquisados por usuários na barra de busca da Google Play Store.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de termos preditivos sugeridos pela loja.',
  })
  async suggest(
    @Query() query: SuggestKeywordsDto,
  ): Promise<string[]> {
    return this.scraperService.suggest(query.term, {
      country: query.country,
      lang: query.lang,
    });
  }

  @Get('top-charts')
  @ApiOperation({
    summary: 'Rankings e Top Charts por categoria na Play Store',
    description:
      'Consulta os aplicativos mais baixados ou mais rentáveis em coleções TOP_FREE, TOP_PAID ou GROSSING.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ranking de aplicativos por coleção e categoria.',
  })
  async getTopCharts(
    @Query() query: TopChartsDto,
  ): Promise<PlaySearchResultItem[]> {
    return this.scraperService.getTopCharts({
      category: query.category,
      collection: query.collection,
      country: query.country,
      lang: query.lang,
      num: query.num,
    });
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Catálogo oficial de categorias da Google Play Store',
    description:
      'Retorna todas as categorias disponíveis na loja (APPLICATION, GAME, FINANCE, etc.) para filtros no painel.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorias cadastradas na loja.',
  })
  async getCategories(): Promise<PlayCategoryItem[]> {
    return this.scraperService.getCategories();
  }

  @Get('similar/:appId')
  @ApiOperation({
    summary: 'Aplicativos similares e concorrentes diretos',
    description:
      'Retorna a lista de concorrentes identificados pelo algoritmo de recomendação da Google Play.',
  })
  @ApiParam({
    name: 'appId',
    description: 'Package name do aplicativo de referência',
    example: 'com.spotify.music',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de aplicativos similares retornados pela Google Play.',
  })
  async getSimilar(
    @Param('appId') appId: string,
    @Query() query: GetSimilarAppsQueryDto,
  ): Promise<PlaySearchResultItem[]> {
    return this.scraperService.getSimilar(appId, {
      country: query.country,
      lang: query.lang,
    });
  }

  @Get('developer/:devId')
  @ApiOperation({
    summary: 'Portfólio de aplicativos de um desenvolvedor',
    description:
      'Lista todos os aplicativos publicados sob um mesmo ID ou nome de desenvolvedor.',
  })
  @ApiParam({
    name: 'devId',
    description: 'Nome ou identificador do desenvolvedor (ex: WhatsApp LLC, Spotify AB)',
    example: 'Spotify AB',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de aplicativos do desenvolvedor.',
  })
  async getDeveloperApps(
    @Param('devId') devId: string,
    @Query() query: GetDeveloperAppsQueryDto,
  ): Promise<PlaySearchResultItem[]> {
    return this.scraperService.getDeveloperApps(devId, {
      country: query.country,
      lang: query.lang,
      num: query.num,
    });
  }
}

