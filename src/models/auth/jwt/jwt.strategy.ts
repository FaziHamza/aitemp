import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ExtractJwt } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { SECRETS } from 'src/shared/config/global-db-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:SECRETS.secretKey,
    });
  }

  async validate(payload: any) {
    return { username: payload.username };
  }
}
