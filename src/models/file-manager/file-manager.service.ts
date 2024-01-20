import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import * as path from 'path';
import * as crypto from 'crypto';
// import s3Dir from 'dir';
import AWS from 'aws-sdk';
import { FileManagerDto } from './dto/file-manager.dto';
import { UserPayloadInterface } from './interfaces/user-payload.interface';

@Injectable()
export class FileManagerService {
  private s3Dir: AWS.S3;
  constructor(private readonly configService: ConfigService) {
    this.s3Dir = new AWS.S3();
  }

  //file upload method
  async FileUpload(
    files: Express.Multer.File[],
    userPayload: UserPayloadInterface,
    s3FileUploadDto: FileManagerDto,
  ) {
    let sucessCount = 0;
    const afterUploadData = [];
    //get the bucket name from config
    const s3Bucket = await this.configService.get('S3_BUCKET_NAME');
    //get the s3 config data
    const s3 = await this.getS3Config();
    //set folder name for file upload
    let folderName = `${userPayload.id}`;
    if (s3FileUploadDto && s3FileUploadDto.path) {
      folderName += '/' + s3FileUploadDto.path;
    }
    //prepare parameters for file upload & upload files
    for (let i = 0; i < files.length; i++) {
      //set upload parameter
      const fileNameData = path.basename(
        files[i].originalname,
        path.extname(files[i].originalname),
      );
      //file upload parmas for s3
      const params = {
        Bucket: s3Bucket,
        // ACL: 'public-read',
        Key: `${folderName}/${fileNameData}-${crypto.randomUUID()}${path.extname(
          files[i].originalname,
        )}`,
        Body: Buffer.from(files[i].buffer),
        ContentType: files[i].mimetype,
      };
      //upload file data to s3
      const uploadedInfo = await new Promise((resolve, reject) => {
        //upload file
        s3.upload(params, (err, data) => {
          if (err) {
            //throw error messages
            reject(err.message);
            throw new BadRequestException(`FILE_UPLOAD_FAILED`);
          }
          resolve(data);
        });
      });
      afterUploadData.push(uploadedInfo);
    }
    sucessCount = afterUploadData.length;
    return `Total ${sucessCount} files uploaded successfully!`;
  }

  //list all files
  async listAllFiles(userPayload: UserPayloadInterface, folderName?: string) {
    folderName = folderName ?? userPayload.id;
    const result = await this.listFiles(folderName);
    return result;
  }

  async listFiles(folderName: string) {
    const s3Bucket = await this.configService.get('S3_BUCKET_NAME');
    const s3 = await this.getS3Config();

    const params = {
      Bucket: s3Bucket,
      Delimiter: '/',
      Prefix: folderName,
    };

    try {
      const listedFiles = await s3.listObjectsV2(params).promise();
      const contents = listedFiles.Contents || [];
      const directories = contents
        .filter((obj) => obj.Key !== folderName)
        .map((obj) => {
          const key = obj.Key || '';
          const directory = key.substring(folderName.length).split('/')[0];
          return directory;
        });

      return directories;
    } catch (err) {
      throw new BadRequestException('FILE_UPLOAD_FAILED');
    }
  }

  //remove file from s3
  async removeFile(pathString: string, userPayload: UserPayloadInterface) {
    const { id } = userPayload;
    //check for valid users path
    const checkValidPath = pathString.startsWith(id);
    if (!checkValidPath) {
      throw new BadRequestException('Invalid file path!');
    }
    const s3Bucket = await this.configService.get('S3_BUCKET_NAME');
    const s3 = await this.getS3Config();

    const params = {
      Bucket: s3Bucket,
      Key: pathString,
    };
    //delete file
    await new Promise((resolve, reject) => {
      s3.deleteObject(params, (err, data) => {
        if (err) {
          //throw error messages
          reject(err.message);
          throw new BadRequestException(`FILE_DELETE_FAILED`);
        }
        resolve(data);
      });
    });
    return `File deleted successfully!`;
  }

  //download a file from s3
  async downloadFile(pathString: string, userPayload: UserPayloadInterface) {
    const { id } = userPayload;
    //check for valid users path
    const checkValidPath = pathString.startsWith(id);
    if (!checkValidPath) {
      throw new BadRequestException('Invalid file path!');
    }
    const s3Bucket = await this.configService.get('S3_BUCKET_NAME');
    const s3 = await this.getS3Config();

    const params = {
      Bucket: s3Bucket,
      Key: pathString,
    };
    //delete file
    const fileName = pathString.replace(/^.*[\\\/]/, '');
    const streamFile = s3.getObject(params).createReadStream();
    return { fileStream: streamFile, fileName: fileName };
  }

  //get s3 configuration
  async getS3Config() {
    return new S3({
      accessKeyId: await this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: await this.configService.get('AWS_SECRET_KEY'),
      region: await this.configService.get('AWS_REGION'),
    });
  }
}
