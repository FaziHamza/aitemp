import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CommonModule } from 'src/common/common/common.module';
import { HashService } from 'src/shared/services/hash/hash.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';
import { JwtService } from '@nestjs/jwt';
import { CommonService } from 'src/shared/services/common/common.service';
import { RecaptchaService } from './recaptcha.service';
import { EmailModule } from '../email/email.module';
import { TokenService } from '../token/token.service';

@Module({
    imports: [CommonModule , EmailModule],
    controllers: [AuthController],
    providers: [AuthService,HashService,JwtService,QueryGenratorService,CommonService,RecaptchaService,TokenService],
    exports:[AuthService,HashService,JwtService,QueryGenratorService,CommonService,RecaptchaService]
})
export class AuthModule {

}
