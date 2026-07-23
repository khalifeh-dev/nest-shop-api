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
  @ApiQuery({ name: 'search', required: false, type: String, example: "" })
  @ApiQuery({ name: 'email', required: false, type: String, example: "" })
  @ApiQuery({ name: 'firstName', required: false, type: String, example: "" })
  @ApiQuery({ name: 'lastName', required: false, type: String, example: "" })
  @ApiQuery({ name: 'userName', required: false, type: String, example: "" })
  @ApiQuery({ name: 'userStatus', required: false, type: String, example: "" })
  @ApiQuery({ name: 'deletedBy', required: false, type: String, example: "" })
  @ApiQuery({ name: 'isDeleted', required: false, type: String, example: "" })
  public async findAll(
    @Query() dto: FindAllUserDto
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
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    req.user = { id: 'cmrewdsc20000d8v3clokr3ak' };
    return await this.userService.uploadAvatar(file, req?.user.id);
  }

  @Delete('remove_avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove user avatar' })
  public async removeAvatar(@Request() req) {
    req.user = { id: 'cmrewdsc20000d8v3clokr3ak' };
    return this.userService.removeAvatar(req.user.id);
  }

  @Get('user_images')
  @ApiOperation({ summary: 'Get user all images' })
  @HttpCode(HttpStatus.OK)
  public async getUserImages(@Request() req) {
    return await this.userService.getUserImages(req.user.id);
  }

  @Get('user_devices')
  @ApiOperation({ summary: 'Get user all devices' })
  @HttpCode(HttpStatus.OK)
  public async getUserDevices(@Request() req) {
    return await this.userService.getUserDevices(req?.user.id);
  }

  @Get('user_devices/:deviceId')
  @ApiOperation({ summary: 'Get all user images' })
  @HttpCode(HttpStatus.OK)
  public async getDevicesDetails(
    @Request() req,
    @Param('deviceId') deviceId: string,
  ) {
    return await this.userService.getDeviceDetails(req?.user.id, deviceId);
  }

  @Delete('account/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove user account' })
  public async softDeleteMyAccount(@Request() req, @Body() reason?: string) {
    return await this.userService.softDeleteUser(req?.user.id, reason);
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
  public async restoreMyAccount(@Request() req) {
    return await this.userService.restoreUser(req?.user.id);
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
}
