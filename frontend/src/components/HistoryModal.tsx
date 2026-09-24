import { useState, useEffect } from 'react';
import { Modal, Input, List, Tag, Button, message, Space, Typography, Empty, Popconfirm, Popover } from 'antd';
import { SearchOutlined, DeleteOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { RequestHistory as RequestHistoryType, Header } from '../types';
import { getHistory, deleteHistory, clearHistory } from '../api/history';

const { Text } = Typography;

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onRestore: (config: {
    method: RequestHistoryType['method'];
    url: string;
    headers: Header[];
    body?: string;
  }) => void;
}

const methodColors: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'orange',
  DELETE: 'red',
  PATCH: 'purple',
  HEAD: 'cyan',
  OPTIONS: 'magenta',
};

const HistoryModal = ({ visible, onClose, onRestore }: HistoryModalProps) => {
  const [history, setHistory] = useState<RequestHistoryType[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchHistory();
    }
  }, [visible]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getHistory({ limit: 100 });
      setHistory(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (item: RequestHistoryType) => {
    // item 中保存的是原始模板（含 {{变量}} 占位符），恢复时按当前环境重新替换发送
    onRestore({
      method: item.method,
      url: item.url,
      headers: item.headers,
      body: item.body,
    });
    onClose();
    message.success('已恢复请求模板，将按当前环境替换变量后发送');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHistory(id);
      message.success('删除成功');
      fetchHistory();
    } catch {
    }
  };

  const handleClear = async () => {
    try {
      await clearHistory();
      message.success('清空成功');
      fetchHistory();
    } catch {
    }
  };

  const filteredHistory = history.filter(
    (item) =>
      !searchText ||
      item.method.toLowerCase().includes(searchText.toLowerCase()) ||
      item.url.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Modal
      title="请求历史"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={
        <Space>
          <Popconfirm
            title="确认清空所有历史记录？"
            onConfirm={handleClear}
            okText="确认"
            cancelText="取消"
          >
            <Button danger icon={<ClearOutlined />}>
              清空历史
            </Button>
          </Popconfirm>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索请求..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      <div style={{ maxHeight: 500, overflow: 'auto' }}>
        {filteredHistory.length === 0 ? (
          <Empty description="暂无请求历史" />
        ) : (
          <List
            loading={loading}
            dataSource={filteredHistory}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="restore"
                    type="link"
                    icon={<ReloadOutlined />}
                    onClick={() => handleRestore(item)}
                  >
                    恢复
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="确认删除？"
                    onConfirm={() => handleDelete(item._id)}
                    okText="确认"
                    cancelText="取消"
                  >
                    <Button type="link" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={methodColors[item.method] || 'default'}>{item.method}</Tag>
                      <Text code>{item.url}</Text>
                    </Space>
                  }
                  description={
                    <Space size={[8, 4]} wrap>
                      <Text type="secondary">
                        {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                      {item.environmentName && (
                        <Tag color="green">环境: {item.environmentName}</Tag>
                      )}
                      {item.resolvedVariables && item.resolvedVariables.length > 0 && (
                        <Popover
                          title="本次替换值（快照）"
                          content={
                            <div style={{ maxWidth: 320 }}>
                              {item.resolvedVariables.map((variable) => (
                                <div key={variable.key} style={{ marginBottom: 4 }}>
                                  <Text code>{`{{${variable.key}}}`}</Text>
                                  <Text type="secondary"> = </Text>
                                  <Text copyable={{ text: variable.value }}>{variable.value}</Text>
                                </div>
                              ))}
                            </div>
                          }
                        >
                          <Tag color="blue" style={{ cursor: 'pointer' }}>
                            变量快照 ({item.resolvedVariables.length})
                          </Tag>
                        </Popover>
                      )}
                      {item.response && (
                        <Tag
                          color={
                            item.response.status >= 200 && item.response.status < 300
                              ? 'green'
                              : item.response.status >= 400
                              ? 'red'
                              : 'orange'
                          }
                        >
                          {item.response.status} {item.response.statusText}
                        </Tag>
                      )}
                      {item.response && (
                        <Text type="secondary">{item.response.duration}ms</Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </Modal>
  );
};

export default HistoryModal;
