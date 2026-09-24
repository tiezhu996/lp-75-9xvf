import { useState, useEffect } from 'react';
import {
  Modal,
  Input,
  List,
  Tag,
  Button,
  message,
  Space,
  Typography,
  Empty,
  Popconfirm,
  Descriptions,
  Table,
} from 'antd';
import { SearchOutlined, DeleteOutlined, ReloadOutlined, ClearOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { RequestHistory as RequestHistoryType, Header } from '../types';
import { getHistory, deleteHistory, clearHistory } from '../api/history';

const { Text, Paragraph } = Typography;

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
  const [snapshotItem, setSnapshotItem] = useState<RequestHistoryType | null>(null);

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

  // 恢复时把原始模板（含 {{变量名}}）放回输入区，由当前环境重新替换
  const handleRestore = (item: RequestHistoryType) => {
    onRestore({
      method: item.method,
      url: item.url,
      headers: item.headers,
      body: item.body,
    });
    onClose();
    message.success('已恢复请求模板，可按当前环境重新发送');
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

  const snapshotHeaderColumns = [
    { title: 'Key', dataIndex: 'key', key: 'key' },
    { title: 'Value', dataIndex: 'value', key: 'value' },
  ];

  return (
    <>
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
                      key="snapshot"
                      type="link"
                      icon={<EyeOutlined />}
                      disabled={!item.resolved}
                      onClick={() => setSnapshotItem(item)}
                    >
                      查看快照
                    </Button>,
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
                      <Space wrap>
                        <Tag color={methodColors[item.method] || 'default'}>{item.method}</Tag>
                        <Text code>{item.url}</Text>
                        {item.environment?.name && (
                          <Tag color="green">环境: {item.environment.name}</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space>
                        <Text type="secondary">
                          {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                        </Text>
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

      {/* 替换值快照：数据内嵌于历史记录，环境被删除后仍可查看 */}
      <Modal
        title="请求快照（本次实际发送值）"
        open={snapshotItem !== null}
        onCancel={() => setSnapshotItem(null)}
        width={720}
        footer={<Button onClick={() => setSnapshotItem(null)}>关闭</Button>}
      >
        {snapshotItem?.resolved && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="方法">
                <Tag color={methodColors[snapshotItem.method] || 'default'}>
                  {snapshotItem.method}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="环境">
                {snapshotItem.environment?.name ? (
                  snapshotItem.environment.name
                ) : (
                  <Text type="secondary">未使用环境</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="URL">
                <Text code copyable>
                  {snapshotItem.resolved.url}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>Headers</Text>
              <Table
                style={{ marginTop: 8 }}
                dataSource={(snapshotItem.resolved.headers || [])
                  .filter((h) => h.enabled)
                  .map((h, index) => ({ ...h, key: index }))}
                columns={snapshotHeaderColumns}
                pagination={false}
                size="small"
                locale={{ emptyText: '无' }}
              />
            </div>

            {snapshotItem.resolved.body !== undefined && snapshotItem.resolved.body !== '' && (
              <div>
                <Text strong>Body</Text>
                <Paragraph>
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      maxHeight: 240,
                      overflow: 'auto',
                      margin: '8px 0 0',
                    }}
                  >
                    {snapshotItem.resolved.body}
                  </pre>
                </Paragraph>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </>
  );
};

export default HistoryModal;
