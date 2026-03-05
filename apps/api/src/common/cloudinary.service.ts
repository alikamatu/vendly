import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

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
        // WhatsApp-like optimization: auto quality and auto format (WebP/AVIF)
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
          if (!result) return reject(new Error('Upload failed: result is undefined'));
          resolve(result);
        },
      );

      upload.end(file.buffer);
    });
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
          if (!result) return reject(new Error('Video upload failed: result is undefined'));
          resolve(result);
        },
      );

      upload.end(file.buffer);
    });
  }
}
