import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdminSubscriberQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

export class AddSubscriberDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

@Controller('admin/newsletter')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class NewsletterAdminController {
  constructor(private readonly contactService: ContactService) {}

  @Get('subscribers')
  async listSubscribers(@Query() query: AdminSubscriberQueryDto) {
    return this.contactService.listSubscribers(query);
  }

  @Get('stats')
  async getStats() {
    return this.contactService.getNewsletterStats();
  }

  @Post('subscribers')
  @HttpCode(HttpStatus.CREATED)
  async addSubscriber(@Body() body: AddSubscriberDto) {
    return this.contactService.subscribeNewsletter(body.email);
  }

  @Patch('subscribers/:id/toggle')
  async toggleStatus(@Param('id') id: string) {
    return this.contactService.toggleSubscriberStatus(id);
  }

  @Delete('subscribers/:id')
  async deleteSubscriber(@Param('id') id: string) {
    return this.contactService.deleteSubscriber(id);
  }
}
