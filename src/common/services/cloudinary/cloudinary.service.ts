import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary-response';
import streamifier from 'streamifier';
import { Multer } from 'multer';

@Injectable()
export class CloudinaryService {

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
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required');
    }

    const maxSize = 10_485_760; // 10 * 1024 * 1024 -> 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
      );
    }

    return new Promise<CloudinaryResponse>((resolve, reject) => {
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
            console.error('Cloudinary upload error:', error);
            return reject(
              new BadRequestException('Failed to upload file to Cloudinary'),
            );
          }

          if (!result) {
            return reject(
              new BadRequestException('Upload failed: No result returned'),
            );
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  public async uploadImage(
    file: Express.Multer.File,
    folder: string = 'images',
  ): Promise<CloudinaryResponse> {
    return this.uploadFile(file, {
      folder,
      resourceType: 'image',
      transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
    });
  }

  public async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<CloudinaryResponse> {
    return this.uploadFile(file, {
      folder: `users/${userId}/avatar`,
      publicId: `avatar_${userId}`,
      resourceType: 'image',
      transformation: [
        { width: 300, height: 300, crop: 'thumb', gravity: 'face' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });
  }

  public async uploadUserImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<CloudinaryResponse> {
    return this.uploadFile(file, {
      folder: `users/${userId}/images`,
      resourceType: 'image',
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });
  }

  public async deleteFile(publicId: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result !== 'ok') {
        throw new BadRequestException('Failed to delete file from Cloudinary');
      }
    } catch (error) {
      console.error('Cloudinary delete error:', error);
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
    if (oldPublicId) {
      await this.deleteFile(oldPublicId);
    }

    return this.uploadFile(newFile, options);
  }

  public getImageUrl(publicId: string, transformations?: any[]): string {
    return cloudinary.url(publicId, {
      transformation: transformations || [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });
  }

  public getAvatarUrl(publicId: string, size: number = 200): string {
    return cloudinary.url(publicId, {
      transformation: [
        { width: size, height: size, crop: 'thumb', gravity: 'face' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });
  }
}
