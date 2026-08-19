import {
  FileImageOutlined,
  FileOutlined,
  FileTextOutlined,
  HddOutlined,
  NumberOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Spin, Statistic } from 'antd';
import React, { useEffect, useState } from 'react';
import { getStatistics } from '@/services/web/file';
import type { FileStatsVo } from '@/services/web/file/typings';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}

const StorageStats: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<FileStatsVo | null>(null);

  useEffect(() => {
    setLoading(true);
    getStatistics()
      .then((res) => {
        setStats(res.data);
      })
      .catch((error) => {
        console.error('Fetch statistics failed:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="存储总量"
              value={stats ? formatFileSize(stats.totalSize) : '-'}
              prefix={<HddOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="文件总数"
              value={stats?.totalCount ?? 0}
              prefix={<NumberOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="图片"
              value={stats?.imageCount ?? 0}
              prefix={<FileImageOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="文档"
              value={stats?.docCount ?? 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="视频"
              value={stats?.videoCount ?? 0}
              prefix={<VideoCameraOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="其他"
              value={stats?.otherCount ?? 0}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </Spin>
  );
};

export default StorageStats;
