// crate-db.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { userInfo } from 'os';
import { Pool } from 'pg';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';

@Injectable()
export class CrateDbService {
    private readonly cratePool;

    constructor() {
        const CRATE_CONNECTION_STRING = 'postgres://admin:aiappup2024@172.23.0.7:5432';
        this.cratePool = new Pool({
            connectionString: CRATE_CONNECTION_STRING,
            idleTimeoutMillis: 15000,
            connectionTimeoutMillis: 5000,
            query_timeout: 30000,
        });
    }

    async executeQuery(statement: string, values: any[] = []): Promise<any> {
        const client = await this.cratePool.connect();
        try {
            const result = await client.query(statement, values);
            return new ApiResponse(true, 'Data Retrieved', result.rows);

        } catch (error) {
            return new ApiResponse(false, error.message);
        }
        finally {
            client.release();
        }
    }

}
