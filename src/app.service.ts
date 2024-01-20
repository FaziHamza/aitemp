import { Injectable } from '@nestjs/common';
import { CrateDbService } from './common/common/crateDb.service';

@Injectable()
export class AppService {
  constructor() { }

  async getHello() {
   
      return "WELCOM TO AIAP";
  }
}
