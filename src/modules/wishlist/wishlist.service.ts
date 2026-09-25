import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { ErrorUtil } from '../../common/utils/error.util';
import { AddToWishlistsDto } from './dto/add-to-wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(private prisma: DatabaseService) {}
}
