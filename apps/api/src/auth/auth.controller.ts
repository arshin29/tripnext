import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiResponse, AuthResponseData, SafeUser } from '@tripnest/shared';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { clearAuthCookie, setAuthCookie } from './utils/cookie.util';

@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get<string>('nodeEnv') === 'production';
  }

  /**
   * Register a new user account and set the session cookie.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<AuthResponseData>> {
    const { user, token } = await this.authService.register(dto);
    setAuthCookie(res, token, this.isProduction);

    return {
      success: true,
      message: 'Account created successfully. Welcome to TripNext.',
      data: { user },
    };
  }

  /**
   * Sign in an existing user and set the session cookie.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<AuthResponseData>> {
    const { user, token } = await this.authService.login(dto);
    setAuthCookie(res, token, this.isProduction);

    return {
      success: true,
      message: 'Welcome back.',
      data: { user },
    };
  }

  /**
   * Log out the current user and invalidate the session cookie.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response): Promise<ApiResponse<null>> {
    clearAuthCookie(res, this.isProduction);

    return {
      success: true,
      message: 'You have been signed out.',
      data: null,
    };
  }

  /**
   * Retrieve the current authenticated user's profile.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: SafeUser): ApiResponse<AuthResponseData> {
    return {
      success: true,
      message: 'Session valid.',
      data: { user },
    };
  }

  /**
   * Update the current authenticated user's profile or password.
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse<AuthResponseData>> {
    const user = await this.authService.updateProfile(userId, dto);

    return {
      success: true,
      message: 'Profile updated successfully.',
      data: { user },
    };
  }
}
