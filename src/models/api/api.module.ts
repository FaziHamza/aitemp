import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { AppService } from 'src/app.service';
import { CommonModule } from 'src/common/common/common.module';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';
import { HashService } from 'src/shared/services/hash/hash.service';
import { CommonService } from 'src/shared/services/common/common.service';
import { EmailService } from '../email/email.service';
import { EmailModule } from '../email/email.module';
import { TokenService } from '../token/token.service';

@Module({
  imports:[CommonModule,EmailModule],
  controllers: [ApiController],
  providers: [ApiService,AppService,QueryGenratorService,HashService,CommonService,TokenService]
})
export class ApiModule {}
