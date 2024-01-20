// import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import * as path from 'path';
import { S3FileManagerDto } from './dto/s3-file-manager.dto';
import s3Dir from 's3-dir';
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';

@Injectable()
export class S3FileManagerService {
  constructor(
   
  ) { }

  //file upload method
  async s3FileUpload(
    // files: Express.Multer.File[],
    image: any,
    // userPayload: UserPayloadInterface,
    s3FileUploadDto: S3FileManagerDto, User: string, organizationId: string, applicationId: string, userId
  ) {
    try {
      console.log("fazi Log");
      let sucessCount = 0;
      const afterUploadData = [];
      //get the bucket name from config
      const s3Bucket = 'campaigns.expocitydubai.com'//await this.configService.get('S3_BUCKET_NAME');
      //get the s3 config data
      const s3 = await this.getS3Config();
      //set folder name for file upload
      let folderName = "tvshows";
      // let folderName = `${userPayload.id}`;
      const userKey = `${organizationId}/${applicationId}/${userId}/`;

      if (s3FileUploadDto && s3FileUploadDto.path) {
        folderName = userKey + s3FileUploadDto.path;
      }
      // console.log(folderName, files.length)
      //prepare parameters for file upload & upload files

      const fileNameData = path.basename(
        image.originalname,
        path.extname(image.originalname),
      );
      //file upload parmas for s3
      const params = {
        Bucket: s3Bucket,
        // ACL: 'public-read',
        Key: `${folderName}/${fileNameData}-${crypto.randomUUID()}${path.extname(
          image.originalname,
        )}`,
        Body: Buffer.from(image.buffer),
        ContentType: image.mimetype,
      };
      //upload file data to s3
      const uploadedInfo = await new Promise((resolve, reject) => {
        //upload file
        s3.upload(params, (err, data) => {
          if (err) {
            //throw error messages
            reject(err.message);
            // throw new BadRequestException(`FILE_UPLOAD_FAILED`);
          }
          resolve(data);
        });
      });
      afterUploadData.push(uploadedInfo);

      //save File Info in db


      // for (let i = 0; i < files.length; i++) {
      //   //set upload parameter
      //   const fileNameData = path.basename(
      //     files[i].originalname,
      //     path.extname(files[i].originalname),
      //   );
      //   //file upload parmas for s3
      //   const params = {
      //     Bucket: s3Bucket,
      //     // ACL: 'public-read',
      //     Key: `${folderName}/${fileNameData}-${crypto.randomUUID()}${path.extname(
      //       files[i].originalname,
      //     )}`,
      //     Body: Buffer.from(files[i].buffer),
      //     ContentType: files[i].mimetype,
      //   };
      //   //upload file data to s3
      //   const uploadedInfo = await new Promise((resolve, reject) => {
      //     //upload file
      //     s3.upload(params, (err, data) => {
      //       if (err) {
      //         //throw error messages
      //         reject(err.message);
      //         throw new BadRequestException(`FILE_UPLOAD_FAILED`);
      //       }
      //       resolve(data);
      //     });
      //   });
      //   afterUploadData.push(uploadedInfo);
      // }
      const obj = {
        originalFileName: image?.originalname,
        fileName: fileNameData,
        size: image?.size,
        contentType: image?.mimetype,
        storagePath: params?.Key,
        createdDate: new Date(),
        folderId: s3FileUploadDto?.parentId,
        folderPath: folderName,
        owner: User
      };
      // const inserFile = await this.fileManagerModel.create(obj);
      const inserFile = '';
      sucessCount = afterUploadData.length;
      return { message: `Total ${sucessCount} files uploaded successfully!`, path: params.Key };
    } catch (error) {
      console.log("fazi errror");
      console.log(error);
    }
  }

