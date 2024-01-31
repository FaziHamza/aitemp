import { Body, Controller, Get, Param, Post, Put, Delete, Request, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { RecaptchaService } from './recaptcha.service';
import { TokenService } from '../token/token.service';


@Controller('auth')
export class AuthController {
  /**
   *
   */
  constructor(private readonly authService: AuthService, private recaptchaService: RecaptchaService,
    private readonly tokenService: TokenService) {

  }
  @Post('/signup')
  async createUser(@Body() body: any, @Request() req
  ): Promise<any> {
    try {
      if (!body.responsekey || body.responsekey.trim() === '') {
        return { success: false, message: 'No reCAPTCHA found' };
      }

      const isRecaptchaValid = await this.recaptchaService.validateRecaptcha(body.responsekey, body.domain);
      if (!isRecaptchaValid) {
        return { success: false, message: 'Invalid reCAPTCHA token' };
      }
      return await this.authService.registerUser(body, req.headers.origin);
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
  async login(@Body() req, @Param('type') type: string) {
    // console.dir(req)
    if (!req?.responsekey || req?.responsekey.trim() === '') {
      return { success: false, message: 'No reCAPTCHA found' };
    }

    const isRecaptchaValid = await this.recaptchaService.validateRecaptcha(req.responsekey, req.domain);
    if (!isRecaptchaValid) {
      return { success: false, message: 'Invalid reCAPTCHA token' };
    }

    return this.authService.login(type, req);
  }
  @Get('getAppDetails/:tablename/:domain')
  async GetAll(@Param('tablename') tablename: string, @Param('domain') domain: string): Promise<any> {
    return await this.authService.getAppDetails(tablename, domain);
  }
  @Get('/domain/:type/:id')
  async getByDomain(@Param('id') id: string, @Param('type') type: string): Promise<ApiResponse<any>> {
    return this.authService.getByDomain(type, id);
  }
  @Post('resetpassword')
  async resetPassword(@Body() body, @Request() req): Promise<ApiResponse<any>> {
    return this.authService.resetPassword(body, req.headers.origin);
  }
  @Post('/forgot')
  async create(@Body() body, @Request() req, @Headers('authorization') authHeader: string,) {
    console.dir(req)
    if (!req?.body?.responsekey || req?.body?.responsekey.trim() === '') {
      return { success: false, message: 'No reCAPTCHA found' };
    }

    const isRecaptchaValid = await this.recaptchaService.validateRecaptcha(req.body.responsekey, req.body.domain);
    if (!isRecaptchaValid) {
      return { success: false, message: 'Invalid reCAPTCHA token' };
    }
    return this.authService.create(body, req.headers.origin);
  }
}
