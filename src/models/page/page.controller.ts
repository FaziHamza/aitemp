import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { PageService } from './page.service';
import { Body, Controller, Get, Param, Post, Query, Headers, UseInterceptors, UploadedFile, Req, Request } from '@nestjs/common';
import { TokenService } from '../token/token.service';

@Controller('knex-query')
export class PageController {
    constructor(private readonly pageService: PageService , private readonly tokenService: TokenService) { }

    @Post('')
    async create(@Body() data: any, @Req() request: any, @Headers('authorization') authHeader: string, @Headers('screenBuildId') screenBuildId: string, @Headers('User') user: string) {
        const { organizationId, applicationId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
        return this.pageService.saveDb(data, screenBuildId, applicationId, organizationId, request, user);
    }
    @Post('/execute-actions/:screenBuilderId')
    async executeActions(@Request() req, @Body() data: any,@Headers('authorization') authHeader: string, @Headers('screenBuildId') screenBuildId: string, @Headers('screenId') screenId: string, @Param('screenBuilderId') screenBuilderId: string) {
        const { organizationId, applicationId, username , policyid , externalLogin} = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
        return this.pageService.processActionRules(req, applicationId, organizationId, username, policyid, screenId, screenBuildId, screenBuilderId, data , externalLogin);
    }
    @Post('/execute-rules/:ruleId')
    async executeRules(@Request() req, @Body() data: any, @Headers('authorization') authHeader, @Req() request: any, @Headers('screenBuildId') screenBuildId: string, @Headers('screenId') screenId: string, @Param('ruleId') ruleId: string) {
        const { organizationId, applicationId, username , policyid , externalLogin} = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
        return this.pageService.executeRules(req, applicationId, organizationId, username, request, policyid, screenId, screenBuildId, ruleId, data , externalLogin);
    }
    @Post('/executeDelete-rules/:ruleId')
    async executeDeleteRules(@Request() req, @Body() data: any, @Headers('authorization') authHeader, @Req() request: any, @Headers('screenBuildId') screenBuildId: string, @Headers('screenId') screenId: string, @Param('ruleId') ruleId: string) {
        const { organizationId, applicationId, userId, policyid , externalLogin} = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
        return this.pageService.executeDeleteRules(req, applicationId, organizationId, userId, request, policyid, screenId, screenBuildId, ruleId, data , externalLogin);
    }
    @Get('/getexecute-rules/:ruleId/:parentId?')
    async getexecuteRules(@Req() request: any,
        @Request() req,
        @Headers('authorization') authHeader, @Headers('screenBuildId') screenBuildId: string,
         @Headers('screenId') screenId: string, @Param('ruleId') ruleId: string, @Param('parentId') parentId: string,
        @Query('search') search?: string,
        @Query('filters') filters?: string,
        @Query('page') page?: number,
        @Query('pageSize') pageSize?: number,) {
        console.log(`search : ${search}`)
        const { organizationId, applicationId, userId, policyid , externalLogin} = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
        return this.pageService.getexecuteRules(req, applicationId, organizationId, userId, request, policyid, screenId, screenBuildId, ruleId, parentId, page, pageSize, search, filters,externalLogin);
    }
    @Get('/getAction/:id/:parentId')
    async getDb(
        @Param('id') id: string,
        @Headers('authorization') authHeader,
        @Param('parentId') parentId: string,
        @Query('page') page?: number,
        @Query('pageSize') pageSize?: number,
    ) {
        const {username} = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
        const result = this.pageService.getDb(id, username, parentId, page, pageSize, '');
        return result;
    }


    // @Get(':screen')
    // async read(@Param('screen') screen: string,
    //     @Query('page') page?: number,
    //     @Query('pageSize') pageSize?: number, @Headers('ApplicationId') appId?: string): Promise<any> {
    //     return this.pageService.read(screen, page, pageSize, appId);
    // }

    // @Get()
    // async joinTables(
    //     @Query('tables') tables: string,
    //     @Query('relationIds') relationIds: string
    // ): Promise<any> {
    //     const tableNames = tables.split(',');
    //     const relationIdList = relationIds.split(',');

    //     if (tableNames.length !== relationIdList.length) {
    //         throw new Error('The number of tables must match the number of relationIds');
    //     }

    //     try {
    //         let query = this.knex
    //             .select()
    //             .from(tableNames[0]);

    //         for (let i = 1; i < tableNames.length; i++) {
    //             query = query.innerJoin(
    //                 tableNames[i],
    //                 `${tableNames[i - 1]}.${relationIdList[i - 1]}`,
    //                 `${tableNames[i]}.${relationIdList[i]}`
    //             );
    //         }

    //         const result = await query;

    //         return result;
    //     } catch (error) {
    //         console.error('Error occurred during joinTables:', error);
    //         throw new Error('Internal server error');
    //     }
    // }
    @Post('executeQuery/:actionId?')
    async executeQuery(@Body() data: any, @Req() request: any, @Headers('authorization') authHeader, @Param('actionId') actionId: string): Promise<ApiResponse<any[]>> {
        const { organizationId, applicationId, userId, username } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
        return await this.pageService.executeDeleteQueries(data, applicationId, request, actionId, username);
    }

    // @Post('savecsv/:ruleId')
    // @UseInterceptors(FileInterceptor('file'))
    // async uploadFile(@UploadedFile() file, @Param('ruleId') ruleId: string, @Headers('ApplicationId') appId: string, @Headers('User') user: string, @Headers('OrganizationId') orgId: string,) {
    //     return this.pageService.uploadExcelFileV2(file, ruleId, appId, orgId, user);
    //     // return this.pageService.uploadExcelFile(file, tableName);
    // }

}
