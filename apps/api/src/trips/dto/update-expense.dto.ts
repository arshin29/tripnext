import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_SPLIT_METHODS,
  ExpenseCategory,
  ExpenseSplitMethod,
} from '@tripnest/shared';
import { ExpenseSplitDto } from './create-expense.dto';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Expense title cannot be empty.' })
  @MaxLength(150, { message: 'Expense title cannot exceed 150 characters.' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters.' })
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(EXPENSE_CATEGORIES, {
    message: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
  })
  category?: ExpenseCategory;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must be a number with up to 2 decimal places.' },
  )
  @Min(0.01, { message: 'Expense amount must be greater than zero.' })
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  paidById?: string;

  @IsOptional()
  @IsISO8601(
    { strict: false },
    { message: 'Expense date must be a valid date string (YYYY-MM-DD).' },
  )
  expenseDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(EXPENSE_SPLIT_METHODS, {
    message: `Split method must be one of: ${EXPENSE_SPLIT_METHODS.join(', ')}`,
  })
  splitMethod?: ExpenseSplitMethod;

  @IsOptional()
  @IsArray({ message: 'Splits must be an array.' })
  @ArrayMinSize(1, { message: 'At least one participant must be included in the split.' })
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitDto)
  splits?: ExpenseSplitDto[];
}
