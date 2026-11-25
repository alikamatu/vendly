import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
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

  @Post('commit')
  async commit(
    @Request() req: { user: { id: string } },
    @Body() body: { items?: WhatsAppCommitItemInput[] },
  ) {
    return this.websiteImport.commitImport(req.user.id, body?.items || []);
  }
}
