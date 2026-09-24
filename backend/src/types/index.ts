import { Request } from 'express';
import { IUser } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface HeaderItem {
  key: string;
  value: string;
  enabled: boolean;
}

export interface VariableItem {
  key: string;
  value: string;
}

export interface RequestTemplate {
  url: string;
  headers: HeaderItem[];
  body?: string;
}

export interface ProxyRequestData {
  method: HttpMethod;
  url: string;
  headers: HeaderItem[];
  body?: string;
  environmentName?: string;
  resolvedVariables?: VariableItem[];
  template?: RequestTemplate;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}
