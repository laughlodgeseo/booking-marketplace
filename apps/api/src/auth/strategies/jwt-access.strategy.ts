import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, type StrategyOptions } from 'passport-jwt';
import type { UserRole } from '@prisma/client';
import { requiredJwtSecret } from '../../common/config/env.validation';

export type JwtAccessPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: requiredJwtSecret('JWT_ACCESS_SECRET'),
    };
    super(options);
  }

  validate(payload: JwtAccessPayload): AuthUser {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
