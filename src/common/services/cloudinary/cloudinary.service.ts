import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary-response';
import streamifier from 'streamifier';
import { Multer } from 'multer';
import type { LoggerService } from '../logger/logger-options.interface';
import { ErrorUtil } from '../../utils/error.util';

interface Transformation {
  folder?: string;
  publicId?: string;
  transformation?: any[];
  tags?: string[];
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

@Injectable()
export class CloudinaryService {
  public maxSize: number;

  constructor(@Inject('LoggerService') private logger: LoggerService) {
    this.maxSize = 10_485_760; // 10 * 1024 * 1024 -> 10MB
  }

  public async uploadFile(
    file: Express.Multer.File,
    options: Transformation = {},
  ): Promise<CloudinaryResponse> {
    this.logger.info(`📷 User uploading a file`, 'CloudinaryService');

    if (!file || !file.buffer) {
      this.logger.warn(`⚠️ You didn't send the file`, 'CloudinaryService');
      throw new BadRequestException('File is required');
    }

    if (file.size > this.maxSize) {
      this.logger.warn(
        `⚠️ The file size must be less than 10 MB`,
        'CloudinaryService',
      );
      throw new BadRequestException(
        `File size exceeds ${this.maxSize / 1024 / 1024}MB limit`,
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

  public async uploadProductImages(
    files: Express.Multer.File[],
    productId: string,
    options: {
      maxImages?: number;
      minImages?: number;
      transformation?: any[];
    } = {},
  ): Promise<CloudinaryResponse[]> {
    const startTime = Date.now();
    const maxImages = options.maxImages || 10;
    const minImages = options.minImages || 1;

    this.logger.info(
      `📷 Uploading ${files.length} images for product: ${productId}`,
      'CloudinaryService',
    );

    if (!files || files.length === 0) {
      this.logger.warn(
        `⚠️ No images provided for product: ${productId}`,
        'CloudinaryService',
      );
      throw new BadRequestException('At least one image is required');
    }

    if (files.length < minImages) {
      this.logger.warn(
        `⚠️ Minimum ${minImages} image(s) required, got ${files.length}`,
        'CloudinaryService',
      );
      throw new BadRequestException(
        `Minimum ${minImages} image(s) required for product`,
      );
    }

    if (files.length > maxImages) {
      this.logger.warn(
        `⚠️ Maximum ${maxImages} images allowed, got ${files.length}`,
        'CloudinaryService',
      );
      throw new BadRequestException(
        `Maximum ${maxImages} images allowed for product`,
      );
    }

    for (const file of files) {
      if (file.size > this.maxSize) {
        this.logger.warn(
          `⚠️ File ${file.originalname} exceeds 10MB limit`,
          'CloudinaryService',
        );
        throw new BadRequestException(
          `File ${file.originalname} exceeds 10MB limit`,
        );
      }
    }

    const uploadPromises = files.map((file, index) => {
      const publicId = `products/${productId}/image_${index + 1}`;
      const isMain = index === 0;

      return this.uploadFile(file, {
        folder: `products/${productId}`,
        publicId,
        resourceType: 'image',
        transformation: options.transformation || [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { width: 800, height: 800, crop: 'limit' },
        ],
      }).then((result) => ({
        ...result,
        isMain,
        order: index + 1,
        originalName: file.originalname,
      }));
    });

    const results = await Promise.all(uploadPromises);

    const duration = Date.now() - startTime;
    this.logger.info(
      `✅ ${results.length} images uploaded for product: ${productId} (${duration}ms)`,
      'CloudinaryService',
    );

    return results;
  }

  public async uploadProductImage(
    file: Express.Multer.File,
    productId: string,
    isMain: boolean = false,
  ): Promise<CloudinaryResponse & { isMain: boolean; order: number }> {
    this.logger.info(
      `📷 Uploading ${isMain ? 'main' : ''} image for product: ${productId}`,
      'CloudinaryService',
    );

    const result = await this.uploadFile(file, {
      folder: `products/${productId}`,
      resourceType: 'image',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
        { width: 800, height: 800, crop: 'limit' },
      ],
    });

    return {
      ...result,
      isMain,
      order: isMain ? 0 : 1,
    };
  }

  public async deleteProductImages(
    productId: string,
  ): Promise<{ deleted: number }> {
    this.logger.info(
      `🗑️ Deleting all images for product: ${productId}`,
      'CloudinaryService',
    );

    try {
      const result = await cloudinary.api.delete_resources_by_prefix(
        `products/${productId}`,
      );

      const deletedCount = Object.keys(result.deleted).length;

      this.logger.info(
        `✅ Deleted ${deletedCount} images for product: ${productId}`,
        'CloudinaryService',
      );

      return { deleted: deletedCount };
    } catch (error) {
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `⛔ Failed to delete images for product ${productId}: ${message}`,
        'CloudinaryService',
      );
      throw new BadRequestException('Failed to delete product images');
    }
  }

  public getProductImageUrls(
    publicId: string,
    sizes: { width: number; height: number }[] = [
      { width: 100, height: 100 }, // thumbnail
      { width: 300, height: 300 }, // small
      { width: 600, height: 600 }, // medium
      { width: 1200, height: 1200 }, // large
    ],
  ): {
    original: string;
    thumbnails: { width: number; height: number; url: string }[];
  } {
    this.logger.debug(
      `🔗 Generating image URLs for: ${publicId}`,
      'CloudinaryService',
    );

    const original = cloudinary.url(publicId, {
      quality: 'auto:good',
      fetch_format: 'auto',
    });

    const thumbnails = sizes.map(({ width, height }) => ({
      width,
      height,
      url: cloudinary.url(publicId, {
        transformation: [
          { width, height, crop: 'fill' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      }),
    }));

    return {
      original,
      thumbnails,
    };
  }
}
