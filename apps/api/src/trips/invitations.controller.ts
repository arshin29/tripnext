import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, InvitationDetails } from '@tripnest/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollaborationService } from './collaboration.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly collaborationService: CollaborationService) {}

  /**
   * Inspect an invitation by raw invitation token.
   * Public endpoint to render invitation card or login/accept prompt.
   */
  @Get(':token')
  async getInvitation(
    @Param('token') token: string,
  ): Promise<ApiResponse<InvitationDetails>> {
    const data = await this.collaborationService.getInvitationByToken(token);
    return {
      success: true,
      data,
    };
  }

  /**
   * Accept an invitation.
   * Requires authenticated user whose email matches the invited email.
   */
  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @CurrentUser('id') userId: string,
    @Param('token') token: string,
  ): Promise<ApiResponse<{ tripId: string }>> {
    const result = await this.collaborationService.acceptInvitation(userId, token);
    return {
      success: true,
      message: result.message,
      data: { tripId: result.tripId },
    };
  }

  /**
   * Decline an invitation.
   * Requires authenticated user whose email matches the invited email.
   */
  @Post(':token/decline')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async declineInvitation(
    @CurrentUser('id') userId: string,
    @Param('token') token: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    const result = await this.collaborationService.declineInvitation(userId, token);
    return {
      success: true,
      message: result.message,
      data: { success: true },
    };
  }
}
