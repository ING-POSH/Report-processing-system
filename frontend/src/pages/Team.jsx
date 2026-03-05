import {
  Card, Table, Tag, Button, Modal, Form, Input, Select, Avatar, Typography,
  Space, Popconfirm, message, Spin, Empty
} from 'antd'
import { UserAddOutlined, MailOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { orgAPI } from '../api/client'
import useAuthStore from '../store/authStore'

const { Title, Text } = Typography

const roleColors = { admin: 'red', team_lead: 'blue', member: 'green', viewer: 'default' }
const roleLabels = { admin: 'Admin', team_lead: 'Team Lead', member: 'Member', viewer: 'Viewer' }

export default function Team() {
  const { organization, user } = useAuthStore()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [form] = Form.useForm()

  const isAdmin = user?.role === 'admin'

  const loadMembers = () => {
    if (!organization?.id) return
    orgAPI.getMembers(organization.id)
      .then((res) => setMembers(res.data.members || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadMembers() }, [organization])

  const handleInvite = async (values) => {
    setInviting(true)
    try {
      await orgAPI.inviteMember(organization.id, values)
      message.success(`Invitation sent to ${values.email}`)
      form.resetFields()
      setInviteOpen(false)
      loadMembers()
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const columns = [
    {
      title: 'Member',
      key: 'member',
      render: (_, r) => (
        <Space>
          <Avatar style={{ background: '#667eea' }}>
            {r.name?.[0]?.toUpperCase() || r.email?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ display: 'block' }}>{r.name || '—'}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={roleColors[role] || 'default'} style={{ textTransform: 'capitalize' }}>
          {roleLabels[role] || role}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'orange'} style={{ textTransform: 'capitalize' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'joined_at',
      key: 'joined_at',
      render: (d) => d ? new Date(d).toLocaleDateString() : '—',
    },
  ]

  return (
    <div>
      <div style={styles.pageHeader}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Team Management</Title>
          <Text type="secondary">Manage members and their access levels.</Text>
        </div>
        {isAdmin && (
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setInviteOpen(true)}>
            Invite Member
          </Button>
        )}
      </div>

      <Card bordered={false} style={styles.card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
        ) : members.length === 0 ? (
          <Empty description="No members yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            dataSource={members}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* Invite Modal */}
      <Modal
        title="Invite a Team Member"
        open={inviteOpen}
        onCancel={() => { setInviteOpen(false); form.resetFields() }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleInvite} style={{ marginTop: 16 }}>
          <Form.Item name="email" label="Email Address"
            rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
            <Input prefix={<MailOutlined />} placeholder="colleague@organization.com" />
          </Form.Item>

          <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Select a role' }]}>
            <Select placeholder="Select role">
              <Select.Option value="admin">Admin — Full organization control</Select.Option>
              <Select.Option value="team_lead">Team Lead — Manage workspace and members</Select.Option>
              <Select.Option value="member">Member — Create and edit reports</Select.Option>
              <Select.Option value="viewer">Viewer — Read-only access</Select.Option>
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={inviting}>Send Invitation</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  card: {
    borderRadius: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
}
