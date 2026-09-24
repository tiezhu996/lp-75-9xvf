import { Environment, EnvVariable, Header } from '../types';

const PLACEHOLDER_REGEX = /\{\{\s*([^{}]+?)\s*\}\}/g;

export const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const findUnresolvedVariables = (text: string): string[] => {
  const names: string[] = [];
  const matches = text.matchAll(PLACEHOLDER_REGEX);

  for (const match of matches) {
    const name = (match[1] as string).trim();
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }

  return names;
};

const replaceKnownVariables = (text: string, variables: EnvVariable[]): string => {
  if (!text) {
    return text;
  }

  let result = text;
  variables.forEach((variable) => {
    if (variable.value === '') {
      return;
    }
    const pattern = new RegExp(`\\{\\{\\s*${escapeRegExp(variable.key.trim())}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, variable.value);
  });

  return result;
};

export interface RequestTemplate {
  url: string;
  headers: Header[];
  body?: string;
}

export interface ResolvedRequest extends RequestTemplate {}

export interface ResolveResult {
  resolved: ResolvedRequest;
  missingVariables: string[];
}

/**
 * 按当前环境替换 URL、Header、Body 中的 {{变量名}} 占位符。
 * 变量未定义或值为空时收集到 missingVariables，由调用方提示并中止发送。
 */
export const resolveRequestTemplate = (
  template: RequestTemplate,
  environment: Environment | null
): ResolveResult => {
  const variables = environment?.variables ?? [];

  const resolvedHeaders = template.headers.map((header) => ({
    ...header,
    key: replaceKnownVariables(header.key, variables),
    value: replaceKnownVariables(header.value, variables),
  }));

  const resolved: ResolvedRequest = {
    url: replaceKnownVariables(template.url, variables),
    headers: resolvedHeaders,
    body: template.body !== undefined ? replaceKnownVariables(template.body, variables) : undefined,
  };

  const missingVariables: string[] = [];
  const collectMissing = (text: string | undefined) => {
    if (!text) {
      return;
    }
    findUnresolvedVariables(text).forEach((name) => {
      if (!missingVariables.includes(name)) {
        missingVariables.push(name);
      }
    });
  };

  collectMissing(resolved.url);
  resolved.headers.forEach((header) => {
    collectMissing(header.key);
    collectMissing(header.value);
  });
  collectMissing(resolved.body);

  return { resolved, missingVariables };
};
