import { Layout, Menu, Avatar, Dropdown, Typography, Space, Tag } from 'antd'
import {
  DashboardOutlined, FileTextOutlined, TeamOutlined,
  SettingOutlined, LogoutOutlined, UserOutlined, CheckSquareOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const roleColor = { admin: 'red', team_lead: 'blue', member: 'green', viewer: 'default' }

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, organization, logout } = useAuthStore()

  const selectedKey = location.pathname.split('/')[2] || 'overview'

  const menuItems = [
    { key: 'overview', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'reports', icon: <FileTextOutlined />, label: 'Reports' },
    { key: 'tasks', icon: <CheckSquareOutlined />, label: 'Tasks' },
    { key: 'team', icon: <TeamOutlined />, label: 'Team' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
  ]

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
      { type: 'divider' },
      {
        key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true,
        onClick: () => { logout(); navigate('/login') },
      },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider width={220} style={styles.sider} theme="dark">
        <div style={styles.brand}>
          <span style={{ fontSize: 22 }}>📋</span>
          <Text strong style={{ color: '#fff', marginLeft: 8, fontSize: 15 }}>ReportBot</Text>
        </div>
        {organization && (
          <div style={styles.orgBadge}>
            <Text style={{ color: '#aaa', fontSize: 11 }}>ORGANIZATION</Text>
            <Text style={{ color: '#fff', display: 'block', fontSize: 13 }} ellipsis>
              {organization.name}
            </Text>
          </div>
        )}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(`/dashboard/${key}`)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>

      <Layout>
        {/* Top Header */}
        <Header style={styles.header}>
          <div />
          <Space>
            {user?.role && (
              <Tag color={roleColor[user.role] || 'default'} style={{ textTransform: 'capitalize' }}>
                {user.role?.replace('_', ' ')}
              </Tag>
            )}
            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ background: '#667eea' }}>
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <Text>{user?.name || user?.email}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Page Content */}
        <Content style={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

const styles = {
  sider: {
    background: '#1a1d2e',
    boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
  },
  brand: {
    padding: '20px 20px 12px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  orgBadge: {
    padding: '10px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    marginBottom: 4,
  },
  header: {
    background: '#fff',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  content: {
    padding: 24,
    background: '#f5f6fa',
    overflowY: 'auto',
  },
}
