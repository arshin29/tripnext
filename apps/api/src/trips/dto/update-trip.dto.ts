import {
  IsIn,
  IsInt,
  IsISO8601,
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
import { SUPPORTED_CURRENCIES, TRIP_STATUSES, TripStatus } from '@tripnest/shared';

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  destinationId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Trip title cannot be empty.' })
  @MaxLength(150, { message: 'Trip title cannot exceed 150 characters.' })
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsISO8601(
    { strict: false },
    { message: 'Start date must be a valid date string (YYYY-MM-DD).' },
  )
  startDate?: string;

  @IsOptional()
  @IsISO8601(
    { strict: false },
    { message: 'End date must be a valid date string (YYYY-MM-DD).' },
  )
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Traveler count must be an integer.' })
  @Min(1, { message: 'At least 1 traveler is required.' })
  @Max(100, { message: 'Traveler count cannot exceed 100.' })
  travelerCount?: number;

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
  currency?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Cover image must be a valid URL.' })
  coverImage?: string;

  @IsOptional()
  @IsString()
  @IsIn(TRIP_STATUSES, {
    message: `Status must be one of: ${TRIP_STATUSES.join(', ')}`,
  })
  status?: TripStatus;
}
