import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { Strategy } from 'passport-local';
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:
        '0193c29ad58f4211bde65108419095c45eb363e05e70c66a48f40b2d4c807176',
    });
  }

  async validate(username: string, password: string): Promise<any> {
    console.log('local auth');
    console.log(username, ' ', password);
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
