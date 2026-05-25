import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ContactService } from './contact.service';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

class ContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @MinLength(10)
  message: string;
}

class NewsletterDto {
  @IsEmail()
  email: string;
}

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async submitContact(@Body() body: ContactDto) {
    await this.contactService.submitContact(body);
    return { success: true, message: 'Message sent successfully.' };
  }

  @Post('newsletter')
  @HttpCode(HttpStatus.CREATED)
  async subscribeNewsletter(@Body() body: NewsletterDto) {
    const result = await this.contactService.subscribeNewsletter(body.email);
    return { success: true, ...result };
  }
}
