import { Module } from '@nestjs/common';
import { PageService } from './page.service';
import { CommonModule } from 'src/common/common/common.module';
import { PageController } from './page.controller';
import { AppService } from 'src/app.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';
import { HashService } from 'src/shared/services/hash/hash.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports:[CommonModule,EmailModule],
  controllers: [PageController],
  providers: [PageService,AppService,QueryGenratorService,HashService]
})
export class PageModule {}
