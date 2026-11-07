import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, SavedDestination } from '@tripnest/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SavedDestinationsService } from './saved-destinations.service';

@Controller('saved-destinations')
@UseGuards(JwtAuthGuard)
export class SavedDestinationsController {
  constructor(private readonly savedDestinationsService: SavedDestinationsService) {}

  /**
   * Retrieve all saved destinations for the currently logged-in user.
   */
  @Get()
  async getSaved(
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse<SavedDestination[]>> {
    const data = await this.savedDestinationsService.getUserSaved(userId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Add a destination to the user's wishlist.
   */
  @Post(':destinationId')
  @HttpCode(HttpStatus.CREATED)
  async save(
    @CurrentUser('id') userId: string,
    @Param('destinationId') destinationId: string,
  ): Promise<ApiResponse<SavedDestination>> {
    const data = await this.savedDestinationsService.save(userId, destinationId);
    return {
      success: true,
      message: 'Destination saved to your wishlist.',
      data,
    };
  }

  /**
   * Remove a destination from the user's wishlist.
   */
  @Delete(':destinationId')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('destinationId') destinationId: string,
  ): Promise<ApiResponse<{ success: boolean; destinationId: string }>> {
    const data = await this.savedDestinationsService.remove(userId, destinationId);
    return {
      success: true,
      message: 'Destination removed from your wishlist.',
      data,
    };
  }
}
