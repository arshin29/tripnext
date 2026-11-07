import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORTED_CURRENCIES } from '@tripnest/shared';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty({ message: 'Destination is required.' })
  destinationId!: string;

  @IsString()
  @MinLength(1, { message: 'Trip title is required.' })
  @MaxLength(150, { message: 'Trip title cannot exceed 150 characters.' })
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601(
    { strict: false },
    { message: 'Start date must be a valid date string (YYYY-MM-DD).' },
  )
  @IsNotEmpty({ message: 'Start date is required.' })
  startDate!: string;

  @IsISO8601(
    { strict: false },
    { message: 'End date must be a valid date string (YYYY-MM-DD).' },
  )
  @IsNotEmpty({ message: 'End date is required.' })
  endDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Traveler count must be an integer.' })
  @Min(1, { message: 'At least 1 traveler is required.' })
  @Max(100, { message: 'Traveler count cannot exceed 100.' })
  travelerCount?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Budget amount must be a number.' })
  @Min(0, { message: 'Budget cannot be negative.' })
  budgetAmount?: number;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_CURRENCIES, {
    message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
  })
  currency?: string = 'INR';

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Cover image must be a valid URL.' })
  coverImage?: string;
}