  //list all files
  async listAllS3Files(organizationId: string, applicationId: string, userId, folderName?: string) {
    // folderName = folderName ?? userPayload.id;
    folderName = folderName ? `images/${folderName}` : "images";
    // console.log(folderName)
    const result = await this.listFiles(organizationId, applicationId, userId, folderName);
    // http://campaigns.expocitydubai.com.s3-website.me-south-1.amazonaws.com/tvshows/July11-18screencontentreelfive.mp4
    const beginUrl = 'campaigns.expocitydubai.com.s3.me-south-1.amazonaws.com/';
    let data = [];
    let resultData = result.folders[0]
    for (let i = 0; i < resultData.objects?.length; i++) {
      const element = resultData.objects[i];
      const imageUrl = beginUrl + element.Key;
      data.push(imageUrl);
    }
    for (let i = 0; i < resultData.folders?.length; i++) {
      const element = resultData.folders[i];
      for (let j = 0; j < element.objects?.length; j++) {
        const element1 = element.objects[j];
        const imageUrl = beginUrl + element1.Key;
        data.push(imageUrl);
      }
    }
    return data;
  }
  async listParentFolders(organizationId: string, applicationId: string, userId): Promise<ApiResponse<any[]>> {
    try {
      // const response = await this.folderManagerModel.find({ organizationId: organizationId, applicationId: applicationId, userId: userId, parentId: { $exists: false } });
      const response : any = '';

      return new ApiResponse(true, 'Data Retrieved', response);

    } catch (error) {
      return new ApiResponse(false, 'Error listing parent folders:');
    }
  }
  async getDetailsOfFile(fileKey: string, organizationId: string, applicationId: string, userId) {
    const s3Bucket = 'campaigns.expocitydubai.com'; // Replace with your bucket name
    const s3 = await this.getS3Config();

    const params = {
      Bucket: s3Bucket,
      Key: fileKey, // Specify the key of the file for which you want to retrieve details
    };

    try {
      const response = await s3.headObject(params).promise();
      // console.log(JSON.stringify(response));
      // Extract relevant details
      const beginUrl = 'campaigns.expocitydubai.com.s3.me-south-1.amazonaws.com/';

      const details = {
        fileName: fileKey, // Replace 'filename' with the actual metadata key
        url: beginUrl + fileKey, // Replace 'filename' with the actual metadata key
        // fileName: response.Metadata['filename'], // Replace 'filename' with the actual metadata key
        fileSize: response.ContentLength,
        createdDate: response.LastModified,
        type: response.ContentType,
      };

      return details;
    } catch (error) {
      return error;
    }
  }
  async getDetailsOfAllFilesInFolder(parentId: string, organizationId: string, applicationId: string, userId): Promise<ApiResponse<any>> {
    try {
      console.log(`parentId : ${JSON.stringify(parentId)}`);
      // const folderList = await this.folderManagerModel.find({ organizationId: organizationId, applicationId: applicationId, userId: userId, parentId: parentId });
      // const filesList = await this.fileManagerModel.find({ folderId: parentId });
      const folderList = '';
      const filesList = '';
      const data = {
        folderList: folderList, filesList: filesList
      };
      return new ApiResponse(true, 'File details retrieved successfully', data);
    } catch (error) {
      return new ApiResponse(false, 'Error getting file details:', error);
    }
  }


  async listObjectsInFolder(folderName: string, organizationId: string, applicationId: string, userId): Promise<ApiResponse<any[]>> {
    const s3Bucket = 'campaigns.expocitydubai.com'; // Replace with your bucket name
    const s3 = await this.getS3Config();

    const beginUrl = 'campaigns.expocitydubai.com.s3.me-south-1.amazonaws.com/';

    const params = {
      Bucket: s3Bucket,
      // Delimiter: '',
      Prefix: `${folderName}/`, // Include the folder name as a prefix
    };

    try {
      const response = await s3.listObjectsV2(params).promise();
      // Extract the object keys from the response
      const objectKeys = response.Contents.map((object) => object.Key);
      const updateData = objectKeys.map((obj) => {
        if (obj.includes('.')) {
          return beginUrl + obj;
        } else {
          return obj;
        }
      });

      return new ApiResponse(true, 'Data Retrieved', updateData);

    } catch (error) {
      return new ApiResponse(false, 'Error listing objects in the folder:');
    }
  }

  async createSubfolder(model: any, organizationId: string, applicationId: string, userId: string): Promise<ApiResponse<any>> {
    const s3Bucket = 'campaigns.expocitydubai.com'; // Replace with your bucket name
    const s3 = await this.getS3Config();

    const userKey = `${organizationId}/${applicationId}/${userId}/`;

    // Create subfolder within user folder
    const subfolderKey = `${userKey}${model.s3folderName}/`;
    const params = {
      Bucket: s3Bucket,
      Key: subfolderKey,
      Body: '', // Use an empty string as the content to create a folder
    };

    model['createdDate'] = new Date();
    model['folderPath'] = subfolderKey;
    model['userId'] = userId;
    model['applicationId'] = applicationId;
    model['organizationId'] = organizationId;

    console.log(`model : ${JSON.stringify(model)}`);

    // await this.folderManagerModel.create(model);

    try {
      await s3.putObject(params).promise();
      return new ApiResponse(true, 'Subfolder created successfully', null);
    } catch (error) {
      // Handle error (log or throw)
      console.error('Error creating the subfolder:', error);
      return new ApiResponse(false, 'Error creating the subfolder:', error);
    }
  }

