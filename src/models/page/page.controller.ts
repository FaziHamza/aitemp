import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { PageService } from './page.service';
import { Body, Controller, Get, Param, Post, Query, Headers, UseInterceptors, UploadedFile, Req, } from '@nestjs/common';


@Controller('knex-query')
export class PageController {
    constructor(private readonly pageService: PageService) { }

    @Post('')
    async create(@Body() data: any, @Req() request: any, @Headers('ApplicationId') appId: string, @Headers('screenBuildId') screenBuildId: string, @Headers('OrganizationId') orgId: string, @Headers('User') user: string,) {
        return this.pageService.saveDb(data, screenBuildId, appId, orgId, request, user);
    }
    @Post('/execute-actions/:screenBuilderId')
    async executeActions(@Body() data: any, @Headers('ApplicationId') appId: string, @Headers('policyId') policyId: string, @Headers('screenBuildId') screenBuildId: string, @Headers('User') user: string, @Headers('OrganizationId') orgId: string, @Headers('screenId') screenId: string, @Param('screenBuilderId') screenBuilderId: string) {
        return this.pageService.processActionRules(appId, orgId, user, policyId, screenId, screenBuildId, screenBuilderId, data);
    }
    @Post('/execute-rules/:ruleId')
    async executeRules(@Body() data: any, @Headers('ApplicationId') appId: string, @Req() request: any, @Headers('screenBuildId') screenBuildId: string, @Headers('User') user: string, @Headers('policyId') policyId: string, @Headers('OrganizationId') orgId: string, @Headers('screenId') screenId: string, @Param('ruleId') ruleId: string) {
        return this.pageService.executeRules(appId, orgId, user, request, policyId, screenId, screenBuildId, ruleId, data);
    }
    @Post('/executeDelete-rules/:ruleId')
    async executeDeleteRules(@Body() data: any, @Headers('ApplicationId') appId: string, @Req() request: any, @Headers('screenBuildId') screenBuildId: string, @Headers('User') user: string, @Headers('policyId') policyId: string, @Headers('OrganizationId') orgId: string, @Headers('screenId') screenId: string, @Param('ruleId') ruleId: string) {
        return this.pageService.executeDeleteRules(appId, orgId, user, request, policyId, screenId, screenBuildId, ruleId, data);
    }
    @Get('/getexecute-rules/:ruleId/:parentId?')
    async getexecuteRules(@Headers('ApplicationId') appId: string, @Req() request: any,
        @Headers('OrganizationId') orgId: string, @Headers('policyId') policyId: string, @Headers('screenBuildId') screenBuildId: string,
        @Headers('User') user: string, @Headers('screenId') screenId: string, @Param('ruleId') ruleId: string, @Param('parentId') parentId: string,
        @Query('search') search?: string,
        @Query('filters') filters?: string,
        @Query('page') page?: number,
        @Query('pageSize') pageSize?: number,) {
        console.log(`search : ${search}`)
        return this.pageService.getexecuteRules(appId, orgId, user, request, policyId, screenId, screenBuildId, ruleId, parentId, page, pageSize, search, filters);
    }
    @Get('/getAction/:id/:parentId')
    async getDb(
        @Param('id') id: string,
        @Headers('User') user: string,
        @Param('parentId') parentId: string,
        @Query('page') page?: number,
        @Query('pageSize') pageSize?: number,
    ) {
        const result = this.pageService.getDb(id, user, parentId, page, pageSize, '');
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
    async executeQuery(@Body() data: any, @Req() request: any, @Headers('ApplicationId') appId: string, @Param('actionId') actionId: string, @Headers('User') user: string): Promise<ApiResponse<any[]>> {
        return await this.pageService.executeDeleteQueries(data, appId, request, actionId, user);
    }

    // @Post('savecsv/:ruleId')
    // @UseInterceptors(FileInterceptor('file'))
    // async uploadFile(@UploadedFile() file, @Param('ruleId') ruleId: string, @Headers('ApplicationId') appId: string, @Headers('User') user: string, @Headers('OrganizationId') orgId: string,) {
    //     return this.pageService.uploadExcelFileV2(file, ruleId, appId, orgId, user);
    //     // return this.pageService.uploadExcelFile(file, tableName);
    // }
  
}
