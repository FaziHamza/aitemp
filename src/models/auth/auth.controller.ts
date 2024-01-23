import { Body, Controller, Get, Param, Post, Put, Delete, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';

@Controller('auth')
export class AuthController {
  /**
   *
   */
  constructor(private readonly authService: AuthService) {

  }
  @Post('/signup')
  async createUser(@Body() body: any, @Request() req
  ): Promise<any> {
    try {
      console.log("body " + JSON.stringify(body))
      return await this.authService.registerUser(body);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }
  @Post('/signupExternal')
  async createUserExternalLogin(@Body() body: any, @Request() req
  ): Promise<any> {
    try {
      console.log("body " + JSON.stringify(body))
      return await this.authService.createUserExternal(body);
    } catch (error) {
      // Handle the error here, you can log it or return a specific error response
      return new ApiResponse(false, error.message);
    }
  }
  @Post('/login/:type')
  async login(@Body() req,@Param('type') type: string) {
    // console.dir(req)
    if (!req?.responsekey || req?.responsekey.trim() === '') {
      return { success: false, message: 'No reCAPTCHA found' };
    }

    //   const isRecaptchaValid = await this.recaptchaService.validateRecaptcha(req.responsekey, req.domain);
    //   if (!isRecaptchaValid) {
    //     return { success: false, message: 'Invalid reCAPTCHA token' };
    //   }

    return this.authService.login(type,req);
  }
  @Get('getAppDetails/:tablename/:domain')
  async GetAll(@Param('tablename') tablename: string, @Param('domain') domain: string): Promise<any> {
    return await this.authService.getAppDetails(tablename, domain);
  }
  @Get('/domain/:type/:id')
  async getByDomain(@Param('id') id: string,@Param('type') type: string): Promise<ApiResponse<any>> {
      return this.authService.getByDomain(type,id);
  }
}
