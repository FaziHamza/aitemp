import { Module } from '@nestjs/common';
import { S3FileManagerController } from './s3-file-manager.controller';
import { S3FileManagerService } from './s3-file-manager.service';
import { TokenService } from '../token/token.service';


@Module({
  imports: [
    S3FileManagerModule
  ],
  controllers: [S3FileManagerController],
  providers: [S3FileManagerService , TokenService],
  exports: [S3FileManagerService, S3FileManagerModule]
})
export class S3FileManagerModule { }
