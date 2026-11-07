import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class ReorderActivitiesDto {
  @IsString()
  @IsNotEmpty({ message: 'Itinerary day ID is required.' })
  itineraryDayId!: string;

  @IsArray({ message: 'activityIds must be an array.' })
  @ArrayNotEmpty({ message: 'activityIds array cannot be empty.' })
  @IsString({ each: true, message: 'Each activityId must be a string.' })
  activityIds!: string[];
}
