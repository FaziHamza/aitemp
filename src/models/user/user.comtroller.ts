import { Body, Controller, Get, Param, Post, Put, Delete, Request, Headers, UseGuards } from '@nestjs/common';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { TokenService } from '../token/token.service';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('user')
export class UserController {

    constructor(private readonly tokenService: TokenService, private userService: UserService) {
    }
    @Post('info')
    async getInfo(@Headers('authorization') authHeader: string, @Body() body) {
        const token = authHeader.split(' ')[1]; // Assuming the token is sent in the "Bearer" format

        if (token) {
            const decodedToken = this.tokenService.decodeToken(token);

            if (decodedToken) {
                // Token is valid, you can use the decoded information
                let user: any = await this.userService.login(decodedToken, body, token);
                if (user.isSuccess == false && user.message == 'username is incorrect') {
                    user.data = [decodedToken]
                    return user;
                } else {
                    return user;
                }
                // return { user: decodedToken };
            } else {
                // Token is invalid or expired
                return { error: 'Invalid or expired token' };
            }
        } else {
            // Token is not provided in the request
            return { error: 'Token not provided' };
        }
    }
}
