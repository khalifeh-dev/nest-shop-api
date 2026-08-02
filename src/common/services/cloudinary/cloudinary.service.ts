import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary-response';
import streamifier from 'streamifier';
import { Multer } from 'multer';
import type { LoggerService } from '../logger/logger-options.interface';
import { ErrorUtil } from '../../utils/error.util';

@Injectable()
export class CloudinaryService {
  constructor(@Inject('LoggerService') private logger: LoggerService) {}

  public async uploadFile(
    file: Express.Multer.File,
    options: {
      folder?: string;
      publicId?: string;
      transformation?: any[];
      tags?: string[];
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
    } = {},
  ): Promise<CloudinaryResponse> {
    this.logger.info(`📷 User uploading a file`, 'CloudinaryService');

    if (!file || !file.buffer) {
      this.logger.warn(`⚠️ You didn't send the file`, 'CloudinaryService');
      throw new BadRequestException('File is required');
    }

    const maxSize = 10_485_760; // 10 * 1024 * 1024 -> 10MB
    if (file.size > maxSize) {
      this.logger.warn(
        `⚠️ The file size must be less than 10 MB`,
        'CloudinaryService',
      );
      throw new BadRequestException(
        `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
      );
    }

    const upload = new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'uploads',
          public_id: options.publicId,
          transformation: options.transformation || [],
          tags: options.tags || [],
          resource_type: options.resourceType || 'auto',

          use_filename: true,
          unique_filename: true,
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            const message = ErrorUtil.getMessage(error);
            console.error('Cloudinary upload error:', error);
            this.logger.error(
              `⛔ Upload error: ${message}`,
              'CloudinaryService',
            );
            return reject(
              new BadRequestException('Failed to upload file to Cloudinary'),
            );
          }

          if (!result) {
            this.logger.error(
              `⛔ Upload error: no result returned`,
              'CloudinaryService',
            );
            return reject(
              new BadRequestException('Upload failed: No result returned'),
            );
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });

    this.logger.info(`✅ File uploaded`, 'CloudinaryService');

    return upload;
  }

  public async uploadImage(
    file: Express.Multer.File,
    folder: string = 'images',
  ): Promise<CloudinaryResponse> {
    const upload = this.uploadFile(file, {
      folder,
      resourceType: 'image',
      transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
    });

    this.logger.info(`🔗 Upload a image`, 'CloudinaryService');
    return upload;
  }

  public async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<CloudinaryResponse> {
    const upload = this.uploadFile(file, {
      folder: `users/${userId}/avatar`,
      publicId: `avatar_${userId}`,
      resourceType: 'image',
      transformation: [
        { width: 300, height: 300, crop: 'thumb', gravity: 'face' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });

    this.logger.info(`📷 Upload a avatar`, 'CloudinaryService');

    return upload;
  }

  public async uploadUserImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<CloudinaryResponse> {
    const upload = this.uploadFile(file, {
      folder: `users/${userId}/images`,
      resourceType: 'image',
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });

    this.logger.info(`📷 Upload a image for user`, 'CloudinaryService');

    return upload;
  }

  public async deleteFile(publicId: string): Promise<void> {
    try {
      this.logger.info(`✅ Deleting a file`, 'CloudinaryService');
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result !== 'ok') {
        this.logger.warn(`⚠️ Failed to deleting file`, 'CloudinaryService');
        throw new BadRequestException('Failed to delete file from Cloudinary');
      }
    } catch (error) {
      const message = ErrorUtil.getMessage(error);
      this.logger.error(`⛔ Delete error: ${message}`, 'CloudinaryService');
      throw new BadRequestException('Failed to delete file from Cloudinary');
    }
  }

  public async updateFile(
    oldPublicId: string,
    newFile: Express.Multer.File,
    options: {
      folder?: string;
      publicId?: string;
    } = {},
  ): Promise<CloudinaryResponse> {
    this.logger.info(`✅ Updateing a file`, 'CloudinaryService');
    if (oldPublicId) {
      this.logger.info(`🗡️ Delete old file`, 'CloudinaryService');
      await this.deleteFile(oldPublicId);
    }

    this.logger.info(`✅ Replacing the file`, 'CloudinaryService');

    return this.uploadFile(newFile, options);
  }

  public getImageUrl(publicId: string, transformations?: any[]): string {
    this.logger.info(`✅ Get image url`, 'CloudinaryService');

    const result = cloudinary.url(publicId, {
      transformation: transformations || [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });

    return result;
  }

  public getAvatarUrl(publicId: string, size: number = 200): string {
    this.logger.info(`✅ Get avatar url`, 'CloudinaryService');

    const result = cloudinary.url(publicId, {
      transformation: [
        { width: size, height: size, crop: 'thumb', gravity: 'face' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });

    return result;
  }
}
