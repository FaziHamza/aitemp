import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param, Headers,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
// import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { filesMapper } from './create file-mappter';
import { FileManagerApiBody } from './decorator/file-manager-api-body';
import { S3FileManagerDto } from './dto/s3-file-manager.dto';
import { FastifyFilesInterceptor } from './interceptors/fastify-files-interceptor';
import { S3FileManagerService } from './s3-file-manager.service';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';

@ApiTags('File Manager')
@ApiBearerAuth('jwt')
// @UseGuards(JwtAuthGuard)
@Controller({
  //api route path
  path: 's3-file-manager',

  //api route version
  version: '1',
})
export class S3FileManagerController {
  constructor(private readonly s3FileManagerService: S3FileManagerService) { }

  //upload file data
  @ApiConsumes('multipart/formdata')
  @Post()
  //custom api body for swagger
  // @FileManagerApiBody('files')
  //custom interceptor for fastify file upload
  // @UseInterceptors(FastifyFilesInterceptor('files'))
  @UseInterceptors(
    FileInterceptor('image', {
    }),
  )
  async fileUpload(
    // @UploadedFiles() files: Express.Multer.File[],
    @UploadedFile() image,
    @Body() fileUploadBodyDto: S3FileManagerDto, @Headers('User') User: string, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string
    // @UserPayload() userPayload: UserPayloadInterface,
  ) {
    // console.log(req);
    //file mapper for uploaded file
    try {
      console.log('')
      console.log(image);
      // console.log(fileUploadBodyDto);
      // const fileData = filesMapper({ files });
      // let userPayload = {id:'images'};
      const data = await this.s3FileManagerService.s3FileUpload(
        // fileData,
        image,
        // userPayload,
        fileUploadBodyDto, User, organizationId, appId, userId
      );
      return { message: 'successful', result: data?.message, path: data?.path };
    } catch (error) {
      console.log(error);
    }
  }

  //get all files of an user
  @Get()
  async listAllFiles(@Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string) {
    // let userPayload = {id:query.id};
    const data = await this.s3FileManagerService.listAllS3Files(organizationId, appId, userId,);
    return { message: 'successful', result: data };
  }
  //get all files of an user
  @Get('getParentFolders')
  async listParentFolders(@Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<ApiResponse<any>> {
    // let userPayload = {id:query.id};
    return await this.s3FileManagerService.listParentFolders(organizationId, appId, userId,);
  }
  //get all files of an user
  @Get('folderwithFiles/:parentId')
  async listObjectsInFolder(@Param('parentId') parentId: any, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<ApiResponse<any>> {
    // let userPayload = {id:query.id};
    return await this.s3FileManagerService.getDetailsOfAllFilesInFolder(parentId, organizationId, appId, userId,);
  }

  @Get('single')
  async listByFolder(
    @Query() query, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string
    // @Body() fileUploadBodyDto: S3FileManagerDto,
    // @UserPayload() userPayload: UserPayloadInterface,
  ) {
    const data = await this.s3FileManagerService.listAllS3Files(
      // userPayload,
      query.path, organizationId, appId, userId,
    );
    return { message: 'successful', result: data };
  }

  @Post('deleteFile')
  async deleteFile(@Body() body: any, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string) {
    console.log(JSON.stringify(body));
    return await this.s3FileManagerService.deleteFile(body._id, organizationId, appId, userId);
  }
  @Get('createUserFolder')
  async createUserFolder(@Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string) {
    return await this.s3FileManagerService.createUserFolder(organizationId, appId, userId);
  }
  @Get('getRecordsBySharedEmail')
  async getRecordsBySharedEmail(@Headers('User') User: string, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string) {
    return await this.s3FileManagerService.getRecordsBySharedEmail(User);
  }
  @Post('deleteFolder')
  async deleteFolder(@Body() body: any, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string) {
    console.log(JSON.stringify(body));
    return await this.s3FileManagerService.deleteFolder(body._id, organizationId, appId, userId,);
  }
  @Put('updateFileInfo/:id')
  async updateFileInfo(@Param('id') id: any, @Body() body: any, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string) {
    console.log(JSON.stringify(body));
    return await this.s3FileManagerService.updateFileInfo(id, body, organizationId, appId, userId,);
  }
  @Post('createfolder')
  async createSubfolder(@Body() body: any, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string) {
    return await this.s3FileManagerService.createSubfolder(body, organizationId, appId, userId);
  }

  @Delete()
  async removeFile(
    @Query() query, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string
    // @Body() removePathDto: S3FileManagerDto,
    // @UserPayload() userPayload: UserPayloadInterface,
  ) {
    //check path
    const pathCheck = path.extname(query.path);
    if (!pathCheck) {
      throw new BadRequestException('Unknown file!');
    }
    const data = await this.s3FileManagerService.removeFile(
      query.path, organizationId, appId, userId,
      // userPayload,
    );
    return { message: 'successful', result: data };
  }

  @Get('download')
  async downloadFile(
    @Query() query
    // @Body() removePathDto: S3FileManagerDto,
    // @UserPayload() userPayload: UserPayloadInterface,
  ) {
    //check path
    const pathCheck = path.extname(query.path);
    if (!pathCheck) {
      throw new BadRequestException('Unknown file!');
    }
    const data = await this.s3FileManagerService.downloadFile(
      query.path,
      // userPayload,
    );
    return { message: 'successful', result: data };
  }
}
