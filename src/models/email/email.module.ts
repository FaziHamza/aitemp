import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { S3FileManagerModule } from '../s3-file-manager/s3-file-manager.module';
// import { MongooseModule } from '@nestjs/mongoose';
// import { FileManager, FileManagerSchema } from '../s3-file-manager/file-manager.model';
// import { FolderManager, FolderManagerSchema } from '../s3-file-manager/foler-manager.model';


@Module({
  imports: [
  //   MongooseModule.forFeature([
  //   { name: FileManager.name, schema: FileManagerSchema },
  //   { name: FolderManager.name, schema: FolderManagerSchema },
  // ]), 
  S3FileManagerModule],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService, EmailModule,]
})

export class EmailModule { }
