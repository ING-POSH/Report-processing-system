import { Form, Input, Button, Card, Typography, Alert, Steps, Divider } from 'antd'
import { BankOutlined, UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../api/client'
import useAuthStore from '../store/authStore'

const { Title, Text } = Typography

export default function Signup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const onFinish = async (values) => {
    if (values.password !== values.confirm_password) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.signupOrganization({
        organization_name: values.organization_name,
        admin_email: values.admin_email,
        admin_password: values.password,
        admin_name: values.admin_name,
      })
      const { access_token, user, organization, spaces } = res.data
      setAuth(access_token, user, organization, spaces || [])
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <Card style={styles.card} bordered={false}>
        <div style={styles.header}>
          <div style={styles.logo}>🏢</div>
          <Title level={3} style={{ margin: 0 }}>Register Your Organization</Title>
          <Text type="secondary">Get your team started in minutes</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />}

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Divider orientation="left" style={{ fontSize: 13, color: '#888' }}>Organization</Divider>
          <Form.Item name="organization_name" label="Organization Name"
            rules={[{ required: true, message: 'Enter your organization name' }]}>
            <Input prefix={<BankOutlined />} placeholder="e.g. Acme Corporation" />
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 13, color: '#888' }}>Admin Account</Divider>
          <Form.Item name="admin_name" label="Your Full Name"
            rules={[{ required: true, message: 'Enter your full name' }]}>
            <Input prefix={<UserOutlined />} placeholder="John Doe" />
          </Form.Item>

          <Form.Item name="admin_email" label="Work Email"
            rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
            <Input prefix={<MailOutlined />} placeholder="admin@organization.com" />
          </Form.Item>

          <Form.Item name="password" label="Password"
            rules={[{ required: true, min: 8, message: 'Password must be at least 8 characters' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Min. 8 characters" />
          </Form.Item>

          <Form.Item name="confirm_password" label="Confirm Password"
            rules={[{ required: true, message: 'Please confirm your password' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Repeat password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block style={{ marginTop: 8 }}>
            Create Organization
          </Button>
        </Form>

        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Already have an account? </Text>
          <Link to="/login">Sign in</Link>
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
    padding: '24px 0',
  },
  card: {
    width: 460,
    borderRadius: 12,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    padding: '12px 8px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 48,
    marginBottom: 8,
  },
}
