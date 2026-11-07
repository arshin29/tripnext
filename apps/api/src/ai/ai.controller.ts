import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AiConciergeResponse,
  ApiResponse,
  ImportAiProposalsResult,
  SafeUser,
} from '@tripnest/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { GenerateSuggestionsDto, ImportAiProposalsDto } from './dto';

@Controller('trips/:id/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /api/trips/:id/ai/suggestions
   * Generate curated or AI-driven activity proposals for a trip.
   */
  @Post('suggestions')
  @HttpCode(HttpStatus.OK)
  async getSuggestions(
    @CurrentUser() user: SafeUser,
    @Param('id') tripId: string,
    @Body() dto: GenerateSuggestionsDto,
  ): Promise<ApiResponse<AiConciergeResponse>> {
    const data = await this.aiService.generateSuggestions(user.id, tripId, dto);
    return {
      success: true,
      data,
      message: 'AI activity suggestions generated successfully.',
    };
  }

  /**
   * POST /api/trips/:id/ai/import
   * Securely import selected AI proposals into the itinerary.
   */
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  async importProposals(
    @CurrentUser() user: SafeUser,
    @Param('id') tripId: string,
    @Body() dto: ImportAiProposalsDto,
  ): Promise<ApiResponse<ImportAiProposalsResult>> {
    const data = await this.aiService.importProposals(user.id, tripId, dto);
    return {
      success: true,
      data,
      message: `Successfully imported ${data.importedCount} activity proposal(s)${
        data.skippedCount > 0 ? ` (${data.skippedCount} duplicate(s) skipped)` : ''
      }.`,
    };
  }
}
