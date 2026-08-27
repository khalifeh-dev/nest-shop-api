import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';

@Injectable()
export class CommentService {

    constructor (
        private prisma: DatabaseService,
        @Inject('LoggerService') private logger: LoggerService,
    ) {}

}
