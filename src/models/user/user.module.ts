import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common/common.module';
import { HashService } from 'src/shared/services/hash/hash.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';
import { JwtService } from '@nestjs/jwt';
import { CommonService } from 'src/shared/services/common/common.service';
import { UserController } from './user.comtroller';
import { UserService } from './user.service';
import { TokenService } from '../token/token.service';
import { AuthService } from '../auth/auth.service';
import { RecaptchaService } from '../auth/recaptcha.service';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [CommonModule,EmailModule],
    controllers: [UserController],
    providers: [UserService,AuthService,TokenService,HashService,JwtService,QueryGenratorService]
})
export class UserModule {}
