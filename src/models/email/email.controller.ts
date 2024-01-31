// Some other controller or service where you want to send emails
import { Controller, Post, Body, Get, UseInterceptors, UploadedFiles, UploadedFile, Res, Param, Query } from '@nestjs/common';
import { EmailService } from './email.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express/multer';
// import { ApiConsumes } from '@nestjs/swagger';
import * as path from 'path';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { DB_CONFIG, SPECTRUM_CONFIG } from 'src/shared/config/global-db-config';
import { S3 } from 'aws-sdk';
import * as crypto from 'crypto';
import { S3FileManagerDto } from '../s3-file-manager/dto/s3-file-manager.dto';
@Controller('email')
export class EmailController {
    constructor(private readonly emailService: EmailService,
    ) { }
    // @ApiConsumes('multipart/formdata')

    //This upload use in editor.js to upload files
    @Post('upload')
    @UseInterceptors(
        FileInterceptor('image', {
        }),
    )
    async uploadFile(@UploadedFile() image,
        @Body() fileUploadBodyDto: S3FileManagerDto,
        @Query('organizationId') organizationId?: string,
        @Query('applicationId') applicationId?: string,
        @Query('user') user?: string,
        @Query('userId') userId?: string,
    ) {
        try {
            let s3FileUploadDto = fileUploadBodyDto;
            console.log("fazi Log");
            let sucessCount = 0;
            const afterUploadData = [];
            //get the bucket name from config
            const s3Bucket = 'campaigns.expocitydubai.com'//await this.configService.get('S3_BUCKET_NAME');
            //get the s3 config data
            const s3 = await this.getS3Config();
            //set folder name for file upload
            let folderName = "tvshows";
            const userKey = `${organizationId}/${applicationId}/${userId}/`;
            if (s3FileUploadDto && s3FileUploadDto.path) {
                folderName = userKey + s3FileUploadDto.path;
            }
            //prepare parameters for file upload & upload files
            console.log('image : ' + image)
            const fileNameData = path.basename(
                image.originalname,
                path.extname(image.originalname),
            );
            //file upload parmas for s3
            const params = {
                Bucket: s3Bucket,
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
            const obj = {
                originalFileName: image?.originalname,
                fileName: fileNameData,
                size: image?.size,
                contentType: image?.mimetype,
                storagePath: params?.Key,
                createdDate: new Date(),
                folderId: s3FileUploadDto?.parentId,
                folderPath: folderName,
                owner: user
            };
            console.log(`inserFile : ${JSON.stringify(obj)}`)
            // await this.fileManagerModel.create(obj);
            sucessCount = afterUploadData.length;
            return {
                success: 1,
                file: {
                    url: SPECTRUM_CONFIG.SPECTRUM.nestImageUrl + params.Key,
                },
            };
        } catch (error) {
            console.log(error);
            return { success: 0, error };
        }
    }

    @Post('send')
    async sendEmail(@Body() emailData: any) {
        const { subject, to, text, html } = emailData;
        await this.emailService.sendEmail(subject, to, text, html);
        return { message: 'Email sent successfully' };
    }
    @Post('emailPdf')
    async sendHtmlAsPdfURL(@Body() body: any) {
        console.log(body.url)
        const to = 'arfanali.cloud@gmail.com';
        const subject = 'Email Subject';
        const text = 'Text Content';
        const html = '<p>HTML Content</p>';

        // Call the method from the service
        await this.emailService.sendHtmlAsPdfURL(subject, to, body.url);

        return { message: 'Email sent successfully' };
    }

    @Post('send-email')
    @UseInterceptors(
        FilesInterceptor('files', 10), // Adjust the limit as needed
    )
    async sendEmailController(
        @Body() emailData: any,
        @UploadedFiles() files: any[], // Use UploadedFiles instead of UploadedFile
    ): Promise<ApiResponse<any[]>> {
        try {
            // console.log('files: ', files);
            let attachments: any = [];

            if (files) {
                files.forEach(file => {
                    const name = path.basename(file.originalname);
                    const buffer = file.buffer;
                    attachments.push({ filename: name, content: buffer });
                });
            }

            const { subject, to, cc, bcc, text, html } = emailData;
            return await this.emailService.sendEmailWithCC(
                subject,
                to,
                cc,
                bcc,
                text,
                html,
                attachments,
            );
        } catch (error) {
            console.error('Error sending email:', error);
            return new ApiResponse(false, 'Error sending email:', error);
        }
    }

    @Get()

    // @Get('allEmail')
    // async getAllEmail() {
    //     let emailData = await this.emailService.getAllInboxEmails('alizaidi85240@gmail.com', 'qwerty4601@*');
    //     return emailData;
    // }

    @Get('sendEmail')
    async sendEmailAttachment() {

        await this.emailService.sendHtmlAsPdf("Test", "arfanali.cloud@gmail.com", `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
        <link rel="stylesheet" href="styles/style.css">
        <title>Document</title>
    </head>
    <style>
        body {
            font-family: sans-serif;
        }
    
        /* images area */
        .images {
            margin-top: 20px;
        }
    
        .first_img {
            width: 258px;
            margin-left: 2px;
        }
    
        .second_img {
            margin-left: 20px;
        }
    
        .third_img {
            margin-left: 20px;
        }
    
        /* images area */
    
        .first_heading {
            margin-left: 230px;
            margin-top: 51px;
        }
    
    
        table {
            border-collapse: collapse;
            width: 100%;
        }
    
        table,
        th,
        td {
            border: 1px solid black;
        }
    
        th {
            padding: 15px;
            text-align: left;
        }
    
        td {
            padding: 15px;
            text-align: center;
        }
    
        .serial {
            width: 10px;
        }
    
        #last {
            text-align: left;
        }
    
        .second_table_H {
            text-align: center;
        }
    
        .date_area {
            margin-top: 40px;
        }
    
    
    
        /* Responsive media queries */
        @media screen and (max-width: 600px) {
    
            /* Adjust styles for screens with a width of 600px or less */
            .images {
                text-align: left;
                /* Align images to the left */
            }
    
            .first_img,
            .second_img,
            .third_img {
                max-width: 100%;
                /* Make images fill the container width */
            }
    
            .first_heading {
                text-align: left;
                /* Align headings to the left */
                margin-left: 10px;
            }
    
            th,
            td {
                padding: 5px;
                /* Further reduce padding for smaller screens */
            }
        }
    </style>
    
    <body>
        <div>
            <img src="http://localhost:4500/uploads/Images/Picture1.png" alt="" class="first_img">
            <img src="http://localhost:4500/uploads/Images/Picture2.png" alt="" class="second_img">
            <img src="http://localhost:4500/uploads/Images/Picture3.png" alt="" class="third_img">
        </div>
        <div >
            <h2>Frequency PMO Governance Managment Authorization <span style="float: right;"> حیرصت فیطلا يددرتلا</span> </h2>
    
            <h3>Program Making & Special Events Services <span style="float: right;">يجاتنلإا يف خلا ي ةصاخلا
                    تایلاعفلاوتامدخلاجاتنلإا </span> </h3>
            <h3>Authorization No. <span style="text-decoration: underline;">4-ALL-MIC-1523/01
                    (200327-SOP-000135)</span><span style="float: right">قر حقر ح </span></h3>
    
    
            <table>
    
                <tr>
                    <th class="serial">1.</th>
                    <th>Holder of Authorization</th>
                    <td>JEAN CHRISTOPE PAKEL <br> MEDIA</td>
                    <th>حزمة الوسائط لجان كريستوب</th>
                    <th>.1</th>
                </tr>
                <tr>
                    <th class="serial">2.</th>
                    <th>Permitted Venue of Operation</th>
                    <td>Expo 2020 Site <br> All Locations</td>
                    <th>وقع اكسبو 2020 جميع المواقع</th>
                    <th>.2</th>
                </tr>
                <tr>
                    <th class="serial">3.</th>
                    <th>Assigned Frequencies </th>
                    <td>475 MHz </td>
                    <th>475 ميجاهرتز</th>
                    <th>.3</th>
                </tr>
                <tr>
                    <th class="serial">4.</th>
                    <th>Radiated Power (EIRP) </th>
                    <td>50 mW</td>
                    <th>50 ميغاواط</th>
                    <th>.4</th>
                </tr>
                <tr>
                    <th class="serial">5.</th>
                    <th>Bandwidth</th>
                    <td>kHz 200</td>
                    <th>كيلو هرتز 200</th>
                    <th>.5</th>
                </tr>
                <tr>
                    <th class="serial">6.</th>
                    <th>Type of Service</th>
                    <td>Wireless Microphone Equipment</td>
                    <th>معدات الميكروفون اللاسلكي</th>
                    <th>.6</th>
                </tr>
                <tr>
                    <th class="serial">7.</th>
                    <th>Remarks</th>
                    <td id="last">
                        <ul>
                            <li>TRA Regulatory Framework Applies.</li>
                            <li>Expo Frequency and Spectrum
                                Management Policy Applies.
                            </li>
    
                        </ul>
                    </td>
                    <th>تاظحلام</th>
                    <th>.7</th>
                </tr>
    
    
            </table>
            <h2>Radio Equipment Specifications:</h2>
            <table>
    
                <tr>
    
                    <th class="second_table_H">Equipment Name <br>Quantity</th>
                    <th class="second_table_H">Manufacturer <br>Quantity</th>
                    <th class="second_table_H">Type/Model <br>Quantity</th>
                    <th class="second_table_H">Quantity <br>Quantity</th>
    
                </tr>
                <tr>
    
                    <td class="second_table_H">Transmitter</td>
                    <td class="second_table_H">Shure</td>
                    <td class="second_table_H">ABC-100</td>
                    <td class="second_table_H">10</th>
                </tr>
                <tr>
    
                    <td class="second_table_H">Transmitter</td>
                    <td class="second_table_H">-</td>
                    <td class="second_table_H">-</td>
                    <td class="second_table_H">-</th>
                </tr>
            </table>
            <div style="clear: both;">
                <div style="float: left;margin-top:30px">
                    <span style="font-size: large;font-weight: bold;">Start Date</span>
                    <span style="font-size: large;text-decoration: underline; margin-left: 50px;font-weight: lighter;">15/10/2023</span>
                    <span style="font-size: large;font-weight: bold;margin-left: 60px;">تاريخ البدءمادختسلاا</span>
                </div>
                <div style="float: right;margin-top:30px">
                    <span style="font-size: large;font-weight: bold;">End Date</span>
                    <span style="font-size: large;text-decoration: underline; margin-left: 50px;font-weight: lighter;">15/10/2023</span>
                    <span style="font-size: large;font-weight: bold;margin-left: 60px;">تاريخ الانتهاء</span>
                </div>
            </div>
            <div style="clear: both;">
                <div style="float: left;margin-top:5px">
                    <span style="font-size: large;font-weight: bold;">Receipt No.</span>
                    <span style="font-size: large;text-decoration: underline; margin-left: 50px;font-weight: lighter;">
                        <span >N/A</span>
                    </span>
                    <span style="font-size: large;font-weight: bold;margin-left: 60px;">رقم الإيصال</span>
                </div>
                <div style="float: right;margin-top:5px">
                    <span style="font-size: large;font-weight: bold;">Date of Receipt</span>
                    <span style="font-size: large;text-decoration: underline; margin-left: 50px;font-weight: lighter;">N/A</span>
                    <span style="font-size: large;font-weight: bold;margin-left: 60px;">لاصیلإا خیرات</span>
                </div>
            </div>
    
            <h3 style="margin-top: 55px;text-align: center;">Approved Electronic Authorization issued
                without signature by the General
                Authority for Regulating the <br>Telecommunication Sector. To verify this Authorization please call 80012
            </h3>
    
            <h3 style="margin-top: 55px;text-align: center;">فويض إلكتروني معتمد صادر بدون توقيع من
                الهيئة العامة لتنظيم
                قطاع الاتصالات.<br> للتحقق من هذا التصريح يرجى الاتصال على 80012
            </h3>
            <p style="margin-top: 30px;">In accordance with UAE Telecommunications Law issued vide Federal Decree by Law
                No.3 of 2003, the word
                License is taken <br>to mean "Authorization"
            </p>
    
    
            <p style="margin-top: 30px;">Terms & Conditions apply, visit: www.tra.gov.ae/stc.</p>
    
            <h5 style="text-align: center;margin-top: 41px; ">Federal Authority <span
                    style="font-weight: bolder;">|</span>الهيئة الاتحادية </h5>
    
            <p style="text-align: center;">Tel +971 2 626 9999 فتاھ ♦ Fax +971 2 611 8229 سكاف ♦ ABU
                DHABI, UNITED ARAB EMIRATE ةدحتملا ةیبرعلا تاراملإا
                يبظوبأ، ♦ 26662P.O. BOX . ب.ص <br>www.tra.gov.ae</p>
        </div>
    
    </body>
    
    </html>`);
        return { message: 'Email sent successfully' };
    }
    async getS3Config() {
        return new S3({
            accessKeyId: 'AKIAVZUDL4JEPPBWNC5S',//await this.configService.get('AWS_ACCESS_KEY_ID'),
            secretAccessKey: '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',//await this.configService.get('AWS_SECRET_KEY'),
            region: 'me-south-1'
        });
    }

}
