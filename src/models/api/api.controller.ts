import { Body, Controller, Get, Param, Post, Request, Put, Delete, Headers, UseGuards } from '@nestjs/common';
import { ApiService } from './api.service';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { CommonService } from 'src/shared/services/common/common.service';
import { AuthGuard } from '@nestjs/passport';
import { TokenService } from '../token/token.service';

@UseGuards(AuthGuard('jwt'))
@Controller('cp')
export class ApiController {

  constructor(private readonly apiService: ApiService, private readonly commonService: CommonService, private readonly tokenService: TokenService) { }

  @Get('/:tablename')
  async GetAll(@Param('tablename') tablename: string, @Headers('authorization') authHeader: string): Promise<any> {
    const table = this.commonService.tableList.find(entry => entry.key === tablename.toLowerCase());
    if (table) {
      tablename = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    const { organizationId, applicationId, userId, username } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return await this.apiService.getAll(tablename, organizationId, applicationId, userId, username);
  }
  @Get('/:modelType/:id')
  async getById(@Param('modelType') modelType: string, @Param('id') id: string, @Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    const { organizationId, applicationId, userId, username } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return this.apiService.getById(modelType, id, organizationId, applicationId, userId, username);
  }
  @Post('')
  async create(@Body() body: any, @Headers('authorization') authHeader: string): Promise<any> {
    try {
      const keys = Object.keys(body);
      const tablename = keys[0];
      const table = this.commonService.tableList.find(entry => entry.key === tablename.toLowerCase());
      if (table) {
        body = { [table.value]: body[tablename] };
      } else {
        return new ApiResponse(false, 'Key not found');
      }
      const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
      return await this.apiService.create(body, organizationId, applicationId, userId);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }

  @Put('/:modelType/:id')
  async update(@Param('modelType') modelType: string, @Param('id') id: string, @Body() body: any, @Headers('authorization') authHeader: string, @Request() req): Promise<any> {
    try {
      const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
      if (table) {
        body = { [table.value]: body[modelType] };
        modelType = table.value;
      } else {
        return new ApiResponse(false, 'Key not found');
      }
      const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
      return this.apiService.update(modelType, id, body, organizationId, applicationId, userId, req.headers.origin);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }
  @Delete('/:modelType/:id')
  async delete(@Param('modelType') modelType: string, @Param('id') id: string, @Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return this.apiService.delete(modelType, id, organizationId, applicationId, userId);
  }
  @Post('/deleteAction/:modelType/:screenBuilderId')
  async actionCRUD(@Body() body: any, @Headers('authorization') authHeader: string, @Param('modelType') modelType: string, @Param("screenBuilderId") screenBuilderId: string): Promise<ApiResponse<any>> {
    // console.log('Delete Action', body);
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    const { applicationId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);

    return this.apiService.actionCRUD(body, applicationId, screenBuilderId, modelType);
  }
  @Post('/ActionRule/:modelType/:screenBuilderId')
  async actionRuleCRUD(@Body() body: any, @Headers('authorization') authHeader: string, @Param('modelType') modelType: string, @Param("screenBuilderId") screenBuilderId: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    const { applicationId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return this.apiService.actionRuleCRUD(body, applicationId, screenBuilderId, modelType);
  }
  @Post('/emailtemplates/:modelType')
  async emailTemplateCRUD(@Body() body: any, @Param('modelType') modelType: string, @Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    const { applicationId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);

    return this.apiService.emailTemplateCRUD(body, applicationId, modelType);
  }

  @Post('/PolicyMapping/:modelType/:policyId?')
  async deletePolicyMapping(@Body() body: any, @Param('modelType') modelType: string, @Param('policyId') policyId: string, @Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    const { applicationId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);

    return this.apiService.policyMappingCRUD(body, applicationId, modelType, policyId);
  }
  @Get('/domain/:modelType/:id')
  async getByDomain(@Param('modelType') modelType: string, @Param('id') id: string, @Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    const { userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return this.apiService.getByDomain(modelType, id, userId);

  }
  @Get('/getmenu/:modelType/:id')
  async getBuilderMenu(@Param('modelType') modelType: string, @Param('id') id: string, @Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);

    return this.apiService.getBuilderMenu(modelType, id, organizationId, applicationId, userId);
  }
  @Get('/applications/cloneApplicationData/:modelType')
  async cloneApplicationData(@Param('modelType') modelType: string) {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }

    return this.apiService.cloneApplicationData(modelType);
  }
  // @Get('/applications/deleteApplicationData/:modelType')
  // async deleteApplicationData(@Param('modelType') modelType: string) {
  //   return this.apiService.appDelete(modelType);
  // }
  @Post('/defaultApplication/postData/insertData')
  async defaultApplication(@Body() body: any, @Param('modelType') modelType: string): Promise<ApiResponse<any>> {
    // const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    // if (table) {
    //   modelType = table.value;
    // } else {
    //   return new ApiResponse(false, 'Key not found');
    // }
    return this.apiService.defaultApplication(body);
  }

  @Post('/insertNewTable')
  async insertNewTable(@Body() body: any, @Headers('authorization') authHeader: string): Promise<any> {
    try {
      const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);

      return await this.apiService.insertNewTable(body, organizationId, applicationId, userId);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }

  @Post('/CreateOrg')
  async CreateOrg(@Body() body: any): Promise<any> {
    try {
      return await this.apiService.CreateOrg(body);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }

  @Post('/createTable')
  async createTable(@Body() body: any, @Headers('authorization') authHeader: string): Promise<any> {
    try {
      const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);

      return await this.apiService.createTable(body, organizationId, applicationId, userId);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }

  @Post('/dropColumn')
  async dropColumns(@Body() body: any, @Headers('authorization') authHeader: string): Promise<any> {
    try {
      const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);

      return await this.apiService.dropColumns(body, organizationId, applicationId, userId);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }

  @Delete('/dropTable/:tableName')
  async dropTable(@Param('tableName') tableName: string, @Headers('authorization') authHeader: string): Promise<any> {
    try {
      const { organizationId, applicationId, userId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);

      return await this.apiService.dropTable(tableName, organizationId, applicationId, userId);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }
  @Get('/applications/sampleScreen/:modelType')
  async sampleScreen(@Param('modelType') modelType: string) {
    // const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    // if (table) {
    //   modelType = table.value;
    // } else {
    //   return new ApiResponse(false, 'Key not found');
    // }
    return this.apiService.sampleScreen(modelType);
  }
  @Get('/auth/pageAuth/:screenId')
  async checkUserScreen(@Param('screenId') screenId: string, @Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    const { applicationId, userId, policyid } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return await this.apiService.checkUserScreen(screenId, applicationId, userId, policyid);
  }
  @Get('/auth/pageAuth/testing/111')
  async testing(@Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    const { applicationId, } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return await this.apiService.testing(applicationId);
  }
  @Get('/userpolicy/getUserPolicyMenu/:id')
  async getUserPolicyMenu(@Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    const { applicationId, policyid } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return this.apiService.getUserPolicyMenu(applicationId, policyid);
  }
  @Get('/getuserCommentsByApp/:modelType/:type/:screenId?')
  async getuserCommentsByApp(@Param('modelType') modelType: string, @Param('screenId') screenId: string, @Param('type') type: string, @Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    const { applicationId } = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
    return this.apiService.getuserCommentsByApp(modelType, screenId, type, applicationId);
  }
  @Get('/getAll/application/byOrgId')
  async getByOrgId(@Headers('OrganizationId') orgId: string) {
    return this.apiService.getByOrgId(orgId);
  }
}
