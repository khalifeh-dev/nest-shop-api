import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { UserService } from '../../../modules/user/user.service';

@Injectable()
export class NotificationService {

    private _read;
    private _write;

    constructor (
        private prisma: DatabaseService,
        private userService: UserService,
    ) {
        this._read = this.prisma.replica
        this._write = this.prisma.master
    }

    private async create (dto) {

    }

}

