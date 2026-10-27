import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Mechanic } from '../mechanics/entities/mechanic.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AuthenticatedUser } from './types/authenticated-user.js';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Mechanic)
    private readonly mechanics: Repository<Mechanic>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Token inválido');
    }
    const user = await this.users.findOne({
      where: { id: payload.sub, isActive: true },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales no válidas');
    }

    const mechanic = await this.mechanics.findOne({
      where: { userId: user.id, isActive: true },
      select: { id: true },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mechanicId: mechanic?.id ?? null,
    };
  }
}
