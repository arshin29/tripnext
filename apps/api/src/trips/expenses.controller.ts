import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@tripnest/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /**
   * Get user-wide expenses overview across all their trips and shared trips.
   */
  @Get('overview')
  async getOverview(@CurrentUser('id') userId: string): Promise<ApiResponse<any>> {
    const data = await this.expensesService.getUserExpensesOverview(userId);
    return {
      success: true,
      data,
    };
  }
}
