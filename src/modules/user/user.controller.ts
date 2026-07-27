import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  Query,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Pagination } from '../../common/types/pagination.type';
import { SanitizeUser } from '../../common/types/user.type';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserAction } from '../../common/constants/user.constant';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';
import { FindAllUserDto } from './dto/find-all.dto';
import { GetUserNotificationsDto } from '../../common/services/notification/dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationPriority } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private userService: UserService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @HttpCode(HttpStatus.CREATED)
  public async create(@Body() dto: CreateUserDto): Promise<SanitizeUser> {
    return await this.userService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'search', required: false, type: String, example: '' })
  @ApiQuery({ name: 'email', required: false, type: String, example: '' })
  @ApiQuery({ name: 'firstName', required: false, type: String, example: '' })
  @ApiQuery({ name: 'lastName', required: false, type: String, example: '' })
  @ApiQuery({ name: 'userName', required: false, type: String, example: '' })
  @ApiQuery({ name: 'userStatus', required: false, type: String, example: '' })
  @ApiQuery({ name: 'deletedBy', required: false, type: String, example: '' })
  @ApiQuery({ name: 'isDeleted', required: false, type: String, example: '' })
  public async findAll(
    @Query() dto: FindAllUserDto,
  ): Promise<Pagination<SanitizeUser>> {
    const data = await this.userService.findAll(dto);

    const { data: allData, limit: lim, page: pg, total, pages } = data;

    return {
      data: allData,
      pagination: {
        page: pg,
        limit: lim,
        total,
        pages,
        hasNext: pg < pages,
        hasPrev: pg > 1,
        nextPage: pg < pages ? pg + 1 : null,
        prevPage: pg > 1 ? pg - 1 : null,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @HttpCode(HttpStatus.OK)
  public async findOne(@Param('id') id: string): Promise<SanitizeUser> {
    return await this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @HttpCode(HttpStatus.OK)
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<SanitizeUser> {
    return await this.userService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a user' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @HttpCode(HttpStatus.OK)
  public async remove(@Param('id') id: string): Promise<SanitizeUser> {
    return await this.userService.remove(id);
  }

  @Post('upload_avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload user avatar',
    description: 'Upload a new avatar image for the current user',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  public async uploadAvatar(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.userService.uploadAvatar(file, userId);
  }

  @Delete('remove_avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove user avatar' })
  public async removeAvatar(@CurrentUser('sub') userId: string) {
    return this.userService.removeAvatar(userId);
  }

  @Get('user_images')
  @ApiOperation({ summary: 'Get user all images' })
  @HttpCode(HttpStatus.OK)
  public async getUserImages(@CurrentUser('sub') userId: string) {
    return await this.userService.getUserImages(userId);
  }

  @Get('user_devices')
  @ApiOperation({ summary: 'Get user all devices' })
  @HttpCode(HttpStatus.OK)
  public async getUserDevices(@CurrentUser('sub') userId: string) {
    return await this.userService.getUserDevices(userId);
  }

  @Get('user_devices/:deviceId')
  @ApiOperation({ summary: 'Get all user images' })
  @HttpCode(HttpStatus.OK)
  public async getDevicesDetails(
    @CurrentUser('sub') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return await this.userService.getDeviceDetails(userId, deviceId);
  }

  @Delete('account/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove user account' })
  public async softDeleteMyAccount(
    @CurrentUser('sub') userId: string,
    @Body() reason?: string,
  ) {
    return await this.userService.softDeleteUser(userId, reason);
  }

  @Delete('user_account/delete/:userId')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiOperation({ summary: 'Remove user account by admin' })
  @HttpCode(HttpStatus.OK)
  public async softDeleteByAdmin(@Param('userId') userId: string) {
    await this.refreshTokenService.revokeAllTokensByDevice(userId);
    return await this.userService.softDeleteUser(
      userId,
      UserAction.ADMIN_DELETE_REASON,
    );
  }

  @Patch('account/restore')
  @ApiOperation({ summary: 'restore user' })
  @HttpCode(HttpStatus.OK)
  public async restoreMyAccount(@CurrentUser('sub') userId: string) {
    return await this.userService.restoreUser(userId);
  }

  @Get('user_account/in_active/:userId')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiOperation({ summary: 'Inactive user account by admin' })
  @HttpCode(HttpStatus.OK)
  public async inActiveUser(@Param('userId') userId: string) {
    return await this.userService.inActiveUser(userId);
  }

  @Get('user_account/ban/:userId')
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiOperation({ summary: 'Ban user account by admin' })
  @HttpCode(HttpStatus.OK)
  public async banUser(@Param('userId') userId: string) {
    await this.refreshTokenService.revokeAllTokensByDevice(userId);
    return await this.userService.banUser(userId);
  }

  @Get('user-notifications')
  @ApiOperation({ summary: 'Get User Notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'search', required: false, type: String, example: '' })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'priority', required: false, type: String, example: NotificationPriority.MEDIUM })
  @ApiQuery({ name: 'fromDate', required: false, type: String, example: '' })
  @ApiQuery({ name: 'toDate', required: false, type: String, example: '' })
  @ApiQuery({ name: 'isBroadcast', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'type', required: false, type: String, example: '' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, example: 'desc' })
  @HttpCode(HttpStatus.OK)
  async getMyNotifications(
    @CurrentUser('sub') userId: string,
    @Query() filters: GetUserNotificationsDto,
  ) {
    return this.userService.getUserNotifications(userId, filters);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get User Notifications Stats' })
  @HttpCode(HttpStatus.OK)
  async getMyNotificationStats(@CurrentUser('sub') userId: string) {
    return this.userService.getUserNotificationStats(userId);
  }
}
