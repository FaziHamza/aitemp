import { Module } from '@nestjs/common';
import { CrudController } from './crud.controller';
import { CrudService } from './crud.service';
import { CrateDbService } from 'src/common/common/crateDb.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';

@Module({
  imports: [  ],
  controllers: [CrudController],
  providers: [CrudService,CrateDbService,QueryGenratorService],
})
export class CrudModule { }
