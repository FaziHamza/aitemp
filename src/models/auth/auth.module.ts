import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CommonModule } from 'src/common/common/common.module';
import { HashService } from 'src/shared/services/hash/hash.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';
import { JwtService } from '@nestjs/jwt';
import { CommonService } from 'src/shared/services/common/common.service';

@Module({
    imports: [CommonModule],
    controllers: [AuthController],
    providers: [AuthService,HashService,JwtService,QueryGenratorService,CommonService]
})
export class AuthModule {

}
