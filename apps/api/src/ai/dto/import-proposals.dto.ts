import {
  ImportAiProposalsInput,
  ImportProposalItemInput,
} from '@tripnest/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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
  ValidateNested,
} from 'class-validator';

export class ImportProposalItemDto implements ImportProposalItemInput {
  @IsString()
  @IsNotEmpty({ message: 'Itinerary day ID is required.' })
  itineraryDayId!: string;

  @IsString()
  @MinLength(1, { message: 'Title is required.' })
  @MaxLength(150, { message: 'Title cannot exceed 150 characters.' })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters.' })
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Location cannot exceed 150 characters.' })
  location?: string | null;

  @ValidateIf((o) => o.longitude !== undefined && o.longitude !== null)
  @IsNotEmpty({ message: 'Latitude is required when longitude is provided.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a valid number.' })
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees.' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees.' })
  latitude?: number | null;

  @ValidateIf((o) => o.latitude !== undefined && o.latitude !== null)
  @IsNotEmpty({ message: 'Longitude is required when latitude is provided.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a valid number.' })
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees.' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees.' })
  longitude?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Start time must be in HH:MM format (24-hour).',
  })
  startTime?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Duration must be an integer.' })
  @Min(1, { message: 'Duration must be at least 1 minute.' })
  @Max(1440, { message: 'Duration cannot exceed 1440 minutes (24 hours).' })
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters.' })
  notes?: string | null;
}

export class ImportAiProposalsDto implements ImportAiProposalsInput {
  @IsArray({ message: 'Proposals must be an array.' })
  @ArrayMinSize(1, { message: 'At least one proposal is required to import.' })
  @ArrayMaxSize(50, { message: 'Cannot import more than 50 proposals at once.' })
  @ValidateNested({ each: true })
  @Type(() => ImportProposalItemDto)
  proposals!: ImportProposalItemDto[];
}
