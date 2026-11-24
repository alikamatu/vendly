import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'vendly',
    options: { vectorize?: boolean; quality?: string } = {},
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const transformations: any = { folder };

      if (options.vectorize) {
        // Convert to SVG using Cloudinary's vectorize effect
        transformations.effect = 'vectorize:colors:3:detail:1.0';
        transformations.fetch_format = 'svg';
      } else {
        // Auto quality and auto format (WebP/AVIF)
        transformations.quality = options.quality || 'auto';
        transformations.fetch_format = 'auto';
      }

      const upload = cloudinary.uploader.upload_stream(
        transformations,
        (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            return reject(error);
          }
          if (!result)
            return reject(new Error('Upload failed: result is undefined'));
          resolve(result);
        },
      );

      upload.end(file.buffer);
    });
  }

  /**
   * Safely downloads a remote HTTPS image (e.g. from WhatsApp / Meta CDN)
   * and mirrors it into Verndly's Cloudinary bucket so expiring CDN URLs
   * never break imported product listings.
   */
  async uploadImageFromUrl(
    imageUrl: string,
    folder: string = 'vendly_products',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      throw new Error('Invalid image URL');
    }

    if (parsed.protocol !== 'https:') {
      throw new Error('Only HTTPS image URLs are supported');
    }

    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      throw new Error('Private or local image hosts are not allowed');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; VerndlyBot/1.0; +https://verndly.com)',
          Accept: 'image/*,*/*;q=0.8',
        },
      });
      if (!response.ok) {
        throw new Error(`Remote image fetch failed (${response.status})`);
      }

      const contentType = (
        response.headers.get('content-type') || ''
      ).toLowerCase();
      if (!contentType.startsWith('image/')) {
        throw new Error('Remote URL did not return an image');
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Remote image is empty');
      }
      if (arrayBuffer.byteLength > 8 * 1024 * 1024) {
        throw new Error('Remote image exceeds 8 MB limit');
      }

      const fakeFile = {
        buffer: Buffer.from(arrayBuffer),
        mimetype: contentType.split(';')[0],
        originalname: 'whatsapp-import.jpg',
      } as Express.Multer.File;

      return await this.uploadImage(fakeFile, folder);
    } finally {
      clearTimeout(timer);
    }
  }

  async uploadVideo(
    file: Express.Multer.File,
    folder: string = 'vendly_videos',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'video',
          // Convert/stream to modern web-friendly format with sane defaults
          format: 'mp4',
          quality: 'auto',
          // Trim to a maximum playback duration of 5 seconds
          transformation: [
            {
              end_offset: 5,
            },
          ],
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Video Upload Error:', error);
            return reject(error);
          }
          if (!result)
            return reject(
              new Error('Video upload failed: result is undefined'),
            );
          resolve(result);
        },
      );

      upload.end(file.buffer);
    });
  }
}
