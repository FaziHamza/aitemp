import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import { SPECTRUM_CONFIG } from 'src/shared/config/global-db-config';
import { S3FileManagerService } from '../s3-file-manager/s3-file-manager.service';
import { Readable } from 'stream';
import * as qr from 'qr-image';  // Assuming you have a QR code library installed
import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { CrateDbService } from 'src/common/common/crateDb.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';
import { HashService } from 'src/shared/services/hash/hash.service';

@Injectable()
export class EmailService {

    constructor(private readonly mailerService: MailerService, private readonly s3FileManagerService: S3FileManagerService) { }

    async sendEmail(subject: string, to: string, text: string, html: string, attachments?: any[], cc?: string[], bcc?: string[]): Promise<ApiResponse<any[]>> {
        try {
            if (to) {
                const mailOptions: any = {
                    to,
                    subject,
                    text,
                    html,
                };

                // Add cc if it is provided and not empty
                if (cc && cc.length > 0) {
                    mailOptions.cc = cc;
                }

                // Add bcc if it is provided and not empty
                if (bcc && bcc.length > 0) {
                    mailOptions.bcc = bcc;
                }

                // Add attachments if provided
                if (attachments && attachments.length > 0) {
                    mailOptions.attachments = attachments;
                }

                await this.mailerService.sendMail(mailOptions);
                return new ApiResponse(true, 'Email sent successfully');
            } else {
                return new ApiResponse(false, 'Recipients are undefined');
            }
        } catch (error) {
            return new ApiResponse(false, 'Error sending email:', error);
        }
    }


    async sendEmailWithCC(
        subject: string,
        to: string,
        cc: string[] = [],
        bcc: string[] = [],
        text: string,
        html: string,
        attachments?: any,
    ): Promise<ApiResponse<any[]>> {
        try {
            if (to) {
                const mailOptions: any = {
                    to,
                    subject,
                    text,
                    html,
                };

                // Add cc if it is provided and not empty
                if (cc && cc.length > 0) {
                    mailOptions.cc = cc;
                }

                // Add bcc if it is provided and not empty
                if (bcc && bcc.length > 0) {
                    mailOptions.bcc = bcc;
                }

                // Add attachments if provided
                if (attachments && attachments.length > 0) {
                    mailOptions.attachments = attachments;
                }
                await this.mailerService.sendMail(mailOptions);
                return new ApiResponse(true, 'Email send successfully');
            } else {
                return new ApiResponse(false, 'Recipients is undefined');
            }
        } catch (error) {
            return new ApiResponse(false, 'Error sending email:', error);
        }
    }


    async generatePdf(html: string): Promise<Buffer> {
        try {
            const browser = await puppeteer.launch({ headless: 'new' });
            const page = await browser.newPage();
            await page.setContent(html);
            const pdf = await page.pdf({ margin: { top: '5px', right: '5px', bottom: '0px', left: '5px' }, printBackground: true, format: 'A4' });
            await browser.close();
            return pdf;
        } catch (error) {
            throw error; // Re-throw the error to handle it where the function is called
        }
    }
    async generatePdfFromUrl(innerPageUrl: string): Promise<Buffer> {
        try {
            const browser = await puppeteer.launch({ headless: 'new' });
            const page = await browser.newPage();

            await page.goto(innerPageUrl, { waitUntil: 'networkidle0' }); // Adjust waitUntil as needed

            const pdf = await page.pdf({ margin: { top: '5px', right: '5px', bottom: '0px', left: '5px' }, printBackground: true, format: 'A4' });

            await browser.close();
            return pdf;
        } catch (error) {
            throw error; // Re-throw the error to handle it where the function is called
        }
    }





    async savePdfToFile(pdfBuffer: Buffer, filePath: string) {
        fs.writeFileSync(filePath, pdfBuffer);
    }

    async sendHtmlAsPdf(subject: any, to: any, html: any, date?: any, htmlText?: any, cc?: string[], bcc?: string[]) {
        try {
            const timestamp = new Date().toISOString();

            const pdfBuffer: any = await this.generatePdf(html);
            // const pdfBuffer: any = await this.generatePdfFromUrl(html);

            const folderName = 'pdfs'; // Modify this to your desired folder

            const s3Path = await this.s3FileManagerService.savePdfToS3(pdfBuffer, folderName, date);

            const attachments = [
                {
                    filename: 'document.pdf',
                    path: s3Path, // Attach the saved PDF from the file path
                },
            ];

            await this.sendEmail(subject, to, 'This is the text content', htmlText, attachments, cc, bcc);

            return s3Path;
        } catch (error) {
            throw new Error('Failed to generate or upload PDF');
        }
    }
    async sendHtmlAsPdfURL(subject: any, to: any, html: any, date?: any, htmlText?: any) {
        try {
            const timestamp = new Date().toISOString();

            // const pdfBuffer: any = await this.generatePdf(html);
            const pdfBuffer: any = await this.generatePdfFromUrl(html);

            const folderName = 'pdfs'; // Modify this to your desired folder

            const s3Path = await this.s3FileManagerService.savePdfToS3(pdfBuffer, folderName, date);

            const attachments = [
                {
                    filename: 'document.pdf',
                    path: s3Path, // Attach the saved PDF from the file path
                },
            ];

            await this.sendEmail(subject, to, 'This is the text content', htmlText, attachments);

            return s3Path;
        } catch (error) {
            throw new Error('Failed to generate or upload PDF');
        }
    }