  // Helper function to check and create a folder if not exists
  async createFolderIfNotExists(bucket: string, key: string, s3: AWS.S3, organizationId: string, applicationId: string, userId, check?): Promise<void> {
    try {
      const params = {
        Bucket: bucket,
        Key: key,
        Body: '', // Use an empty string as the content to create a folder
      };

      // Check if the folder exists
      const folderExists = await this.checkFolderExists(bucket, key, s3);

      if (!folderExists) {
        if (check) {
          const obj = {
            createdDate: new Date(),
            folderName: check,
            userId: userId,
            applicationId: applicationId,
            organizationId: organizationId,
            folderPath: `${organizationId}/${applicationId}/${userId}/`
          }
          // const createFolder = await this.folderManagerModel.create(obj);
          const createFolder = '';
          console.log(`createFolder : ${JSON.stringify(createFolder)}`);
        }
        // Create the folder if it does not exist
        await s3.putObject(params).promise();
      }
    } catch (error) {
      // Handle error (log or throw)
      console.error('Error checking/creating folder:', error);
    }
  }

  // Helper function to check if a folder exists
  async checkFolderExists(bucket: string, key: string, s3: AWS.S3): Promise<boolean> {
    try {
      const params = {
        Bucket: bucket,
        Prefix: key,
        MaxKeys: 1,
      };

      const response = await s3.listObjectsV2(params).promise();

      return response.Contents.length > 0;
    } catch (error) {
      // Handle error (log or throw)
      console.error('Error checking if folder exists:', error);
      return false;
    }
  }


  async listFiles(folderName: string, organizationId: string, applicationId: string, userId) {
    const s3Bucket = 'campaigns.expocitydubai.com'//await this.configService.get('S3_BUCKET_NAME');
    const s3 = await this.getS3Config();

    const params = {
      Bucket: s3Bucket,
      Delimiter: '',
      Prefix: folderName,
    };
    const listedFiles: any = await new Promise((resolve, reject) => {
      s3.listObjectsV2(params, (err, data) => {
        if (err) {
          //throw error messages
          reject(err.message);
          // throw new BadRequestException(`FILE_UPLOAD_FAILED`);
        }
        resolve(data);
      });
    });
    const result = s3Dir.toDir(await listedFiles.Contents);
    return result;
  }
  async deleteFile(fileKey: string, organizationId: string, applicationId: string, userId): Promise<ApiResponse<any>> {
    const s3Bucket = 'campaigns.expocitydubai.com'; // Replace with your bucket name
    const s3 = await this.getS3Config();
    const userKey = `${organizationId}/${applicationId}/${userId}/`;
    // const getFileDetail = await this.fileManagerModel.findById(fileKey);
    const getFileDetail : any = '';
    console.log("getFileDetail : " + JSON.stringify(getFileDetail));

    const params = {
      Bucket: s3Bucket,
      Key: getFileDetail?.storagePath, // Specify the key of the file to be deleted
    };

    try {
      // const file = await this.fileManagerModel.deleteOne({ _id: fileKey });
      await s3.deleteObject(params).promise();

      return new ApiResponse(true, 'File deleted successfully', null);
    } catch (error) {
      return new ApiResponse(false, 'Error deleting the file:', error);
    }
  }
  async deleteFolder(fileKey: string, organizationId: string, applicationId: string, userId): Promise<ApiResponse<any>> {
    const s3Bucket = 'campaigns.expocitydubai.com'; // Replace with your bucket name
    const s3 = await this.getS3Config();
    console.log('fileKey : ' + fileKey)
    // const getFolderDetails = await this.folderManagerModel.findById(fileKey);
    const getFolderDetails : any = '';
    console.log("folderManagerModel : " + JSON.stringify(getFolderDetails));

    const params = {
      Bucket: s3Bucket,
      Key: getFolderDetails.folderPath, // Specify the key of the file to be deleted
    };
    try {
      // const folder = await this.folderManagerModel.deleteOne({ _id: fileKey });
      await s3.deleteObject(params).promise();

      return new ApiResponse(true, 'File deleted successfully', null);
    } catch (error) {
      return new ApiResponse(false, 'Error deleting the file:', error);
    }
  }
  async updateFileInfo(id: string, body: any, organizationId: string, applicationId: string, userId): Promise<ApiResponse<any>> {

    try {

      // const updateFileManagerModel = await this.fileManagerModel.findByIdAndUpdate(body._id, body);
      if (body?.tagging) {
        const s3Bucket = 'campaigns.expocitydubai.com'; // Replace with your bucket name
        const s3 = await this.getS3Config();
        console.log(` body?.tagging :  ${JSON.stringify(body?.tagging)}`)
        const params = {
          Bucket: s3Bucket,
          Key: body?.storagePath,
          Tagging: {
            TagSet: body.tagging
          },
        };

        await s3.putObjectTagging(params).promise();
      }

      return new ApiResponse(true, 'File update successfully', null);
    } catch (error) {
      return new ApiResponse(false, 'Error update the file:', error);
    }
  }

