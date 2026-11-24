import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Request,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import {
  WhatsAppCatalogService,
  WhatsAppCommitItemInput,
} from './whatsapp-catalog.service';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

@Controller('products/whatsapp-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER', 'ADMIN')
export class WhatsAppCatalogController {
  constructor(private readonly whatsappCatalog: WhatsAppCatalogService) {}

  @Post('preview-links')
  async previewLinks(@Body() body: { input?: string }) {
    return this.whatsappCatalog.previewFromLinks(body?.input || '');
  }

  @Post('preview-screenshots')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async previewScreenshots(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Please upload at least one WhatsApp catalog screenshot.',
      );
    }
    return this.whatsappCatalog.previewFromScreenshots(files);
  }

  @Post('preview-csv')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async previewCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException(
        'Please upload a Meta Commerce / WhatsApp catalog CSV file.',
      );
    }
    return this.whatsappCatalog.previewFromCsv(file.buffer);
  }

  @Post('preview-meta')
  async previewMeta(
    @Body() body: { catalogId?: string; accessToken?: string },
  ) {
    return this.whatsappCatalog.previewFromMetaApi(
      body?.catalogId || '',
      body?.accessToken || '',
    );
  }

  @Post('commit')
  async commitImport(
    @Request() req: { user: { id: string } },
    @Body() body: { items?: WhatsAppCommitItemInput[] },
  ) {
    return this.whatsappCatalog.commitImport(req.user.id, body?.items || []);
  }
}
