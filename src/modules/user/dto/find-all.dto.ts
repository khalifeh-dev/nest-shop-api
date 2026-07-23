import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus } from '@prisma/client';

export class FindAllUserDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'BLOCKED', 'DELETED'])
  userStatus?: UserStatus;

  @IsOptional()
  @IsString()
  deletedBy?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDeleted?: boolean;
}