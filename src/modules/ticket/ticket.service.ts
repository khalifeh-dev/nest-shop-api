import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { UserService } from '../user/user.service';

@Injectable()
export class TicketService {

    constructor (
        private prisma: DatabaseService,
        private userService: UserService
    ) {}

}
