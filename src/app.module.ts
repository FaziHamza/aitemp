import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common/common.module';
import { ApiModule } from './models/api/api.module';
import { AuthModule } from './models/auth/auth.module';
import { PageModule } from './models/page/page.module';
import { CrudModule } from './models/crud/crud.module';
import { EmailModule } from './models/email/email.module';
import { S3FileManagerModule } from './models/s3-file-manager/s3-file-manager.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { EMAIL_CONFIG } from './shared/config/global-db-config';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [AuthModule,ApiModule,PageModule,CrudModule , EmailModule , S3FileManagerModule,
    MulterModule.register({
      dest: './uploads', // Specify the directory where uploaded files will be stored.
    }),
    MailerModule.forRoot({
      transport: {
        host: EMAIL_CONFIG.EMAIL.host,
        port: EMAIL_CONFIG.EMAIL.port,
        secure: EMAIL_CONFIG.EMAIL.secure, // true for 465, false for other ports
        auth: {
          user: EMAIL_CONFIG.EMAIL.user, // generated ethereal user
          pass: EMAIL_CONFIG.EMAIL.pass // generated ethereal password
        },
      },
      defaults: {
        from: EMAIL_CONFIG.EMAIL.from, // outgoing email ID
      }
    }),],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
