# Report Processing System - Team Management & Access Control

## Overview

The Report Processing System now includes comprehensive organizational signup with team workspace management, role-based access control (RBAC), and collaborative features for enterprise deployment.

---

## Key Features

### 1. Organization Registration
- **Self-Service Signup**: Organizations can register directly through the web portal
- **Domain Verification**: Email domain validation for organization accounts
- **Custom Branding**: Organization-specific branding and configuration
- **Subscription Tiers**: Free, Standard, and Enterprise plans

### 2. Team Workspace
- **Dedicated Workspace**: Each organization gets isolated workspace
- **Team Member Management**: Add/remove team members easily
- **Resource Sharing**: Shared document library and processing history
- **Collaboration Tools**: Real-time collaboration on reports

### 3. Role-Based Access Control (RBAC)
- **Organization Admin**: Full control over organization settings
- **Team Lead**: Manage team members and workflows
- **Member**: Process documents and create reports
- **Viewer**: Read-only access to reports

### 4. Permission Management
- **Granular Permissions**: Fine-grained control over actions
- **Workspace Isolation**: Teams cannot access other teams' data
- **Audit Logging**: Complete activity tracking
- **Access Reviews**: Periodic permission audits

---

## User Roles & Permissions

### Organization Admin
**Capabilities:**
- ✅ Create/delete organization
- ✅ Manage billing and subscription
- ✅ Configure organization settings
- ✅ Add/remove team leads
- ✅ View all team workspaces
- ✅ Access audit logs
- ✅ Set organization-wide policies
- ✅ Manage integrations

### Team Lead
**Capabilities:**
- ✅ Invite team members
- ✅ Assign team roles
- ✅ Create team workspaces
- ✅ Manage team resources
- ✅ View team analytics
- ✅ Approve/reject submissions
- ✅ Configure team workflows
- ⛔ Cannot delete organization
- ⛔ Cannot manage billing

### Member
**Capabilities:**
- ✅ Upload and process documents
- ✅ Create and edit reports
- ✅ View team workspace
- ✅ Collaborate with team members
- ✅ Access shared templates
- ⛔ Cannot manage team members
- ⛔ Cannot change organization settings

### Viewer
**Capabilities:**
- ✅ View published reports
- ✅ Access read-only dashboards
- ⛔ Cannot modify documents
- ⛔ Cannot process new files
- ⛔ Cannot access admin features

---

## Architecture

### Database Schema

```sql
-- Organizations Table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table (extends existing users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Organization Members Table
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'admin', 'team_lead', 'member', 'viewer'
    status VARCHAR(20) DEFAULT 'active',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

-- Team Workspaces Table
CREATE TABLE team_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    lead_id UUID REFERENCES users(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team Members Table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES team_workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    UNIQUE(workspace_id, user_id)
);

-- Access Permissions Table
CREATE TABLE access_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES team_workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50), -- 'document', 'report', 'template'
    resource_id UUID,
    permission_level VARCHAR(50), -- 'read', 'write', 'admin'
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Organization Management

```
POST   /api/auth/signup/organization     - Register new organization
GET    /api/organizations/:id            - Get organization details
PUT    /api/organizations/:id            - Update organization
DELETE /api/organizations/:id            - Delete organization (admin only)
GET    /api/organizations/:id/members    - List organization members
POST   /api/organizations/:id/invite     - Invite team members
PUT    /api/organizations/:id/settings   - Update organization settings
```

### Team Workspace Management

```
GET    /api/workspaces                   - List user's workspaces
POST   /api/workspaces                   - Create new workspace
GET    /api/workspaces/:id               - Get workspace details
PUT    /api/workspaces/:id               - Update workspace
DELETE /api/workspaces/:id               - Delete workspace
GET    /api/workspaces/:id/members       - List workspace members
POST   /api/workspaces/:id/members       - Add member to workspace
PUT    /api/workspaces/:id/members/:uid  - Update member role/permissions
DELETE /api/workspaces/:id/members/:uid  - Remove member from workspace
```

### Permission Management

```
GET    /api/permissions                  - List user's permissions
POST   /api/permissions/grant            - Grant permissions to user
DELETE /api/permissions/:id              - Revoke permissions
GET    /api/permissions/check            - Check specific permission
```

### Audit & Compliance

```
GET    /api/audit-logs                   - List audit logs (admin)
GET    /api/audit-logs/user/:id          - Get user activity logs
GET    /api/audit-logs/workspace/:id     - Get workspace activity
POST   /api/audit-logs/export            - Export audit logs
```

---

## Implementation Details

### Authentication Flow

```python
class OrganizationAuth:
    def signup_organization(self, org_data, admin_user):
        """Register new organization with admin user"""
        # Validate domain
        # Create organization
        # Create admin user account
        # Send verification email
        # Setup default workspace
        
    def verify_domain(self, organization_id, email_domain):
        """Verify organization email domain"""
        # Check DNS records
        # Verify email ownership
        # Activate organization
        
    def invite_member(self, organization_id, email, role, invited_by):
        """Invite new member to organization"""
        # Generate invitation token
        # Send invitation email
        # Track invitation status
        
    def accept_invitation(self, token, user_data):
        """Process invitation acceptance"""
        # Validate token
        # Create/link user account
        # Add to organization with role
        # Send welcome email
