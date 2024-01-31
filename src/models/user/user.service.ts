import { Injectable } from '@nestjs/common';
import { CrateDbService } from 'src/common/common/crateDb.service';
import { DB_CONFIG, SECRETS } from 'src/shared/config/global-db-config';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { HashService } from 'src/shared/services/hash/hash.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';
import { JwtService } from '@nestjs/jwt';
import { CommonService } from 'src/shared/services/common/common.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UserService {
    constructor(
        private authService: AuthService
    ) { }


    async login(user: any, body, token): Promise<ApiResponse<any>> {
        try {
            return await this.authService.login(DB_CONFIG.CRATEDB.mode, user, body, token);

        }
        catch (error) {
            console.log('error : ' + error)
            return new ApiResponse(false, error.message);
        }
    }
}
