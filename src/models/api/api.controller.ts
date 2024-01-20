import { Body, Controller, Get, Param, Post, Request, Put, Delete, Headers } from '@nestjs/common';
import { ApiService } from './api.service';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { CommonService } from 'src/shared/services/common/common.service';

@Controller('cp')
export class ApiController {

  constructor(private readonly apiService: ApiService, private readonly commonService: CommonService) { }

  @Get('/:tablename')
  async GetAll(@Param('tablename') tablename: string, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<any> {
    const table = this.commonService.tableList.find(entry => entry.key === tablename.toLowerCase());
    if (table) {
      tablename = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    return await this.apiService.getAll(tablename, organizationId, appId, userId);
  }
  @Get('/:modelType/:id')
  async getById(@Param('modelType') modelType: string, @Param('id') id: string, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    return this.apiService.getById(modelType, id, organizationId, appId, userId);
  }
  @Post('')
  async create(@Body() body: any, @Request() req, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<any> {
    try {
      const keys = Object.keys(body);
      const tablename = keys[0];
      const table = this.commonService.tableList.find(entry => entry.key === tablename.toLowerCase());
      if (table) {
        body = { [table.value]: body[tablename] };
      } else {
        return new ApiResponse(false, 'Key not found');
      }

      return await this.apiService.create(body, organizationId, appId, userId);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }

  @Put('/:modelType/:id')
  async update(@Param('modelType') modelType: string, @Param('id') id: string, @Body() body: any, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<any> {
    try {
      const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
      if (table) {
        body = { [table.value]: body[modelType] };
        modelType = table.value;
      } else {
        return new ApiResponse(false, 'Key not found');
      }
      return this.apiService.update(modelType, id, body, organizationId, appId, userId);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }
  @Delete('/:modelType/:id')
  async delete(@Param('modelType') modelType: string, @Param('id') id: string, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    return this.apiService.delete(modelType, id, organizationId, appId, userId);
  }
  @Post('/deleteAction/:modelType/:screenBuilderId')
  async actionCRUD(@Body() body: any, @Headers('ApplicationId') appId: string, @Param('modelType') modelType: string, @Param("screenBuilderId") screenBuilderId: string): Promise<ApiResponse<any>> {
    // console.log('Delete Action', body);
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    return this.apiService.actionCRUD(body, appId, screenBuilderId, modelType);
  }
  @Post('/ActionRule/:modelType/:screenBuilderId')
  async actionRuleCRUD(@Body() body: any, @Headers('ApplicationId') appId: string, @Param('modelType') modelType: string, @Param("screenBuilderId") screenBuilderId: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    return this.apiService.actionRuleCRUD(body, appId, screenBuilderId, modelType);
  }
  @Post('/emailtemplates/:modelType')
  async emailTemplateCRUD(@Body() body: any, @Headers('ApplicationId') appId: string, @Param('modelType') modelType: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    return this.apiService.emailTemplateCRUD(body, appId, modelType);
  }

  @Post('/PolicyMapping/:modelType/:policyId?')
  async deletePolicyMapping(@Body() body: any, @Headers('ApplicationId') appId: string, @Param('modelType') modelType: string , @Param('policyId') policyId: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    return this.apiService.policyMappingCRUD(body, appId, modelType , policyId);
  }
  @Get('/domain/:modelType/:id')
  async getByDomain(@Param('modelType') modelType: string, @Param('id') id: string, @Headers('userId') userId: string, @Headers('PolicyId') PolicyId: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    return this.apiService.getByDomain(modelType, id, userId);
  }
  @Get('/getmenu/:modelType/:id')
  async getBuilderMenu(@Param('modelType') modelType: string, @Param('id') id: string, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<ApiResponse<any>> {
    const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    if (table) {
      modelType = table.value;
    } else {
      return new ApiResponse(false, 'Key not found');
    }
    return this.apiService.getBuilderMenu(modelType, id, organizationId, appId, userId);
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
  async defaultApplication(@Body() body: any, @Headers('ApplicationId') appId: string, @Param('modelType') modelType: string): Promise<ApiResponse<any>> {
    // const table = this.commonService.tableList.find(entry => entry.key === modelType.toLowerCase());
    // if (table) {
    //   modelType = table.value;
    // } else {
    //   return new ApiResponse(false, 'Key not found');
    // }
    return this.apiService.defaultApplication(body);
  }

  @Post('/insertNewTable')
  async insertNewTable(@Body() body: any, @Request() req, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<any> {
    try {
      return await this.apiService.insertNewTable(body, organizationId, appId, userId);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }

  @Post('/createTable')
  async createTable(@Body() body: any, @Request() req, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<any> {
    try {
      return await this.apiService.createTable(body, organizationId, appId, userId);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }

  @Post('/dropColumn')
  async dropColumns(@Body() body: any, @Request() req, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<any> {
    try {
      return await this.apiService.dropColumns(body, organizationId, appId, userId);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }

  @Delete('/dropTable/:tableName')
  async dropTable(@Param('tableName') tableName: string, @Request() req, @Headers('OrganizationId') organizationId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<any> {
    try {
      return await this.apiService.dropTable(tableName, organizationId, appId, userId);
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
  async checkUserScreen(@Param('screenId') screenId: string, @Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<ApiResponse<any>> {
      return await this.apiService.checkUserScreen(screenId, appId, userId);
  }
  @Get('/auth/pageAuth/testing/111')
  async testing(@Headers('ApplicationId') appId: string, @Headers('userId') userId: string): Promise<ApiResponse<any>> {
      return await this.apiService.testing(appId);
  }
  @Get('/userpolicy/getUserPolicyMenu/:id')
  async getUserPolicyMenu(@Headers('ApplicationId') appId: string, @Headers('userId') userId: string, @Headers('PolicyId') PolicyId: string): Promise<ApiResponse<any>> {
      return this.apiService.getUserPolicyMenu(appId, PolicyId);
  }
}
