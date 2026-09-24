import { Environment, EnvVariable, Header } from '../types';

export const replaceEnvVariables = (
  text: string,
  environment: Environment | null
): string => {
  if (!environment || !environment.variables) {
    return text;
  }

  let result = text;
  environment.variables.forEach((variable: EnvVariable) => {
    const pattern = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g');
    result = result.replace(pattern, variable.value);
  });

  return result;
};

export const extractEnvVariables = (text: string): string[] => {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (!matches.includes(match[1] as string)) {
      matches.push(match[1] as string);
    }
  }

  return matches;
};

export interface ResolvedRequest {
  url: string;
  headers: Header[];
  body: string;
  usedVariables: EnvVariable[];
}

export type ResolveRequestResult =
  | { success: true; resolved: ResolvedRequest }
  | { success: false; missing: string[] };

export const resolveRequestConfig = (
  url: string,
  headers: Header[],
  body: string,
  environment: Environment | null
): ResolveRequestResult => {
  const texts = [url, body, ...headers.flatMap((h) => [h.key, h.value])];
  const variables = environment?.variables || [];

  const missing: string[] = [];
  texts.forEach((text) => {
    extractEnvVariables(text).forEach((name) => {
      const variable = variables.find((v) => v.key === name);
      if ((!variable || variable.value === '') && !missing.includes(name)) {
        missing.push(name);
      }
    });
  });

  if (missing.length > 0) {
    return { success: false, missing };
  }

  const usedKeys = new Set<string>();
  texts.forEach((text) => {
    extractEnvVariables(text).forEach((name) => usedKeys.add(name));
  });
  const usedVariables = variables.filter((v) => usedKeys.has(v.key));

  return {
    success: true,
    resolved: {
      url: replaceEnvVariables(url, environment),
      headers: headers.map((header) => ({
        ...header,
        key: replaceEnvVariables(header.key, environment),
        value: replaceEnvVariables(header.value, environment),
      })),
      body: replaceEnvVariables(body, environment),
      usedVariables,
    },
  };
};