    getEmail() {
        // const sendEmail = await this.sendHtmlAsPdf('Test PDF Email', 'test@gmail.com', this.specturamEmailFormat().progressEmail);
    }

    makeHtml(model: any, table: any) {
        let htmlTemplate = `<!DOCTYPE html>
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
                margin-left: 2px;
                width: 30%;
                height: 30%;
                object-fit: contain;
                max-width: 250px;
                max-width: 250px;
            }
        
            .second_img {
                max-width: 50%;
                margin-left: 20px;
                width: 30%;
                height: 30%;
                object-fit: contain;
            }
        
            .third_img {
                max-width: 250px;
                margin-left: 20px;
                width: 30%;
                height: 30%;
                object-fit: contain;
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
                border: 2px solid black;
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
                width: 25%;
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
        
                .image-container {
                    display: flex;
                    justify-content: space-between;
                }
        
                .image-container>div {
                    width: 50%;
                }
        
                .image {
                    width: 30px !important;
                    height: 30px !important;
                    /* Maintain aspect ratio */
                    object-fit: contain;
                }
        
                .vl {
                    border-left: 6px solid green !important;
                    height: 500px !important;
                }
            }
        
            .th-font {
                font-size: 12px !important;
            }
        
            .heading {
                font-size: 14px !important;
            }
        
            .sub-heading {
                font-size: 12px !important;
            }
        
            .small-heading {
                font-size: 10px !important;
            }
        
            .standard-margin-top {
                margin-top: 10px;
            }
        </style>
        
        <body>
            <div style="padding: 10px 50px;">
                <div style="display: flex; justify-content: space-between;">
                    <img src="${SPECTRUM_CONFIG.SPECTRUM.serverPath}uploads/Images/Picture1.png" style="width: 150px; height: 80px; margin-top: 6px;" alt=""
                        class="image">
                    <div style="display: flex ;">
                        <img src="${SPECTRUM_CONFIG.SPECTRUM.serverPath}uploads/Images/Picture2.png" style="width: 120px; height: 80px;margin-top: 6px;" alt=""
                            class="image">
                        <hr style="background: red;margin: 0px 20px;">
                        <img src="${SPECTRUM_CONFIG.SPECTRUM.serverPath}uploads/Images/Picture.png" style="width: 120px; height: 80px;" alt=""
                            class="image">
                    </div>
                </div>
        
        
                <div style="margin-top: 15px;">
                    <div class="heading standard-margin-top" style=" font-weight: bold">Frequency Spectrum
                        Authorization <span style="float: right;"> حیرصت فیطلا يددرتلا</span> </div>
        
                    <div class="heading standard-margin-top" style=" font-weight: bold;">Program Making & Special Events
                        Services <span style="float: right;">يجاتنلإا يف خلا ي ةصاخلا
                            تایلاعفلاوتامدخلاجاتنلإا </span> </div>
                    <div class="heading standard-margin-top"
                        style="display: flex !important; justify-content: space-between !important;margin-bottom: 10px">
                        <div style=" font-weight: bold;">
                            Authorization No.
                        </div>
                        <div style="text-decoration: underline; font-weight: bold;">
                            $orderid
                        </div>
                        <div style=" font-weight: bold;">
                            ر
                            حقر
                            ح
                        </div>
                    </div>
        
                    <table>
                        <tr>
                            <th class="serial th-font">1.</th>
                            <th class="th-font">Holder of Authorization</th>
                            <td class="th-font">$fullname</td>
                            <th class="th-font">حزمة الوسائط لجان كريستوب</th>
                            <th class="th-font">.1</th>
                        </tr>
                        <tr>
                            <th class="serial th-font">2.</th>
                            <th class="th-font">Permitted Venue of Operation</th>
                            <td class="th-font">$locationvenue</td>
                            <th class="th-font">وقع اكسبو 2020 جميع المواقع</th>
                            <th class="th-font">.2</th>
                        </tr>
                        <tr>
                            <th class="th-font" class="serial th-font">3.</th>
                            <th class="th-font">Assigned Frequencies </th>
                            <td class="th-font">$requiredfrequency MHz </td>
                            <th class="th-font"> ميجاهرتز</th>
                            <th class="th-font">.3</th>
                        </tr>
                        <tr>
                            <th class="serial th-font">4.</th>
                            <th class="th-font">Radiated Power (EIRP) </th>
                            <td class="th-font">$radiatedpower mW</td>
                            <th class="th-font">ميغاواط</th>
                            <th class="th-font">.4</th>
                        </tr>
                        <tr>
                            <th class="serial th-font">5.</th>
                            <th class="th-font">Bandwidth</th>
                            <td class="th-font">$bandwidth kHz</td>
                            <th class="th-font"> كيلو هرتز</th>
                            <th class="th-font">.5</th>
                        </tr>
                        <tr>
                            <th class="serial th-font ">6.</th>
                            <th class="th-font">Type of Service</th>
                            <td class="th-font">$servicetype</td>
                            <th class="th-font">معدات الميكروفون اللاسلكي</th>
                            <th class="th-font">.6</th>
                        </tr>
                        <tr>
                            <th class="serial th-font">7.</th>
                            <th class="th-font">Remarks</th>
                            <td class="th-font" id="last">
                                $comments
                            </td>
                            <th class="th-font">تاظحلام</th>
                            <th class="th-font">.7</th>
                        </tr>
        
        
                    </table>
                    <div class="heading" style="margin-top: 10px; margin-left: 10px; font-weight: bold; ">Radio
                        Equipment Specifications:</div>
                    <table>
        
                        <tr>
        
                            <th class="second_table_H th-font">Equipment Name<br>اسم الجهاز
                            <th class="second_table_H th-font">Manufacturer<br>الصانع
                            <th class="second_table_H th-font">Type/Model<br>النوع/الطراز
                            <th class="second_table_H th-font">Quantity<br>العداد
        
                        </tr>
                        <tr>
                            <td class="second_table_H th-font">$equipmenttype</td>
                            <td class="second_table_H th-font">$manufacture</td>
                            <td class="second_table_H th-font">$handheldtransmittermodel</td>
                            <td class="second_table_H th-font">$numberofidenticalhandheldtransmitter</th>
                        </tr>
                    </table>
                    <div style="margin: 10px;">
                        <div style="clear: both;display: flex;padding-top: 20px;">
                            <div
                                style="width: 50%;padding: 0px 5px;display: flex;justify-content: space-between;align-items: center;">
                                <span class="th-font" style="font-weight: bold;width: 150px;">Start Date</span>
                                <span class="th-font"
                                    style="text-align: center; font-weight: lighter;width: 150px;border-bottom: 2px solid black;">$startdate</span>
                                <span class="th-font" style=" font-weight: bold; width: 150px; direction: rtl;">تاريخ
                                    البدءمادختسلاا</span>
        
                            </div>
                            <div
                                style="width: 50%;padding: 0px 5px;display: flex;justify-content: space-between;align-items: center;">
                                <span class="th-font" style="font-weight: bold;width: 150px;">End Date</span>
                                <span class="th-font"
                                    style="text-align: center; font-weight: lighter;width: 150px;border-bottom: 2px solid black;">$enddate</span>
                                <span class="th-font" style=" font-weight: bold; width: 150px; direction: rtl;">تاريخ
                                    الانتهاء</span>
        
                            </div>
                        </div>
                        <div style="clear: both;display: flex;padding-top: 5px;">
                            <div
                                style="width: 50%;padding: 0px 5px;display: flex;justify-content: space-between;align-items: center;">
                                <span class="th-font" style="font-weight: bold;width: 150px;">Receipt
                                    No.</span>
                                <span class="th-font"
                                    style="text-align: center; font-weight: lighter;width: 150px;border-bottom: 2px solid black;">
                                    N/A
                                </span>
                                <span class="th-font" style=" font-weight: bold; width: 150px; direction: rtl;">رقم
                                    الإيصال</span>
                            </div>
                            <div
                                style="width: 50%;padding: 0px 5px;display: flex;justify-content: space-between;align-items: center;">
                                <span class="th-font" style="font-weight: bold;width: 150px;">Date of
                                    Receipt</span>
                                <span class="th-font"
                                    style="text-align: center; font-weight: lighter;width: 150px;border-bottom: 2px solid black;">N/A</span>
                                <span class="th-font" style=" font-weight: bold; width: 150px; direction: rtl;">لاصیلإا
                                    خیرات</span>
        
                            </div>
                        </div>
        
                        <div class="heading"
                            style="margin-top: 6px; margin-left: 10px; font-weight: bold; margin-top: 10px; text-align: center;">
                            Approved Electronic Authorization issued without signature by the General
                            Authority for Regulating the Telecommunication Sector. To verify this Authorization please call
                            80012
                        </div>
        
                        <div class="sub-heading"
                            style="margin-top: 6px; margin-left: 10px; font-weight: bold; margin-top: 10px; text-align: center">
                            فويض إلكتروني معتمد صادر بدون توقيع من الهيئة العامة لتنظيم قطاع الاتصالات.
        
                            للتحقق من هذا التصريح يرجى الاتصال على 80012</div>
                        <div class="sub-heading" style="margin-top: 10px; margin-left: 10px;margin-top: 10px;" class="th-font">
                            In
                            accordance with UAE
                            Telecommunications Law issued vide Federal Decree
                            by
                            Law
                            No.3 of 2003, the word
                            License is taken <br>to mean "Authorization"
                        </div>
                        <div class="sub-heading" style="margin-top: 10px; margin-left: 10px;margin-top: 10px">Terms & Conditions
                            apply, visit: www.tra.gov.ae/stc.</div>
                        <div class="small-heading" style="text-align: center; margin-top: 10px;">
                            <div style="margin-bottom: 6px; font-weight: bold;">Federal Authority <span>|
                                </span>الهيئة
                                الاتحادية </div>
                            <div style="font-weight: normal;">Tel +971 2 626 9999 فتاھ ♦ Fax +971 2 611 8229 سكاف ♦ ABU DHABI,
                                UNITED ARAB EMIRATE ةدحتملا
                                ةیبرعلا تاراملإا يبظوبأ، ♦ 26662P.O. BOX . ب.ص <br>www.tra.gov.ae</div>
                        </div>
                    </div>
                </div>
            </div>
        
        </body>
        
        </html>`

        if (table == 'customeclearence') {
            htmlTemplate = `<!DOCTYPE html>
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
                    margin-left: 2px;
                    width: 30%;
                    height: 30%;
                    object-fit: contain;
                    max-width: 250px;
                    max-width: 250px;
                }
            
                .second_img {
                    max-width: 50%;
                    margin-left: 20px;
                    width: 30%;
                    height: 30%;
                    object-fit: contain;
                }
            
                .third_img {
                    max-width: 250px;
                    margin-left: 20px;
                    width: 30%;
                    height: 30%;
                    object-fit: contain;
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
                    border: 2px solid black;
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
                    width: 25%;
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
            
                    .image-container {
                        display: flex;
                        justify-content: space-between;
                    }
            
                    .image-container>div {
                        width: 50%;
                    }
            
                    .image {
                        width: 30px !important;
                        height: 30px !important;
                        /* Maintain aspect ratio */
                        object-fit: contain;
                    }
            
                    .vl {
                        border-left: 6px solid green !important;
                        height: 500px !important;
                    }
                }
            
                .th-font {
                    font-size: 12px !important;
                }
            
                .heading {
                    font-size: 14px !important;
                }
            
                .sub-heading {
                    font-size: 12px !important;
                }
            
                .small-heading {
                    font-size: 10px !important;
                }
            
                .standard-margin-top {
                    margin-top: 10px;
                }
            </style>
            
            <body>
                <div style="padding: 10px 50px;">
                <div style="display: flex; justify-content: space-between;">
                <img src="${SPECTRUM_CONFIG.SPECTRUM.serverPath}uploads/Images/Picture1.png" style="width: 150px; height: 80px; margin-top: 6px;" alt=""
                    class="image">
                <div style="display: flex ;">
                    <img src="${SPECTRUM_CONFIG.SPECTRUM.serverPath}uploads/Images/Picture2.png" style="width: 120px; height: 80px;margin-top: 6px;" alt=""
                        class="image">
                    <hr style="background: red;margin: 0px 20px;">
                    <img src="${SPECTRUM_CONFIG.SPECTRUM.serverPath}uploads/Images/Picture.png" style="width: 120px; height: 80px;" alt=""
                        class="image">
                </div>
            </div>
            
            
                    <div style="margin-top: 15px;">
                        <div class="heading standard-margin-top" style=" font-weight: bold">Frequency Spectrum
                            Authorization <span style="float: right;"> حیرصت فیطلا يددرتلا</span> </div>
            
                        <div class="heading standard-margin-top" style=" font-weight: bold;">Program Making & Special Events
                            Services <span style="float: right;">يجاتنلإا يف خلا ي ةصاخلا
                                تایلاعفلاوتامدخلاجاتنلإا </span> </div>
                        <div class="heading standard-margin-top"
                            style="display: flex !important; justify-content: space-between !important;margin-bottom: 10px">
                            <div style=" font-weight: bold;">
                                Authorization No.
                            </div>
                            <div style="text-decoration: underline; font-weight: bold;">
                                $orderid
                            </div>
                            <div style=" font-weight: bold;">
                                ر
                                حقر
                                ح
                            </div>
                        </div>
            
                        <table>
                            <tr>
                                <th class="serial th-font">1.</th>
                                <th class="th-font">Holder of Authorization</th>
                                <td class="th-font">$fullname</td>
                                <th class="th-font">حزمة الوسائط لجان كريستوب</th>
                                <th class="th-font">.1</th>
                            </tr>
                            <tr>
                                <th class="serial th-font">2.</th>
                                <th class="th-font">Permitted Venue of Operation</th>
                                <td class="th-font">$locationvenue</td>
                                <th class="th-font">وقع اكسبو 2020 جميع المواقع</th>
                                <th class="th-font">.2</th>
                            </tr>
                            <tr>
                                <th class="th-font" class="serial th-font">3.</th>
                                <th class="th-font">Assigned Frequencies </th>
                                <td class="th-font">$requiredfrequency MHz </td>
                                <th class="th-font"> ميجاهرتز</th>
                                <th class="th-font">.3</th>
                            </tr>
                            <tr>
                                <th class="serial th-font">4.</th>
                                <th class="th-font">Radiated Power (EIRP) </th>
                                <td class="th-font">$radiatedpower mW</td>
                                <th class="th-font">ميغاواط</th>
                                <th class="th-font">.4</th>
                            </tr>
                            <tr>
                                <th class="serial th-font">5.</th>
                                <th class="th-font">Bandwidth</th>
                                <td class="th-font">$bandwidth kHz</td>
                                <th class="th-font"> كيلو هرتز</th>
                                <th class="th-font">.5</th>
                            </tr>
                            <tr>
                                <th class="serial th-font ">6.</th>
                                <th class="th-font">Type of Service</th>
                                <td class="th-font">$servicetype</td>
                                <th class="th-font">معدات الميكروفون اللاسلكي</th>
                                <th class="th-font">.6</th>
                            </tr>
                            <tr>
                                <th class="serial th-font">7.</th>
                                <th class="th-font">Remarks</th>
                                <td class="th-font" id="last">
                                    $comments
                                </td>
                                <th class="th-font">تاظحلام</th>
                                <th class="th-font">.7</th>
                            </tr>
            
            
                        </table>
                        <div class="heading" style="margin-top: 10px; margin-left: 10px; font-weight: bold; ">Radio
                            Equipment Specifications:</div>
                        <table>
            
                            <tr>
            
                                <th class="second_table_H th-font">Equipment Name<br>اسم الجهاز
                                <th class="second_table_H th-font">Manufacturer<br>الصانع
                                <th class="second_table_H th-font">Type/Model<br>النوع/الطراز
                                <th class="second_table_H th-font">Quantity<br>العداد
            
                            </tr>
                            <tr>
                                <td class="second_table_H th-font">$equipmenttype</td>
                                <td class="second_table_H th-font">$manufacture</td>
                                <td class="second_table_H th-font">$handheldtransmittermodel</td>
                                <td class="second_table_H th-font">$numberofidenticalhandheldtransmitter</th>
                            </tr>
                        </table>
                        <div style="margin: 10px;">
                            <div style="clear: both;display: flex;padding-top: 20px;">
                                <div
                                    style="width: 50%;padding: 0px 5px;display: flex;justify-content: space-between;align-items: center;">
                                    <span class="th-font" style="font-weight: bold;width: 150px;">Start Date</span>
                                    <span class="th-font"
                                        style="text-align: center; font-weight: lighter;width: 150px;border-bottom: 2px solid black;">$startdate</span>
                                    <span class="th-font" style=" font-weight: bold; width: 150px; direction: rtl;">تاريخ
                                        البدءمادختسلاا</span>
            
                                </div>
                                <div
                                    style="width: 50%;padding: 0px 5px;display: flex;justify-content: space-between;align-items: center;">
                                    <span class="th-font" style="font-weight: bold;width: 150px;">End Date</span>
                                    <span class="th-font"
                                        style="text-align: center; font-weight: lighter;width: 150px;border-bottom: 2px solid black;">$enddate</span>
                                    <span class="th-font" style=" font-weight: bold; width: 150px; direction: rtl;">تاريخ
                                        الانتهاء</span>
            
                                </div>
                            </div>
                            <div style="clear: both;display: flex;padding-top: 5px;">
                                <div
                                    style="width: 50%;padding: 0px 5px;display: flex;justify-content: space-between;align-items: center;">
                                    <span class="th-font" style="font-weight: bold;width: 150px;">Receipt
                                        No.</span>
                                    <span class="th-font"
                                        style="text-align: center; font-weight: lighter;width: 150px;border-bottom: 2px solid black;">
                                        N/A
                                    </span>
                                    <span class="th-font" style=" font-weight: bold; width: 150px; direction: rtl;">رقم
                                        الإيصال</span>
                                </div>
                                <div
                                    style="width: 50%;padding: 0px 5px;display: flex;justify-content: space-between;align-items: center;">
                                    <span class="th-font" style="font-weight: bold;width: 150px;">Date of
                                        Receipt</span>
                                    <span class="th-font"
                                        style="text-align: center; font-weight: lighter;width: 150px;border-bottom: 2px solid black;">N/A</span>
                                    <span class="th-font" style=" font-weight: bold; width: 150px; direction: rtl;">لاصیلإا
                                        خیرات</span>
            
                                </div>
                            </div>
            
                            <div class="heading"
                                style="margin-top: 6px; margin-left: 10px; font-weight: bold; margin-top: 10px; text-align: center;">
                                Approved Electronic Authorization issued without signature by the General
                                Authority for Regulating the Telecommunication Sector. To verify this Authorization please call
                                80012
                            </div>
            
                            <div class="sub-heading"
                                style="margin-top: 6px; margin-left: 10px; font-weight: bold; margin-top: 10px; text-align: center">
                                فويض إلكتروني معتمد صادر بدون توقيع من الهيئة العامة لتنظيم قطاع الاتصالات.
            
                                للتحقق من هذا التصريح يرجى الاتصال على 80012</div>
            
                            <div style="display: flex;">
            
                                <div class="sub-heading" style="margin-top: 10px; margin-left: 10px;margin-top: 10px;width: 50%;"
                                    class="th-font">
                                    In
                                    accordance with UAE
                                    Telecommunications Law issued vide Federal Decree
                                    by
                                    Law
                                    No.3 of 2003, the word
                                    License is taken <br>to mean "Authorization"
            
                                </div>
            
                                <div style="width: 50%;position: relative;">
                                    <img src="http://localhost:4500/uploads/Images/barcode.png" alt=""
                                        style="height: 100px;width: auto;object-fit: contain;position: absolute;right: 0px;
                                        ">
                                </div>
            
                            </div>
                            <div class="sub-heading" style="margin-top: 10px; margin-left: 10px;margin-top: 10px">Terms & Conditions
                                apply, visit: www.tra.gov.ae/stc.</div>
                            <div class="small-heading" style="text-align: center; margin-top: 10px;">
                                <div style="margin-bottom: 6px; font-weight: bold;">Federal Authority <span>|
                                    </span>الهيئة
                                    الاتحادية </div>
                                <div style="font-weight: normal;">Tel +971 2 626 9999 فتاھ ♦ Fax +971 2 611 8229 سكاف ♦ ABU DHABI,
                                    UNITED ARAB EMIRATE ةدحتملا
                                    ةیبرعلا تاراملإا يبظوبأ، ♦ 26662P.O. BOX . ب.ص <br>www.tra.gov.ae</div>
                            </div>
                        </div>
                    </div>
                </div>
            
            </body>
            </html>`
        }
        let updatedHtml = this.replacePlaceholders(htmlTemplate, model);
        // console.log('updatedHtml : ' + updatedHtml);
        return updatedHtml;
    }
    replacePlaceholders(htmlTemplate: string, model: any, date?: any) {
        // Use a regular expression to match placeholders like $key
        const placeholderRegex = /\$(\w+)/g;

        // Replace each placeholder with its corresponding value from the model
        const replacedHtml = htmlTemplate.replace(placeholderRegex, (match, key) => {
            if (key === 'qrcode') {
                // const qrCodeValue = 'https://ng.ant.design/docs/introduce/en';
                let qrCodeValue = `https://s3.me-south-1.amazonaws.com/campaigns.expocitydubai.com/pdfs/generated_pdf_${date}.pdf`;
                const qrCodeImage = this.generateQRCode(qrCodeValue);
                return `<div><img style='height: 40% !important;width: 40% !important;' src="${qrCodeImage}" alt="QR Code" /></div>`;
            }

            // Use the key to look up the value in the model
            const value = model[key] || '';

            if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(value)) {
                // Check if the value matches the ISO 8601 format for dates
                const date = new Date(value);
                return this.formatDate(date);
            }

            return value;
        });
        return replacedHtml;
    }

    generateQRCode(data: string): string {
        // Use your QR code library to generate the QR code image
        // This example assumes you have a library that returns a data URL for the image
        const qrCode = qr.imageSync(data, { type: 'png' });
        const dataUrl = `data:image/png;base64,${qrCode.toString('base64')}`;
        return dataUrl;
    }


    formatDate(value: any) {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(value)) {
            const [datePart, timePart] = value.split('T');
            const [year, month, day] = datePart.split('-');
            return `${day}/${month}/${year}`;
        } else if (value instanceof Date) {
            const day = value.getDate();
            const month = value.getMonth() + 1; // Adjust month (0-based) to be 1-based
            const year = value.getFullYear();

            // Ensure leading zeros for day and month if needed
            const formattedDay = day < 10 ? `0${day}` : `${day}`;
            const formattedMonth = month < 10 ? `0${month}` : `${month}`;

            return `${formattedDay}/${formattedMonth}/${year}`;
        } else {
            return value; // Return as is for non-date values
        }
    }
    makeTemplates(type: string, data: Record<string, string> = {}): string {
        const templates: Record<string, string> = {
            registered: `
            <!DOCTYPE html>
            <html lang="en">
               <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Account Registration - Spectrum Order Portal</title>
               </head>
               <body style="font-family: Arial, sans-serif; padding: 30px;">
                  <div style="padding-left: 50px; padding-top: 5px">
                     <p style="margin-bottom: 30px;">Dear $name,</p>
                     <p style="margin-bottom: 10px;">Welcome to the COP28 UAE Event!</p>
                     <p style="margin-bottom: 10px;">Thank you for registering for the COP28 Spectrum Order Portal.</p>
                     <p style="margin-bottom: 10px;">You will receive an email notification once your registration is approved by the Spectrum </p>
                     <p style="margin-bottom: 30px;">Team.</p>
                     <p>If you require any assistance for a request submission, please contact us at </p>
                     <p style="margin-bottom: 30px;"> <a href="mailto:cop28spectrum@esharah.ae">cop28spectrum@esharah.ae</a></p>
                     <p style="margin-bottom: 10px;">Best Regards,</p>
                     <p style="margin-bottom: 30px;">COP28 Spectrum Management Team</p>
                     <p><a href="https://spectrum.expocitydubai.com">spectrum.expocitydubai.com</a></p>
                     <p>Spectrum Help Desk Phone Number: <a href="tel:+971543060723">+971 54 306 0723</a></p>
                     <p>Spectrum Blue Zone Phone Number: <a href="tel:+971543060743">+971 54 306 0743</a></p>
                     <p>Spectrum Green Zone Phone Number: <a href="tel:+971543059757">+971 54 305 9757</a></p>
                  </div>
               </body>
            </html>
            `,
            userApproved: `
            <!DOCTYPE html>
            <html lang="en">
               <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Account Approval - Spectrum Order Portal</title>
                  <style>
                  </style>
               </head>
               <body style=" font-family: Arial, sans-serif;">
                  <div style="padding-left: 50px; padding-top: 5px">
                     <p>Dear $name,</p>
                     <p>Welcome to the COP28 UAE Event!</p>
                     <p style="margin-bottom: 10px;">We are pleased to inform you that your registration for the Spectrum Order Portal.</p>
                     <p style="margin-bottom: 10px;">has been successfully approved, and you can proceed with a new request for your </p>
                     <p style="margin-bottom: 30px;">equipment.</p>
                     <p><strong>Your Account Details:</strong></p>
                     <ul>
                        <li>Email Address: $username</li>
                     </ul>
                     <p>If you require any assistance for a request submission, please contact us at </p>
                     <p><a href="cop28spectrum@esharah.ae">cop28spectrum@esharah.ae</a>.</p>
                     <p>Best Regards,</p>
                     <p style="margin-bottom: 60px;">COP28 Spectrum Management Team</p>
                     <p><a href="https://spectrum.expocitydubai.com">spectrum.expocitydubai.com</a></p>
                     <p>Help Desk Phone Number: +971 54 306 0723</p>
                     <p>Blue Zone Phone Number: +971 54 306 0743</p>
                     <p>Green Zone Phone Number: +971 54 305 9757</p>
                  </div>
               </body>
            </html>
            `,
            resetPassword: `
            <!DOCTYPE html>
            <html lang="en">
               <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Password Reset Successful - Spectrum Order Portal</title>
               </head>
               <body style="font-family: Arial, sans-serif;">
                  <div style="padding-left: 50px; padding-top: 5px">
                     <p style="margin-bottom: 30px;">Dear $name,</p>
                     <p style="margin-bottom: 10px;">Please be informed that your password for Spectrum Order Portal has been reset</p>
                     <p>successfully.</p>
                     <p style="margin-bottom: 30px;">For access to your account, please follow the below details:</p>
                     <p style="margin-bottom: 10px;"><strong>Your Account Details:</strong></p>
                     <ul>
                        <li>Email Address: $username</li>
                     </ul>
                     <p style="margin-bottom: 10px;">If you did not send a request to reset your password, please contact our</p>
                     <p style="margin-bottom: 30px;">support team immediately at <a href="$email">$email</a>.</p>
                     <p style="margin-bottom: 30px;">Thank you for using Spectrum Order Portal.</p>
                     <p style="margin-bottom: 10px;">Best Regards,</p>
                     <p>COP28 Spectrum Management Team</p>
                     <p style="margin-bottom: 10px;"><a href="$webistUrl">$webistUrl</a></p>
                     <p style="margin-bottom: 10px;"> $ContactInformation</p>
                  </div>
               </body>
            </html>
            `,
            passwordLink: `
            <!DOCTYPE html>
            <html lang="en">
               <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Password Change Request - Spectrum Order Portal</title>
               </head>
               <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                  <div style="padding-left: 50px; padding-top: 5px">
                     <p style="margin-bottom: 30px;">Dear $name,</p>
                     <p >We received a request for a password change on your Spectrum Order Portal. You <br>
                        can reset your password through the below link:
                     </p>
                     <p style="margin-bottom: 10px;"><a href="$resetLink">$resetLink</a>.</p>
                     <p style="margin-bottom: 10px;">Your new password must:</p>
                     <ul style="list-style-type: square; margin-bottom: 15px; margin-left: 20px;">
                        <li>Contain more than 8 characters</li>
                        <li>Contain at least one number</li>
                        <li>Contain at least one capital letter</li>
                     </ul>
                     <p style="margin-bottom: 30px; margin-top: 26px;">Please note that this link is valid for a limited time and will expire after $expiryDate.</p>
                     <p style="margin-bottom: 10px;">In case you didn't request your password reset, please ignore this email.</p>
                     <p style="margin-bottom:30px ;">Thank you for using the Spectrum Order Portal. In case of more information or <br>
                        clarifications please refer to the Contact Information below. 
                     </p>
                     <p style="margin-bottom: 30px;">Best Regards,<br>
                        COP28 Spectrum Management Team
                     </p>
                     <p><a href="https://spectrum.expocitydubai.com" style="margin-bottom: 15px;">spectrum.expocitydubai.com</a></p>
                     <p style="margin-bottom: 10px;">Spectrum Help Desk Phone Number: +971 54 306 0723</p>
                     <p style="margin-bottom: 10px;">Spectrum Blue Zone Phone Number: +971 54 306 0743</p>
                     <p style="margin-bottom: 10px;">Spectrum Green Zone Phone Number: +971 54 305 9757</p>
                  </div>
               </body>
            </html>
            `,
            organizationCreate:
                `<!DOCTYPE html>
            <html lang="en">
            
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="styles.css">
                <title>Welcome to Organization</title>
            </head>
            
            <body style="margin: 0;padding: 0;font-family: 'Arial', sans-serif;background-color: #f5f5f5;">
                <div style="text-align: center;margin-top: 100px;">
                    <h1 style="color: #333;">Welcome to new organization <span style="color: #007bff;">$organization</span></h1>
                    <p style="font-size: 1.2em;color: #555;margin-top: 20px;">Hello, <span>$username</span>!</p>
                </div>
            </body>
            
            </html>`
        };

        if (data && Object.keys(data).length > 0) {
            templates[type] = this.replacePlaceholders(templates[type], data);
        }
        console.log('type : ' + type)
        return templates[type];
    }
    bufferToStream(buffer: Buffer): Readable {
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        return stream;
    }

    makeTickerInfo(data: any) {
        let htmlTemplate = '';
        htmlTemplate = `<!DOCTYPE html>
            <html>
            <head>
                <style>
                    .quotation {
                        border: 2px solid #333;
                        padding: 20px;
                        margin: 20px;
                        background-color: #f5f5f5;
                    }
                </style>
            </head>
            <body>
                <div class="quotation">
                    <h2>Ticket Information</h2>
                    <p><strong>Subject:</strong> $subject</p>
                    <p><strong>Status:</strong> $status</p>
                    <p><strong>Issue ID:</strong> $issueid</p>
                    <p><strong>Created By:</strong> $createdby</p>
                    <p><strong>Complaint Phone:</strong> $complaintphone</p>
                    <p><strong>Start Date:</strong> $startdate</p>
                    <p><strong>Location:</strong> $location</p>
                    <p><strong>Request Type:</strong> $requesttype</p>
                    <p><strong>Service:</strong> $service</p>
                    <p><strong>Severity:</strong> $severity</p>
                    <p><strong>Frequency:</strong> $frequency</p>
                    <p><strong>Support Group:</strong> $supportgroup</p>
                    <p><strong>Manager:</strong> $manager</p>
                    <p><strong>Engineer:</strong> $engineer</p>
                    <p><strong>Conclusion:</strong> $conclusion</p>
                    <p><strong>End Date:</strong> $enddate</p>
                    <p><strong>Duration:</strong> $duration</p>
                    <p><strong>Complaint Name:</strong> $complaintname</p>
                </div>
            </body>
            </html>
            `
        let updatedHtml = this.replacePlaceholders(htmlTemplate, data);
        // console.log('updatedHtml : ' + updatedHtml);
        return updatedHtml;
    }
}



