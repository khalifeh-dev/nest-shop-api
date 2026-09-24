import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateAddressDto } from './dto/create-address.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Address')
@ApiBearerAuth()
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new address' })
  public async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressService.create(dto, userId);
  }

  @Patch(':id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set address as default' })
  public async setDefault(
    @CurrentUser('sub') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.addressService.setDefault(addressId, userId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update address' })
  public async update(
    @CurrentUser('sub') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return await this.addressService.update(dto, addressId, userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find one address' })
  public async findOne(
    @CurrentUser('sub') userId: string,
    @Param('id') addressId: string,
  ) {
    return await this.addressService.findOne(userId, addressId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove address' })
  public async remove(
    @CurrentUser('sub') userId: string,
    @Param('id') addressId: string,
  ) {
    return await this.addressService.remove(addressId, userId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find all address' })
  public async findAll(@CurrentUser('sub') userId: string) {
    // return await this.addressService.findAll(userId)
  }
}
