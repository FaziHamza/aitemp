import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put, Headers,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CrudService } from './crud.service';
import { TokenService } from '../token/token.service';

// @UseGuards(AuthGuard('jwt'))
@Controller('knex-crud')
export class CrudController {
    constructor(private readonly knexCrudService: CrudService ,private readonly tokenService: TokenService) { }

    @Post(':table')
    async create(
        @Param('table') table: string,
        @Body() data: any,
        @Headers('authorization') authHeader: string
    ): Promise<number> {
        try {
        const { organizationId, applicationId} = await this.tokenService.decodeTokenDetail(authHeader.split(' ')[1]);
            const id = await this.knexCrudService.create(table, data, organizationId, applicationId);
            console.log(id);
            return id;
        } catch (error) {
            throw error;
        }
    }

    @Get(':table')
    async read(@Param('table') table: string): Promise<any> {
        return this.knexCrudService.read(table);
    }

    @Get(':table/:id')
    async readById(
        @Param('table') table: string,
        @Param('id') id: number,
    ): Promise<any> {
        return this.knexCrudService.readById(table, id);
    }

    @Put(':table/:id')
    async update(
        @Param('table') table: string,
        @Param('id') id: number,
        @Body() data: any,
    ): Promise<void> {
        try {
            await this.knexCrudService.update(table, id, data);
        } catch (error) {
            throw error;
        }
    }

    @Delete(':table/:id')
    async delete(
        @Param('table') table: string,
        @Param('id') id: number,
    ): Promise<void> {
        try {
            await this.knexCrudService.delete(table, id);
        } catch (error) {
            throw error;
        }
    }
    @Get('/getPending/:table/:screenBuilderId')
    async getPending(@Param('table') table: string, @Param('screenBuilderId') screenBuilderId: string): Promise<any> {
        return this.knexCrudService.getPending(table, screenBuilderId);
    }
}
