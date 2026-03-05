import { Form, Input, Button, Card, Typography, Alert, Divider } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../api/client'
import useAuthStore from '../store/authStore'

const { Title, Text } = Typography

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const onFinish = async (values) => {
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.login(values)
      const { access_token, user, organization, spaces } = res.data
      setAuth(access_token, user, organization, spaces || [])
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <Card style={styles.card} bordered={false}>
        <div style={styles.header}>
          <div style={styles.logo}>📋</div>
          <Title level={3} style={{ margin: 0 }}>Report Processing System</Title>
          <Text type="secondary">Sign in to your organization</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />}

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="email" label="Email"
            rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
            <Input prefix={<UserOutlined />} placeholder="you@organization.com" />
          </Form.Item>

          <Form.Item name="password" label="Password"
            rules={[{ required: true, message: 'Enter your password' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block>
            Sign In
          </Button>
        </Form>

        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">New organization? </Text>
          <Link to="/signup">Register here</Link>
        </div>
      </Card>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    width: 420,
    borderRadius: 12,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    padding: '12px 8px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 28,
  },
  logo: {
    fontSize: 48,
    marginBottom: 8,
  },
}
