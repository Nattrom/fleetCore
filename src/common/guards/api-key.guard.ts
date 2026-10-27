import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

interface ApiKeyRequest {
  header(name: string): string | undefined;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const provided = context
      .switchToHttp()
      .getRequest<ApiKeyRequest>()
      .header('x-api-key');
    const allowed = this.config.get<string[]>('apiKeys') ?? [];
    if (!provided || allowed.length === 0) {
      throw new UnauthorizedException('Invalid API key');
    }

    const valid = allowed.some((key) => {
      const expectedBytes = Buffer.from(key);
      const providedBytes = Buffer.from(provided);
      return (
        expectedBytes.length === providedBytes.length &&
        timingSafeEqual(expectedBytes, providedBytes)
      );
    });
    if (!valid) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
