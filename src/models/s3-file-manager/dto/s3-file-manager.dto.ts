// import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class S3FileManagerDto {
  // @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly path: string;
  parentId:string
}
