import { Request } from 'express';

export interface JwtPayload {
  id: number;
  nome: string;
  isAdmin: boolean;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
