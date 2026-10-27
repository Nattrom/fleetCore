import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { QueryFailedError } from 'typeorm';
import { UserRole } from '../common/enums/index.js';
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
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ id: string; name: string; email: string; role: UserRole }> {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('El correo ya está registrado');
    }

    let user: User;
    try {
      user = await this.users.create({
        name: dto.name.trim(),
        email,
        passwordHash: await argon2.hash(dto.password),
        role: UserRole.TECHNICIAN,
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { driverError?: { code?: string } }).driverError?.code ===
          '23505'
      ) {
        throw new ConflictException('El correo ya está registrado');
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
    if (
      !user?.isActive ||
      !(await argon2.verify(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
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
