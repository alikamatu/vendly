import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import {
  WebsiteImportMode,
  WebsiteImportService,
} from './website-import.service';
import { WhatsAppCommitItemInput } from './whatsapp-catalog.service';

@Controller('products/website-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER', 'ADMIN')
export class WebsiteImportController {
  constructor(private readonly websiteImport: WebsiteImportService) {}

  @Post('preview')
  async preview(@Body() body: { url?: string; mode?: WebsiteImportMode }) {
    const mode: WebsiteImportMode =
      body?.mode === 'single' || body?.mode === 'catalog' ? body.mode : 'auto';
    return this.websiteImport.previewWebsite(body?.url || '', mode);
  }

  @Get('image-proxy')
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    const { buffer, contentType } =
      await this.websiteImport.fetchProxiedPreviewImage(url || '');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(buffer);
  }

  @Post('commit')
  async commit(
    @Request() req: { user: { id: string } },
    @Body() body: { items?: WhatsAppCommitItemInput[] },
  ) {
    return this.websiteImport.commitImport(req.user.id, body?.items || []);
  }
}
