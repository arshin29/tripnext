import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty({ message: 'Itinerary day ID is required.' })
  itineraryDayId!: string;

  @IsString()
  @MinLength(1, { message: 'Activity title is required.' })
  @MaxLength(150, { message: 'Activity title cannot exceed 150 characters.' })
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Location cannot exceed 150 characters.' })
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
  startTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Duration must be an integer.' })
  @Min(0, { message: 'Duration cannot be negative.' })
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
