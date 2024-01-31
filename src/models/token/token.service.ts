import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DB_CONFIG, SECRETS } from 'src/shared/config/global-db-config';

@Injectable()
export class TokenService {
  private readonly secretKey = SECRETS.secretKey; // Replace with your actual secret key

  generateToken(username: string, applicationId: string, externalLogin: any, pageLink: any): string {

    const payload = { username, applicationId, externalLogin, pageLink };
    const token = jwt.sign(payload, this.secretKey, { expiresIn: '10h' });
    return token;
  }

  decodeToken(token: string): any | null {
    try {
      const decoded = jwt.verify(token, this.secretKey);

      return decoded;
    } catch (error) {
      // Handle invalid or expired token
      console.error('Error decoding token:', error.message);
      return null;
    }
  }
  decodeTokenDetail(token: string) {
    const decodeToken = this.decodeToken(token);
    let flattenedObject = this.flattenObject(decodeToken.userDetail ? decodeToken.userDetail : decodeToken);
    return flattenedObject;
  }
  flattenObject(obj: any): any {
    let result: any = {};
    for (const key in obj) {
      const newKey = key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        result = { ...result, ...this.flattenObject(obj[key]) };
      } else if (Array.isArray(obj[key])) {
        result[newKey] = obj[key].map((item: any, index: number) => this.flattenObject(item));
      } else {
        result[newKey] = obj[key];
      }
    }
    return result;
  }


}
