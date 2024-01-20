import { Module } from '@nestjs/common';
import { CrateDbService } from './crateDb.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';


@Module({
    imports: [
    ],
    controllers: [],
    providers: [CrateDbService],
    exports: [CrateDbService], // Export if used outside CommonModule
})
export class CommonModule { }
