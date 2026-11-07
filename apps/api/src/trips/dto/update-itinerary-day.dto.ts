import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateItineraryDayDto {
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Title cannot exceed 150 characters.' })
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
