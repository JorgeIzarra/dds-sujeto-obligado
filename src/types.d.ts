/* eslint-disable @typescript-eslint/no-unused-vars */
import { JWTPayload } from './security/jwt.service';

declare global {
  namespace Express {
    interface Request {
      usuario?: JWTPayload;
    }
  }
}