  //remove file from s3
  async removeFile(pathString: string, organizationId: string, applicationId: string, userId) {
    // const { id } = userPayload;
    //check for valid users path
    const checkValidPath = pathString.startsWith("images");
    if (!checkValidPath) {
      // throw new BadRequestException('Invalid file path!');
    }
    const s3Bucket = 'campaigns.expocitydubai.com'//await this.configService.get('S3_BUCKET_NAME');
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
          // throw new BadRequestException(`FILE_DELETE_FAILED`);
        }
        resolve(data);
      });
    });
    return `File deleted successfully!`;
  }

  //download a file from s3
  async downloadFile(pathString: string) {
    // const { id } = userPayload;
    //check for valid users path
    const checkValidPath = pathString.startsWith("images");
    if (!checkValidPath) {
      // throw new BadRequestException('Invalid file path!');
    }
    const s3Bucket = 'campaigns.expocitydubai.com'//await this.configService.get('S3_BUCKET_NAME');
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
      accessKeyId: 'AKIAVZUDL4JEPPBWNC5S',//await this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: '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',//await this.configService.get('AWS_SECRET_KEY'),
      region: 'me-south-1'
    });
  }
  async savePdfToS3(pdfBuffer: Buffer, folderName: string, date: any): Promise<string> {
    const s3Bucket = 'campaigns.expocitydubai.com'; // Replace this with your actual S3 bucket name
    const s3 = this.getS3Config();

    const pdfFileName = `generated_pdf_${date ? date : Date.now()}.pdf`; // You can modify the file name as needed

    const params = {
      Bucket: s3Bucket,
      Key: `${folderName}/${pdfFileName}`,
      Body: pdfBuffer,
      ContentType: 'application/pdf', // Set the content type
    };

    try {
      const uploadedPdf = await (await s3).upload(params).promise();
      return uploadedPdf.Location; // Return the S3 path where the PDF is stored
    } catch (error) {
      console.error('Error uploading PDF to S3:', error);
      throw new Error('Failed to upload PDF to S3');
    }
  }
  async createUserFolder(organizationId: string, applicationId: string, userId) {
    try {
      const s3Bucket = 'campaigns.expocitydubai.com'; // Replace with your bucket name
      const s3 = await this.getS3Config();
      // Define the folder keys for organization, application, and user
      const organizationKey = `${organizationId}/`;
      const applicationKey = `${organizationId}/${applicationId}/`;
      const userKey = `${organizationId}/${applicationId}/${userId}/`;
      const uploads = `${organizationId}/${applicationId}/${userId}/uploads/`;
      const myfiles = `${organizationId}/${applicationId}/${userId}/myfiles/`;
      const shared = `${organizationId}/${applicationId}/${userId}/shared/`;

      // Check and create organization folder if not exists
      await this.createFolderIfNotExists(s3Bucket, organizationKey, s3, organizationId, applicationId, userId);

      // Check and create application folder if not exists
      await this.createFolderIfNotExists(s3Bucket, applicationKey, s3, organizationId, applicationId, userId);

      // Check and create user folder if not exists
      await this.createFolderIfNotExists(s3Bucket, userKey, s3, organizationId, applicationId, userId);
      await this.createFolderIfNotExists(s3Bucket, uploads, s3, organizationId, applicationId, userId, 'uploads');
      await this.createFolderIfNotExists(s3Bucket, myfiles, s3, organizationId, applicationId, userId, 'myfiles');
      await this.createFolderIfNotExists(s3Bucket, shared, s3, organizationId, applicationId, userId, 'shared');

      return new ApiResponse(true, 'File details retrieved successfully', true);
    }
    catch (error) {
      return new ApiResponse(false, 'File details retrieved successfully');
    }

  }
  async getRecordsBySharedEmail(email: string): Promise<ApiResponse<any>> {
    try {
      // Find records where the provided email is in the share property
      // const records = await this.fileManagerModel.find({ share: { $regex: new RegExp(email, 'i') } }).exec();
      const records = '';
      return new ApiResponse(true, 'File details retrieved successfully', records);

    } catch (error) {
      return new ApiResponse(false, 'File details retrieved successfully');
    }
  }
}
