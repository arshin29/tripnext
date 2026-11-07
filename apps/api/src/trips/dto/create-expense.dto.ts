import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsNotEmpty,
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

export class ExpenseSplitDto {
  @IsString()
  @IsNotEmpty({ message: 'User ID is required for split.' })
  userId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Split amount must be a number with up to 2 decimal places.' },
  )
  @Min(0, { message: 'Split amount cannot be negative.' })
  amount?: number;
}

export class CreateExpenseDto {
  @IsString()
  @MinLength(1, { message: 'Expense title is required.' })
  @MaxLength(150, { message: 'Expense title cannot exceed 150 characters.' })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters.' })
  description?: string;

  @IsString()
  @IsIn(EXPENSE_CATEGORIES, {
    message: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
  })
  category!: ExpenseCategory;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must be a number with up to 2 decimal places.' },
  )
  @Min(0.01, { message: 'Expense amount must be greater than zero.' })
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  @IsNotEmpty({ message: 'Paid by user ID is required.' })
  paidById!: string;

  @IsISO8601(
    { strict: false },
    { message: 'Expense date must be a valid date string (YYYY-MM-DD).' },
  )
  @IsNotEmpty({ message: 'Expense date is required.' })
  expenseDate!: string;

  @IsString()
  @IsIn(EXPENSE_SPLIT_METHODS, {
    message: `Split method must be one of: ${EXPENSE_SPLIT_METHODS.join(', ')}`,
  })
  splitMethod!: ExpenseSplitMethod;

  @IsArray({ message: 'Splits must be an array.' })
  @ArrayMinSize(1, { message: 'At least one participant must be included in the split.' })
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitDto)
  splits!: ExpenseSplitDto[];
}
