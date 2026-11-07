import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSuggestionDto {
  @IsString()
  @IsNotEmpty({ message: 'Itinerary day ID is required.' })
  itineraryDayId!: string;

  @IsString()
  @MinLength(1, { message: 'Suggestion title is required.' })
  @MaxLength(150, { message: 'Suggestion title cannot exceed 150 characters.' })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters.' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Location cannot exceed 200 characters.' })
  location?: string;

  @ValidateIf((o) => o.longitude !== undefined && o.longitude !== null)
  @IsNotEmpty({ message: 'Latitude is required when longitude is provided.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a valid number.' })
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees.' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees.' })
  latitude?: number;

  @ValidateIf((o) => o.latitude !== undefined && o.latitude !== null)
  @IsNotEmpty({ message: 'Longitude is required when latitude is provided.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a valid number.' })
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees.' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees.' })
  longitude?: number;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in 24-hour HH:MM format (e.g. 09:30 or 14:00).',
  })
  startTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Duration must be an integer in minutes.' })
  @Min(1, { message: 'Duration must be at least 1 minute.' })
  durationMinutes?: number;
}
