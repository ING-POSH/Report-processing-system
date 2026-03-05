import { Row, Col, Card, Statistic, Typography, List, Tag, Spin, Empty, Progress } from 'antd'
import {
  FileTextOutlined, TeamOutlined, CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { dashboardAPI, activityAPI, workspaceAPI } from '../api/client'
import useAuthStore from '../store/authStore'

const { Title, Text } = Typography

const stakeholderColor = {
  trader: 'gold', street_vendor: 'orange', resident: 'blue',
  urban_regen_team: 'purple', untagged: 'default',
}
const stakeholderLabel = {
  trader: 'Traders', street_vendor: 'Street Vendors', resident: 'Residents',
  urban_regen_team: 'Urban Regen Team', untagged: 'Untagged',
}
const actionLabel = {
  report_uploaded: '📄 Uploaded a report',
  task_assigned: '📌 Assigned a task',
  engagement_logged: '🤝 Logged engagement',
}

export default function Overview() {
  const { organization } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organization?.id) return
    Promise.all([
      dashboardAPI.stats(organization.id),
      activityAPI.list({ organization_id: organization.id }),
      workspaceAPI.list(),
    ]).then(([statsRes, actRes, wsRes]) => {
      setStats(statsRes.data)
      setActivity(actRes.data.activity || [])
      setWorkspaces(wsRes.data.workspaces || [])
    }).finally(() => setLoading(false))
  }, [organization])

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>

  const completionRate = stats?.total_tasks
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>Performance Dashboard</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        UN-Habitat Urban Regeneration — implementation monitoring overview.
      </Text>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Reports Submitted', value: stats?.total_reports || 0, icon: <FileTextOutlined />, color: '#667eea' },
          { label: 'Active Members', value: stats?.total_members || 0, icon: <TeamOutlined />, color: '#52c41a' },
          { label: 'Total Tasks', value: stats?.total_tasks || 0, icon: <ClockCircleOutlined />, color: '#fa8c16' },
          { label: 'Tasks Completed', value: stats?.completed_tasks || 0, icon: <CheckCircleOutlined />, color: '#13c2c2' },
        ].map((s) => (
          <Col xs={24} sm={12} lg={6} key={s.label}>
            <Card bordered={false} style={styles.statCard}>
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
        {/* Stakeholder Breakdown */}
        <Col xs={24} lg={8}>
          <Card title="Reports by Stakeholder" bordered={false} style={styles.card}>
            {Object.keys(stats?.stakeholder_breakdown || {}).length === 0 ? (
              <Empty description="No reports yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              Object.entries(stats.stakeholder_breakdown).map(([type, count]) => (
                <div key={type} style={styles.breakdownRow}>
                  <Tag color={stakeholderColor[type] || 'default'}>
                    {stakeholderLabel[type] || type}
                  </Tag>
                  <div style={{ flex: 1, margin: '0 12px' }}>
                    <Progress
                      percent={Math.round((count / stats.total_reports) * 100)}
                      size="small"
                      strokeColor={stakeholderColor[type] === 'gold' ? '#faad14' : undefined}
                      showInfo={false}
                    />
                  </div>
                  <Text strong>{count}</Text>
                </div>
              ))
            )}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Task Completion Rate</Text>
              <Progress percent={completionRate} status={completionRate === 100 ? 'success' : 'active'} />
            </div>
          </Card>
        </Col>

        {/* Activity Feed */}
        <Col xs={24} lg={10}>
          <Card title="Recent Activity" bordered={false} style={styles.card}>
            {activity.length === 0 ? (
              <Empty description="No activity yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={activity.slice(0, 8)}
                renderItem={(log) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <List.Item.Meta
                      title={
                        <span style={{ fontSize: 13 }}>
                          <Text strong>{log.user_name}</Text>{' '}
                          <Text type="secondary">{actionLabel[log.action] || log.action}</Text>
                        </span>
                      }
                      description={
                        <span style={{ fontSize: 11 }}>
                          {log.stakeholder_type && (
                            <Tag color={stakeholderColor[log.stakeholder_type]} style={{ marginRight: 6, fontSize: 10 }}>
                              {stakeholderLabel[log.stakeholder_type] || log.stakeholder_type}
                            </Tag>
                          )}
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* Workspaces */}
        <Col xs={24} lg={6}>
          <Card title="Workspaces" bordered={false} style={styles.card}>
            {workspaces.length === 0 ? (
              <Empty description="No workspaces" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              workspaces.map((ws) => (
                <div key={ws.id} style={styles.wsRow}>
                  <span style={{ fontSize: 20 }}>📁</span>
                  <div style={{ marginLeft: 10 }}>
                    <Text strong style={{ display: 'block', fontSize: 13 }}>{ws.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{ws.description || 'No description'}</Text>
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

const styles = {
  statCard: { borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  card: { borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' },
  breakdownRow: {
    display: 'flex', alignItems: 'center', marginBottom: 10,
  },
  wsRow: {
    display: 'flex', alignItems: 'flex-start',
    padding: '10px 0', borderBottom: '1px solid #f0f0f0',
  },
}