```

### Authorization Middleware

```python
from functools import wraps
from flask import request, jsonify, g

def require_role(required_roles):
    """Decorator to enforce role-based access"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user') or not g.user.is_authenticated:
                return jsonify({'error': 'Authentication required'}), 401
            
            user_role = g.user.get_role_in_org(g.current_org_id)
            if user_role not in required_roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Usage example
@app.route('/api/organizations/<org_id>/members', methods=['POST'])
@require_role(['admin', 'team_lead'])
def invite_member(org_id):
    # Only admins and team leads can invite members
    pass
```

### Permission Checker

```python
class PermissionChecker:
    def __init__(self, user, workspace):
        self.user = user
        self.workspace = workspace
    
    def can(self, action, resource=None):
        """Check if user can perform action"""
        # Check organization-level permissions
        org_role = self.user.get_role_in_org(self.workspace.organization_id)
        
        # Check workspace-level permissions
        workspace_perms = self.user.get_workspace_permissions(self.workspace.id)
        
        # Evaluate permissions
        if org_role == 'admin':
            return True
        
        if action == 'read' and org_role in ['team_lead', 'member', 'viewer']:
            return True
        
        if action == 'write' and org_role in ['team_lead', 'member']:
            return True
        
        if action == 'delete' and org_role == 'team_lead':
            return True
        
        # Check specific resource permissions
        if resource:
            resource_perms = self.get_resource_permissions(resource)
            if action in resource_perms:
                return True
        
        return False
    
    def get_resource_permissions(self, resource):
        """Get user's permissions for specific resource"""
        # Query database for resource-specific permissions
        pass
```

---

## Frontend Components

### Organization Dashboard

```vue
<template>
  <div class="org-dashboard">
    <!-- Organization Header -->
    <OrgHeader :organization="currentOrg" />
    
    <!-- Navigation Tabs -->
    <Tabs :tabs="['Overview', 'Members', 'Workspaces', 'Settings', 'Audit Logs']" />
    
    <!-- Main Content Area -->
    <component :is="currentTab" :data="dashboardData" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentOrg: null,
      currentTab: 'Overview',
      dashboardData: {}
    }
  },
  async mounted() {
    await this.fetchOrganization()
  }
}
</script>
```

### Team Member Management

```vue
<template>
  <div class="team-members">
    <Button @click="showInviteModal = true" v-if="canInvite">
      Invite Member
    </Button>
    
    <Table :columns="memberColumns" :data="members">
      <template #actions="{ row }">
        <Select 
          v-if="canManageRoles" 
          :value="row.role"
          @change="updateRole(row, $event)"
        >
          <Option value="team_lead">Team Lead</Option>
          <Option value="member">Member</Option>
          <Option value="viewer">Viewer</Option>
        </Select>
        <Button @click="removeMember(row)" variant="danger">Remove</Button>
      </template>
    </Table>
    
    <InviteModal 
      v-if="showInviteModal"
      @invite="handleInvite"
      @close="showInviteModal = false"
    />
  </div>
</template>
```

---

## Security Considerations

### Data Isolation
- **Row-Level Security**: Database queries automatically filter by organization
- **Workspace Isolation**: Teams cannot access other teams' data
- **Encryption**: All sensitive data encrypted at rest and in transit

### Access Control Best Practices
- **Principle of Least Privilege**: Users get minimum necessary permissions
- **Regular Audits**: Periodic access reviews
- **Time-Limited Access**: Temporary permissions with expiration
- **Multi-Factor Authentication**: Required for admin accounts

### Compliance Features
- **GDPR Compliance**: Data export and deletion capabilities
- **SOC 2 Ready**: Comprehensive audit logging
- **Data Retention**: Configurable retention policies
- **Privacy Controls**: Granular privacy settings

---

## Deployment Configuration

### Environment Variables

```env
# Organization Settings
ORGANIZATION_SIGNUP_ENABLED=true
DEFAULT_SUBSCRIPTION_TIER=free
DOMAIN_VERIFICATION_REQUIRED=false

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@reportbot.com

# Rate Limiting
INVITE_RATE_LIMIT=10/hour
SIGNUP_RATE_LIMIT=5/hour
```

---

## Monitoring & Analytics

### Key Metrics
- Active organizations count
- Total team members per organization
- Invitation acceptance rate
- User activity by role
- Permission changes
- Failed access attempts

### Alerting
- Unusual access patterns
- Multiple failed login attempts
- Bulk permission changes
- Suspicious activity detection

This team management system provides enterprise-grade organizational structure with robust access control while maintaining ease of use for end users.