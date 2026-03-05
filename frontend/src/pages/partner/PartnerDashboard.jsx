import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Typography, List, Tag, Spin, Empty, Progress, Space } from 'antd'
import {
  ProjectOutlined, WarningOutlined, TeamOutlined, CheckCircleOutlined,
  ClockCircleOutlined, RiseOutlined
} from '@ant-design/icons'
import { partnerDashboardAPI, activityAPI } from '../../api/client'
import useAuthStore from '../../store/authStore'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const riskColor = { low: 'green', medium: 'orange', high: 'red' }
const statusColor = { active: 'processing', completed: 'success', on_hold: 'warning' }
const statusLabel = { active: 'Active', completed: 'Completed', on_hold: 'On Hold' }

export default function PartnerDashboard() {
  const { organization } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!organization?.id) return
    setLoading(true)
    partnerDashboardAPI.stats(organization.id)
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [organization])

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>Partner Projects</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Monitoring all active partner projects, risks, and stakeholder engagements.
      </Text>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Projects', value: stats?.total_projects || 0, icon: <ProjectOutlined />, color: '#d4a017' },
          { label: 'Active Projects', value: stats?.active_projects || 0, icon: <RiseOutlined />, color: '#52c41a' },
          { label: 'Open Risks', value: stats?.open_risks || 0, icon: <WarningOutlined />, color: '#ff4d4f' },
          { label: 'Engagements', value: stats?.total_engagements || 0, icon: <TeamOutlined />, color: '#1890ff' },
        ].map(s => (
          <Col xs={24} sm={12} lg={6} key={s.label}>
            <Card bordered={false} style={styles.card}>
              <Statistic
                title={s.label}
                value={s.value}
                prefix={<span style={{ color: s.color }}>{s.icon}</span>}
                valueStyle={{ color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card
            title="Active Projects"
            bordered={false}
            style={styles.card}
            extra={<Text style={{ color: '#d4a017', cursor: 'pointer' }} onClick={() => navigate('/partner/projects')}>View All</Text>}
          >
            {!stats?.projects?.length ? (
              <Empty description="No projects yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={stats.projects.slice(0, 5)}
                renderItem={p => (
                  <List.Item
                    style={{ cursor: 'pointer', padding: '10px 0' }}
                    onClick={() => navigate(`/partner/projects/${p.id}`)}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
                          <Tag color={statusColor[p.status] || 'default'}>{statusLabel[p.status] || p.status}</Tag>
                        </Space>
                      }
                      description={
                        <Space size={4}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{p.partner_name || 'Partner'}</Text>
                          {p.risk_level && <Tag color={riskColor[p.risk_level]} style={{ fontSize: 10 }}>Risk: {p.risk_level}</Tag>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Risk Summary" bordered={false} style={styles.card}>
            {!stats?.risk_breakdown ? (
              <Empty description="No risks logged" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <>
                {Object.entries(stats.risk_breakdown).map(([level, count]) => (
                  <div key={level} style={styles.row}>
                    <Tag color={riskColor[level]} style={{ minWidth: 60, textAlign: 'center' }}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Tag>
                    <div style={{ flex: 1, margin: '0 12px' }}>
                      <Progress
                        percent={stats.open_risks ? Math.round((count / stats.open_risks) * 100) : 0}
                        size="small"
                        showInfo={false}
                        strokeColor={riskColor[level]}
                      />
                    </div>
                    <Text strong>{count}</Text>
                  </div>
                ))}
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

const styles = {
  card: { borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  row: { display: 'flex', alignItems: 'center', marginBottom: 12 },
}
