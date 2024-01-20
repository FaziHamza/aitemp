import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes } from '@nestjs/swagger';
import { filesMapper } from './create file-mappter';
import { FileManagerApiBody } from './decorator/file-manager-api-body';
import { FileManagerDto } from './dto/file-manager.dto';
import { FastifyFilesInterceptor } from './interceptors/fastify-files-interceptor';
import { FileManagerService } from './file-manager.service';
import * as path from 'path';
import { UserPayloadInterface } from './interfaces/user-payload.interface';
import { UserPayload } from './decorator/user.payload.decorator';

//   @ApiTags('File Manager')
//   @ApiBearerAuth('jwt')
//   @UseGuards(JwtAuthGuard)
//   @Controller({
//     //api route path
//     path: 'file-manager',

//     //api route version
//     version: '1',
//   })
@Controller('file-manager')
export class FileManagerController {
  constructor(private readonly FileManagerService: FileManagerService) { }

  //upload file data
  @ApiConsumes('multipart/formdata')
  @Post()
  //custom api body for swagger
  @FileManagerApiBody('files')
  //custom interceptor for fastify file upload
  @UseInterceptors(FastifyFilesInterceptor('files'))
  async fileUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() fileUploadBodyDto: FileManagerDto,
    @UserPayload() userPayload: UserPayloadInterface,
  ) {
    // console.log(req);
    //file mapper for uploaded file
    const fileData = filesMapper({ files });
    const data = await this.FileManagerService.FileUpload(
      fileData,
      userPayload,
      fileUploadBodyDto,
    );
    return { message: 'successful', result: data };
  }

  //get all files of an user
  @Get()
  async listAllFiles(@UserPayload() userPayload: UserPayloadInterface) {
    const data = await this.FileManagerService.listAllFiles(userPayload);
    return { message: 'successful', result: data };
  }

  @Post('single')
  async listByFolder(
    @Body() fileUploadBodyDto: FileManagerDto,
    @UserPayload() userPayload: UserPayloadInterface,
  ) {
    const data = await this.FileManagerService.listAllFiles(
      userPayload,
      fileUploadBodyDto.path,
    );
    return { message: 'successful', result: data };
  }

  @Post('remove')
  async removeFile(
    @Body() removePathDto: FileManagerDto,
    @UserPayload() userPayload: UserPayloadInterface,
  ) {
    //check path
    const pathCheck = path.extname(removePathDto.path);
    if (!pathCheck) {
      throw new BadRequestException('Unknown file!');
    }
    const data = await this.FileManagerService.removeFile(
      removePathDto.path,
      userPayload,
    );
    return { message: 'successful', result: data };
  }

  @Post('download')
  async downloadFile(
    @Body() removePathDto: FileManagerDto,
    @UserPayload() userPayload: UserPayloadInterface,
  ) {
    //check path
    const pathCheck = path.extname(removePathDto.path);
    if (!pathCheck) {
      throw new BadRequestException('Unknown file!');
    }
    const data = await this.FileManagerService.downloadFile(
      removePathDto.path,
      userPayload,
    );
    return { message: 'successful', result: data };
  }
}
