import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from './types/authenticated-user.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @ApiOperation({
    summary: 'Register a new account (public)',
    description:
      'Always creates a TECHNICIAN account. Privileged fields are rejected. Rate limited.',
  })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @ApiOperation({
    summary: 'Log in and obtain a JWT (public)',
    description:
      'Returns a generic 401 for any invalid credentials. Rate limited.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Authenticated()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the authenticated user profile (any authenticated role)',
  })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token' })
  @Get('profile')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.profile(user);
  }
}
