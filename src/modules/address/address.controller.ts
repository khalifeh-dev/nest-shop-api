import { Body, Controller, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { AddressService } from './address.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateAddressDto } from './dto/create-address.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
  @ApiOperation({ summary: 'Set address as default' })
  public async setDefault(
    @CurrentUser('sub') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.addressService.setDefault(addressId, userId);
  }
}
