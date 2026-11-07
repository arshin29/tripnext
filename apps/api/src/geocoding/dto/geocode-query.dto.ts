import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class GeocodeQueryDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(2, { message: 'Search query must be at least 2 characters long.' })
  @MaxLength(150, { message: 'Search query cannot exceed 150 characters.' })
  q!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100, { message: 'Context hint cannot exceed 100 characters.' })
  contextHint?: string;
}
