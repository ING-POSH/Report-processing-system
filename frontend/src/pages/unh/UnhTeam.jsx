import { useState, useEffect } from 'react'
import {
  Table, Card, Avatar, Tag, Typography, Button, Modal, Form, Input, Select,
  Space, message, Empty
} from 'antd'
import { PlusOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { orgAPI } from '../../api/client'
import useAuthStore from '../../store/authStore'

const { Title, Text } = Typography

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Team Lead', value: 'team_lead' },
  { label: 'Member', value: 'member' },
  { label: 'Viewer', value: 'viewer' },
]

const roleColor = { admin: 'red', team_lead: 'purple', member: 'blue', viewer: 'default' }

export default function UnhTeam() {
  const { organization } = useAuthStore()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [form] = Form.useForm()

  const load = () => {
    if (!organization?.id) return
    orgAPI.getMembers(organization.id)
      .then(r => setMembers(r.data.members || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [organization])

  const handleInvite = async (values) => {
    setInviting(true)
    try {
      await orgAPI.inviteMember(organization.id, values)
      message.success('Invitation sent')
      setModalOpen(false)
      form.resetFields()
      load()
    } catch {
      message.error('Failed to invite member')
    } finally {
      setInviting(false)
    }
  }

  const columns = [
    {
      title: 'Member', key: 'member',
      render: (_, row) => (
        <Space>
          <Avatar style={{ backgroundColor: '#722ed1', fontSize: 13 }}>
            {row.full_name?.[0]?.toUpperCase() || row.email?.[0]?.toUpperCase() || '?'}
          </Avatar>
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 13 }}>{row.full_name || '—'}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{row.email}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Role', dataIndex: 'role', key: 'role', width: 130,
      render: (val) => <Tag color={roleColor[val] || 'default'} style={{ textTransform: 'capitalize' }}>{val?.replace('_', ' ') || '—'}</Tag>
    },
    {
      title: 'Joined', dataIndex: 'created_at', key: 'created_at', width: 120,
      render: (val) => val ? new Date(val).toLocaleDateString() : '—'
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>Team</Title>
          <Text type="secondary">Manage UN-Habitat internal team members and roles.</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
        >
          Invite Member
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          columns={columns}
          dataSource={members}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="No team members yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          size="small"
        />
      </Card>

      <Modal
        title="Invite Team Member"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        confirmLoading={inviting}
        okText="Send Invite"
        okButtonProps={{ style: { backgroundColor: '#722ed1', borderColor: '#722ed1' } }}
        width={440}
      >
        <Form form={form} layout="vertical" onFinish={handleInvite} style={{ marginTop: 12 }}>
          <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<UserOutlined />} placeholder="colleague@unhabitat.org" />
          </Form.Item>
          <Form.Item name="full_name" label="Full Name">
            <Input placeholder="Jane Doe" />
          </Form.Item>
          <Form.Item name="role" label="Role" initialValue="member">
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
