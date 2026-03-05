import { Row, Col, Card, Statistic, Typography, List, Tag, Spin, Empty, Progress } from 'antd'
import { FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { dashboardAPI, activityAPI } from '../../api/client'
import useAuthStore from '../../store/authStore'

const { Title, Text } = Typography

const actionLabel = {
  report_uploaded: '📄 Uploaded a report',
  task_assigned: '📌 Assigned a task',
  engagement_logged: '🤝 Logged engagement',
  project_created: '📁 Created a project',
}

const stakeholderColor = { trader: 'gold', street_vendor: 'orange', resident: 'blue', urban_regen_team: 'purple', untagged: 'default' }
const stakeholderLabel = { trader: 'Traders', street_vendor: 'Street Vendors', resident: 'Residents', urban_regen_team: 'Urban Regen Team', untagged: 'Untagged' }

export default function UnhDashboard() {
  const { organization } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organization?.id) return
    Promise.all([
      dashboardAPI.stats(organization.id),
      activityAPI.list({ organization_id: organization.id }),
    ]).then(([sRes, aRes]) => {
      setStats(sRes.data)
      setActivity(aRes.data.activity || [])
    }).finally(() => setLoading(false))
  }, [organization])

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>

  const completionRate = stats?.total_tasks
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>UN-Habitat Dashboard</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Urban regeneration programme — internal monitoring overview.
      </Text>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Reports Submitted', value: stats?.total_reports || 0, icon: <FileTextOutlined />, color: '#722ed1' },
          { label: 'Active Members', value: stats?.total_members || 0, icon: <TeamOutlined />, color: '#52c41a' },
          { label: 'Open Tasks', value: stats?.open_tasks || 0, icon: <ClockCircleOutlined />, color: '#fa8c16' },
          { label: 'Tasks Completed', value: stats?.completed_tasks || 0, icon: <CheckCircleOutlined />, color: '#13c2c2' },
        ].map(s => (
          <Col xs={24} sm={12} lg={6} key={s.label}>
            <Card bordered={false} style={styles.card}>
              <Statistic title={s.label} value={s.value}
                prefix={<span style={{ color: s.color }}>{s.icon}</span>}
                valueStyle={{ color: s.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card title="Reports by Stakeholder" bordered={false} style={styles.card}>
            {!stats?.stakeholder_breakdown || Object.keys(stats.stakeholder_breakdown).length === 0 ? (
              <Empty description="No reports yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <>
                {Object.entries(stats.stakeholder_breakdown).map(([type, count]) => (
                  <div key={type} style={styles.row}>
                    <Tag color={stakeholderColor[type] || 'default'}>{stakeholderLabel[type] || type}</Tag>
                    <div style={{ flex: 1, margin: '0 12px' }}>
                      <Progress percent={Math.round((count / stats.total_reports) * 100)} size="small" showInfo={false} />
                    </div>
                    <Text strong>{count}</Text>
                  </div>
                ))}
                <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Task Completion Rate</Text>
                  <Progress percent={completionRate} status={completionRate === 100 ? 'success' : 'active'} />
                </div>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="Recent Activity" bordered={false} style={styles.card}>
            {activity.length === 0 ? (
              <Empty description="No activity yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={activity.slice(0, 10)}
                renderItem={log => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <List.Item.Meta
                      title={<span style={{ fontSize: 13 }}><Text strong>{log.user_name}</Text>{' '}<Text type="secondary">{actionLabel[log.action] || log.action}</Text></span>}
                      description={
                        <span style={{ fontSize: 11 }}>
                          {log.stakeholder_type && <Tag color={stakeholderColor[log.stakeholder_type]} style={{ marginRight: 6, fontSize: 10 }}>{stakeholderLabel[log.stakeholder_type] || log.stakeholder_type}</Tag>}
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
      </Row>
    </div>
  )
}

const styles = {
  card: { borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  row: { display: 'flex', alignItems: 'center', marginBottom: 10 },
}
