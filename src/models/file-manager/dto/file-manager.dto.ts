// import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FileManagerDto {
  // @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly path: string;
}
