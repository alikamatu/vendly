import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

/** In-memory upload. Matches Multer memory storage without depending on its global types. */
export interface CloudinaryUpload {
  buffer: Buffer;
}

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
    file: CloudinaryUpload,
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

  private detectImageMimeFromBuffer(buffer: Buffer): string | null {
    if (buffer.length < 12) return null;
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }
    // GIF: GIF87a / GIF89a
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return 'image/gif';
    }
    // WebP: RIFF....WEBP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }
    // AVIF / HEIC: ....ftypavif / ftypheic
    if (
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70
    ) {
      return 'image/avif';
    }
    return null;
  }

  /**
   * Safely downloads a remote HTTPS image (from storefronts, Shopify, WooCommerce,
   * WhatsApp / Meta CDN, etc.) and mirrors it into Verndly's Cloudinary bucket so
   * hotlink rules or expiring URLs never break imported product listings.
   */
  async uploadImageFromUrl(
    imageUrl: string,
    folder: string = 'vendly_products',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const cleanedInput = (imageUrl || '').trim().replace(/&amp;/gi, '&');

    let parsed: URL;
    try {
      const normalized = cleanedInput.startsWith('//')
        ? `https:${cleanedInput}`
        : cleanedInput;
      parsed = new URL(normalized);
      if (parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
      }
      // Unwrap Next.js /_next/image?url=... wrapper if present
      if (parsed.pathname === '/_next/image') {
        const inner = parsed.searchParams.get('url');
        if (inner) {
          parsed = new URL(inner, parsed.origin);
          if (parsed.protocol === 'http:') parsed.protocol = 'https:';
        }
      }
    } catch {
      throw new Error('Invalid image URL');
    }

    if (parsed.protocol !== 'https:') {
      throw new Error('Only HTTPS image URLs are supported');
    }

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      !host ||
      !host.includes('.') ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.localhost') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      throw new Error('Private or local image hosts are not allowed');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14_000);
    try {
      const response = await fetch(parsed.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept:
            'image/webp,image/jpeg,image/png,image/avif,image/*;q=0.9,*/*;q=0.5',
          Referer: `${parsed.origin}/`,
        },
      });

      if (!response.ok) {
        // Fallback to Cloudinary remote URL upload when origin blocks server fetch (e.g. 403/406/429)
        if ([401, 403, 406, 429].includes(response.status)) {
          return await cloudinary.uploader.upload(parsed.toString(), {
            folder,
            quality: 'auto',
            fetch_format: 'auto',
          });
        }
        throw new Error(`Remote image fetch failed (${response.status})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Remote image is empty');
      }
      if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
        throw new Error('Remote image exceeds 15 MB limit');
      }

      const buffer = Buffer.from(arrayBuffer);
      const headerMime = (response.headers.get('content-type') || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      const sniffedMime = this.detectImageMimeFromBuffer(buffer);
      const effectiveMime = headerMime.startsWith('image/')
        ? headerMime
        : sniffedMime;

      if (!effectiveMime || effectiveMime === 'image/svg+xml') {
        throw new Error('Remote URL did not return a valid product photo');
      }

      return await this.uploadImage({ buffer }, folder);
    } finally {
      clearTimeout(timer);
    }
  }

  async uploadVideo(
    file: CloudinaryUpload,
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
