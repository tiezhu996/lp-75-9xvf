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

export interface ProxyRequestData {
  method: HttpMethod;
  /** 实际发送使用的请求配置（占位符应已被前端替换） */
  url: string;
  headers: HeaderItem[];
  body?: string;
  /** 原始模板（保留 {{变量名}}），用于历史恢复 */
  templateUrl?: string;
  templateHeaders?: HeaderItem[];
  templateBody?: string;
  /** 发送时所选环境 */
  environmentId?: string;
  environmentName?: string;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}
