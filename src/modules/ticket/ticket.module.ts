import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
