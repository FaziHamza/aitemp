// recaptcha.service.ts

import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RecaptchaService {

  async validateRecaptcha(token: string,tt:string): Promise<boolean> {
    const RECAPTCHA_URL = 'https://www.google.com/recaptcha/api/siteverify';
    const secretKey = `6LcZ59MnAAAAAEvterzmyEOFsIcbzF-Uf_ksmMCd`; // Store your key in an environment variable
  
    try {
      const response = await axios.post(RECAPTCHA_URL, null, {
        params: {
          secret: secretKey,
          response: token,
        },
      });
      console.log("Response from reCAPTCHA: ", JSON.stringify(response.data));
      return response.data.success;
    } catch (error) {
      console.error("Error during reCAPTCHA validation: ", error);
      throw new Error('Error validating reCAPTCHA token');
    }
  }
  
}
