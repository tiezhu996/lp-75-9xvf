import { Router, Response } from 'express';
import authMiddleware from '../middleware/auth';
import RequestHistory from '../models/RequestHistory';
import { AuthenticatedRequest, ApiResponse, ProxyRequestData } from '../types';
import { proxyRequest } from '../utils/proxy';
import { MAX_HISTORY_PER_USER } from './history';

const router = Router();

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
      environmentName,
      resolvedVariables,
      template,
    } = req.body as ProxyRequestData;

    if (!method || !url) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数',
      });
      return;
    }

    const response = await proxyRequest({ method, url, headers, body });

    // 历史保留原始模板（含 {{变量}} 占位符）以及本次环境名和替换值快照，
    // 这样切换环境后可直接用模板重放，即使环境被删除快照仍可查看。
    const history = new RequestHistory({
      userId: req.user._id,
      method,
      url: template?.url ?? url,
      headers: template?.headers ?? headers,
      body: template?.body ?? body,
      environmentName,
      resolvedVariables,
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
