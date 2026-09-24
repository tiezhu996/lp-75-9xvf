export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

export interface EnvVariable {
  key: string;
  value: string;
}

export interface Environment {
  _id: string;
  userId: string;
  name: string;
  variables: EnvVariable[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface ApiEndpoint {
  _id: string;
  userId: string;
  collectionId: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: Header[];
  body?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  historyId: string;
}

export interface RequestSnapshot {
  url: string;
  headers: Header[];
  body?: string;
}

export interface RequestHistory {
  _id: string;
  userId: string;
  method: HttpMethod;
  /** 原始模板（保留 {{变量名}}），恢复时放回输入区 */
  url: string;
  headers: Header[];
  body?: string;
  /** 发送时实际使用的替换值快照 */
  resolved?: RequestSnapshot;
  /** 发送时所选环境（名称为快照，环境删除后仍保留） */
  environment?: {
    id?: string;
    name: string;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    duration: number;
  };
  createdAt: string;
}

export interface RequestConfig {
  method: HttpMethod;
  /** 实际发送使用的请求配置（占位符已替换） */
  url: string;
  headers: Header[];
  body?: string;
  /** 原始模板（保留 {{变量名}}），用于历史记录 */
  templateUrl?: string;
  templateHeaders?: Header[];
  templateBody?: string;
  /** 发送时所选环境 */
  environmentId?: string;
  environmentName?: string;
}
