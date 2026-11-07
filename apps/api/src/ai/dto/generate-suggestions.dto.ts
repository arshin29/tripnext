import {
  AiBudgetLevel,
  AiPace,
  AiTripTheme,
  GenerateAiSuggestionsInput,
} from '@tripnest/shared';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class GenerateSuggestionsDto implements GenerateAiSuggestionsInput {
  @IsOptional()
  @IsIn(['RELAXED', 'BALANCED', 'INTENSIVE', 'PACKED'], {
    message: 'Pace must be one of: RELAXED, BALANCED, INTENSIVE, PACKED.',
  })
  pace?: AiPace;

  @IsOptional()
  @IsIn(['RELAXED', 'BALANCED', 'INTENSIVE', 'PACKED'], {
    message: 'Pacing must be one of: RELAXED, BALANCED, INTENSIVE, PACKED.',
  })
  pacing?: AiPace;

  @IsOptional()
  @IsArray({ message: 'Themes must be an array.' })
  @IsIn(['CULTURE', 'ADVENTURE', 'FOOD', 'RELAXATION', 'NATURE', 'HISTORIC'], {
    each: true,
    message:
      'Each theme must be one of: CULTURE, ADVENTURE, FOOD, RELAXATION, NATURE, HISTORIC.',
  })
  themes?: AiTripTheme[];

  @IsOptional()
  @IsString()
  @MaxLength(300, {
    message: 'Free text prompt cannot exceed 300 characters.',
  })
  freeTextPrompt?: string;

  @IsOptional()
  @IsIn(['BUDGET', 'MODERATE', 'LUXURY'], {
    message: 'Budget level must be one of: BUDGET, MODERATE, LUXURY.',
  })
  budgetLevel?: AiBudgetLevel;
}
