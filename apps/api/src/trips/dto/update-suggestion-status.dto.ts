import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateSuggestionStatusDto {
  @IsNotEmpty({ message: 'Status is required.' })
  @IsIn(['APPROVED', 'REJECTED'], {
    message: 'Status must be either APPROVED or REJECTED.',
  })
  status!: 'APPROVED' | 'REJECTED';
}
