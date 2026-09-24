import { Router, Response } from 'express';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth';
import RequestHistory from '../models/RequestHistory';
import { AuthenticatedRequest, ApiResponse, ProxyRequestData, HeaderItem } from '../types';
import { proxyRequest } from '../utils/proxy';
import { MAX_HISTORY_PER_USER } from './history';

const router = Router();

const PLACEHOLDER_REGEX = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** 检查替换后的请求内容中是否还残留 {{变量名}} 占位符 */
const findUnresolvedPlaceholders = (url: string, headers: HeaderItem[], body?: string): string[] => {
  const missing: string[] = [];

  const collect = (text?: string) => {
    if (!text) {
      return;
    }
    let match: RegExpExecArray | null;
    PLACEHOLDER_REGEX.lastIndex = 0;
    while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
      const name = match[1].trim();
      if (name && !missing.includes(name)) {
        missing.push(name);
      }
    }
  };

  collect(url);
  headers.forEach((header) => {
    collect(header.key);
    collect(header.value);
  });
  collect(body);

  return missing;
};

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未授权访问' });
      return;
    }

    const {
      method,
      url,
      headers,
      body,
      templateUrl,
      templateHeaders,
      templateBody,
      environmentId,
      environmentName,
    } = req.body as ProxyRequestData;

    const requestHeaders = Array.isArray(headers) ? headers : [];

    if (!method || !url) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数',
      });
      return;
    }

    // 防御性校验：变量缺值时前端已拦截，此处兜底，避免把占位符原样发出
    const missingVariables = findUnresolvedPlaceholders(url, requestHeaders, body);
    if (missingVariables.length > 0) {
      res.status(400).json({
        success: false,
        message: `环境变量缺值，无法发送：${missingVariables.map((name) => `{{${name}}}`).join('、')}`,
      });
      return;
    }

    const response = await proxyRequest({ method, url, headers: requestHeaders, body });

    // 历史保留原始模板；未传模板时（旧客户端）以实际请求内容兜底
    const history = new RequestHistory({
      userId: req.user._id,
      method,
      url: templateUrl ?? url,
      headers: Array.isArray(templateHeaders) ? templateHeaders : requestHeaders,
      body: templateBody ?? body,
      resolved: {
        url,
        headers: requestHeaders,
        body,
      },
      environment:
        environmentId || environmentName
          ? {
              id:
                environmentId && mongoose.Types.ObjectId.isValid(environmentId)
                  ? environmentId
                  : undefined,
              name: environmentName ?? '',
            }
          : undefined,
      response,
    });

    await history.save();

    const historyCount = await RequestHistory.countDocuments({ userId: req.user._id });

    if (historyCount > MAX_HISTORY_PER_USER) {
      const oldestRecords = await RequestHistory.find({ userId: req.user._id })
        .sort({ createdAt: 1 })
        .limit(historyCount - MAX_HISTORY_PER_USER);

      const idsToDelete = oldestRecords.map((record) => record._id);
      await RequestHistory.deleteMany({ _id: { $in: idsToDelete } });
    }

    res.json({
      success: true,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body,
        duration: response.duration,
        historyId: history._id.toString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '代理请求失败',
    });
  }
});

export default router;
