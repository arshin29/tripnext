import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateItineraryDayDto {
  @IsISO8601(
    { strict: false },
    { message: 'Date must be a valid date string (YYYY-MM-DD).' },
  )
  @IsNotEmpty({ message: 'Date is required.' })
  date!: string;

  @Type(() => Number)
  @IsInt({ message: 'Day number must be an integer.' })
  @Min(1, { message: 'Day number must be at least 1.' })
  dayNumber!: number;

  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Title cannot exceed 150 characters.' })
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
