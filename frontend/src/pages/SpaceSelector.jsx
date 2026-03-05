import { Card, Typography, Button, Tag, Space, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { spaceAPI } from '../api/client'
import useAuthStore from '../store/authStore'

const { Title, Text } = Typography

export default function SpaceSelector() {
  const navigate = useNavigate()
  const { organization, user, spaces: storedSpaces, setAuth, token } = useAuthStore()
  const [spaces, setSpaces] = useState(storedSpaces || [])
  const [loading, setLoading] = useState(!storedSpaces?.length)

  useEffect(() => {
    if (!organization?.id) return
    if (storedSpaces?.length) { setSpaces(storedSpaces); return }
    spaceAPI.list(organization.id)
      .then(res => setSpaces(res.data.spaces || []))
      .finally(() => setLoading(false))
  }, [organization])

  const unhSpace = spaces.find(s => s.space_type === 'unh_internal')
  const partnerSpace = spaces.find(s => s.space_type === 'partner_projects')

  if (loading) return <div style={styles.page}><Spin size="large" /></div>

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <div style={styles.header}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <Title level={3} style={{ margin: 0 }}>Welcome, {user?.full_name || user?.email}</Title>
          <Text type="secondary">{organization?.name} — Select your workspace</Text>
        </div>

        <div style={styles.cards}>
          {/* UNH Internal Space */}
          <Card
            hoverable
            style={styles.spaceCard}
            onClick={() => navigate('/unh/dashboard')}
          >
            <div style={styles.spaceIcon}>🏛️</div>
            <Title level={4} style={{ margin: '12px 0 4px' }}>UN-Habitat Internal</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Field reports, tasks, activity logs and implementation monitoring for UN-Habitat urban regeneration work.
            </Text>
            <Space wrap>
              <Tag color="purple">Reports</Tag>
              <Tag color="blue">Tasks</Tag>
              <Tag color="green">Activity Log</Tag>
              <Tag color="orange">Transcriber</Tag>
            </Space>
            <div style={{ marginTop: 16 }}>
              <Tag color="success">Always Available</Tag>
            </div>
            <Button type="primary" block style={{ marginTop: 20 }}>
              Enter UNH Space →
            </Button>
          </Card>

          {/* Partner Projects Space */}
          <Card
            hoverable
            style={{ ...styles.spaceCard, borderColor: partnerSpace?.is_paid_tier ? '#722ed1' : '#d9d9d9' }}
            onClick={() => navigate('/partner/dashboard')}
          >
            <div style={styles.spaceIcon}>🤝</div>
            <Title level={4} style={{ margin: '12px 0 4px' }}>Partner Projects</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Manage ongoing projects with external partners. Track progress, risks, stakeholder engagements and deliverables.
            </Text>
            <Space wrap>
              <Tag color="purple">Projects</Tag>
              <Tag color="red">Risk Analysis</Tag>
              <Tag color="cyan">Stakeholders</Tag>
              <Tag color="orange">Transcriber</Tag>
            </Space>
            <div style={{ marginTop: 16 }}>
              <Tag color="purple">Paid Plan</Tag>
            </div>
            <Button type="default" block style={{ marginTop: 20, borderColor: '#722ed1', color: '#722ed1' }}>
              Enter Partner Space →
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1d2e 0%, #2d3561 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  inner: { width: '100%', maxWidth: 900 },
  header: { textAlign: 'center', marginBottom: 40, color: '#fff' },
  cards: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  spaceCard: {
    borderRadius: 16,
    padding: 8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  spaceIcon: { fontSize: 48 },
}
