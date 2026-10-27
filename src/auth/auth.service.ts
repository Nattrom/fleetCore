import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { QueryFailedError } from 'typeorm';
import { UserRole } from '../common/enums/index.js';
import { PasswordHasherService } from '../common/security/password-hasher.service.js';
import { AuditService } from '../audit/audit.service.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly passwords: PasswordHasherService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ id: string; name: string; email: string; role: UserRole }> {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Email is already registered');
    }

    let user: User;
    try {
      user = await this.users.create({
        name: dto.name.trim(),
        email,
        passwordHash: await this.passwords.hash(dto.password),
        role: UserRole.TECHNICIAN,
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { driverError?: { code?: string } }).driverError?.code ===
          '23505'
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
    await this.audit.record({
      userId: user.id,
      action: 'REGISTER',
      entity: 'User',
      entityId: user.id,
      details: { role: user.role },
    });
    return this.publicUser(user);
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    user: { id: string; name: string; email: string; role: UserRole };
  }> {
    const user = await this.users.findByEmail(dto.email);
    if (!user?.isActive) {
      await this.passwords.verifyDummy(dto.password);
      throw new UnauthorizedException('Incorrect email or password');
    }
    const verification = await this.passwords.verifyAndUpgrade(
      user.passwordHash,
      dto.password,
    );
    if (!verification.valid) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    if (verification.replacementHash) {
      await this.users.updatePasswordHash(
        user.id,
        verification.replacementHash,
      );
    }

    const expiresIn = this.config.getOrThrow<string>(
      'jwt.expiresIn',
    ) as JwtSignOptions['expiresIn'];
    const accessToken = await this.jwt.signAsync(
      { sub: user.id },
      { expiresIn },
    );
    await this.audit.record({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
    });
    return { accessToken, user: this.publicUser(user) };
  }

  profile(user: { id: string; name: string; email: string; role: UserRole }) {
    return user;
  }

  private publicUser(user: User) {
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}
