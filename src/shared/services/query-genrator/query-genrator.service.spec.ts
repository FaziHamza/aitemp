import { Test, TestingModule } from '@nestjs/testing';
import { QueryGenratorService } from './query-genrator.service';

describe('QueryGenratorService', () => {
  let service: QueryGenratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryGenratorService],
    }).compile();

    service = module.get<QueryGenratorService>(QueryGenratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
