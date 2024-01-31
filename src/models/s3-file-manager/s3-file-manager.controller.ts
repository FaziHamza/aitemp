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
  UseInterceptors,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
// import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { S3FileManagerDto } from './dto/s3-file-manager.dto';
import { S3FileManagerService } from './s3-file-manager.service';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { TokenService } from '../token/token.service';


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
  constructor(private readonly s3FileManagerService: S3FileManagerService, private readonly tokenService: TokenService) { }

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
    @Body() fileUploadBodyDto: S3FileManagerDto, @Headers('authorization') authHeader: string
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
      const { organizationId, applicationId, userId, username } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
      const data = await this.s3FileManagerService.s3FileUpload(
        // fileData,
        image,
        // userPayload,
        fileUploadBodyDto, username, organizationId, applicationId, userId
      );
      return { message: 'successful', result: data?.message, path: data?.path };
    } catch (error) {
      console.log(error);
    }
  }

  //get all files of an user
  @Get()
  async listAllFiles(@Headers('authorization') authHeader: string) {
    // let userPayload = {id:query.id};
    const { organizationId, applicationId, userId, username } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    const data = await this.s3FileManagerService.listAllS3Files(organizationId, applicationId, userId,);
    return { message: 'successful', result: data };
  }
  //get all files of an user
  @Get('getParentFolders')
  async listParentFolders(@Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    // let userPayload = {id:query.id};
    const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return await this.s3FileManagerService.listParentFolders(organizationId, applicationId, userId,);
  }
  //get all files of an user
  @Get('folderwithFiles/:parentId')
  async listObjectsInFolder(@Param('parentId') parentId: any, @Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    // let userPayload = {id:query.id};
    const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return await this.s3FileManagerService.getDetailsOfAllFilesInFolder(parentId, organizationId, applicationId, userId,);
  }

  @Get('single')
  async listByFolder(
    @Query() query, @Headers('authorization') authHeader: string
    // @Body() fileUploadBodyDto: S3FileManagerDto,
    // @UserPayload() userPayload: UserPayloadInterface,
  ) {
    const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);

    const data = await this.s3FileManagerService.listAllS3Files(
      // userPayload,
      query.path, organizationId, applicationId, userId,
    );
    return { message: 'successful', result: data };
  }

  @Post('deleteFile')
  async deleteFile(@Body() body: any, @Headers('authorization') authHeader: string) {
    console.log(JSON.stringify(body));
    const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return await this.s3FileManagerService.deleteFile(body._id, organizationId, applicationId, userId);
  }
  @Get('createUserFolder')
  async createUserFolder(@Headers('authorization') authHeader: string) {
    const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return await this.s3FileManagerService.createUserFolder(organizationId, applicationId, userId);
  }
  @Get('getRecordsBySharedEmail')
  async getRecordsBySharedEmail(@Headers('authorization') authHeader: string) {
    const { username } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return await this.s3FileManagerService.getRecordsBySharedEmail(username);
  }
  @Post('deleteFolder')
  async deleteFolder(@Body() body: any, @Headers('authorization') authHeader: string) {
    console.log(JSON.stringify(body));
    const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return await this.s3FileManagerService.deleteFolder(body._id, organizationId, applicationId, userId,);
  }
  @Put('updateFileInfo/:id')
  async updateFileInfo(@Param('id') id: any, @Body() body: any, @Headers('authorization') authHeader: string) {
    console.log(JSON.stringify(body));
    const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return await this.s3FileManagerService.updateFileInfo(id, body, organizationId, applicationId, userId,);
  }
  @Post('createfolder')
  async createSubfolder(@Body() body: any, @Headers('authorization') authHeader: string) {
    const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return await this.s3FileManagerService.createSubfolder(body, organizationId, applicationId, userId);
  }

  @Delete()
  async removeFile(
    @Query() query, @Headers('authorization') authHeader: string
    // @Body() removePathDto: S3FileManagerDto,
    // @UserPayload() userPayload: UserPayloadInterface,
  ) {
    //check path
    const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    const pathCheck = path.extname(query.path);
    if (!pathCheck) {
      throw new BadRequestException('Unknown file!');
    }
    const data = await this.s3FileManagerService.removeFile(
      query.path, organizationId, applicationId, userId,
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
