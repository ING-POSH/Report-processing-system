#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Organization and Team Management Module
Handles organization signup, team workspaces, and role-based access control
Author: Ing Posh
Date: February 26, 2026
"""

import uuid
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class OrganizationRole(Enum):
    """Organization membership roles"""
    ADMIN = "admin"
    TEAM_LEAD = "team_lead"
    MEMBER = "member"
    VIEWER = "viewer"

class PermissionLevel(Enum):
    """Permission levels for resources"""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    NONE = "none"

@dataclass
class Organization:
    """Organization data model"""
    id: str
    name: str
    slug: str
    domain: Optional[str] = None
    subscription_tier: str = "free"
    status: str = "active"
    settings: Dict[str, Any] = None
    created_at: datetime = None
    updated_at: datetime = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = str(uuid.uuid4())
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.settings is None:
            self.settings = {}

@dataclass
class User:
    """User data model"""
    id: str
    email: str
    password_hash: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = None
    last_login: datetime = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = str(uuid.uuid4())
        if self.created_at is None:
            self.created_at = datetime.now()

@dataclass
class OrganizationMember:
    """Organization member data model"""
    id: str
    organization_id: str
    user_id: str
    role: OrganizationRole
    status: str = "active"
    invited_by: Optional[str] = None
    invited_at: datetime = None
    joined_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = str(uuid.uuid4())
        if self.invited_at is None:
            self.invited_at = datetime.now()

@dataclass
class TeamWorkspace:
    """Team workspace data model"""
    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    lead_id: Optional[str] = None
    settings: Dict[str, Any] = None
    created_at: datetime = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = str(uuid.uuid4())
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.settings is None:
            self.settings = {}

@dataclass
class Invitation:
    """Invitation data model"""
    id: str
    organization_id: str
    email: str
    role: OrganizationRole
    invited_by: str
    token: str
    status: str = "pending"  # pending, accepted, expired, revoked
    expires_at: datetime = None
    created_at: datetime = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = str(uuid.uuid4())
        if self.token is None:
            self.token = secrets.token_urlsafe(32)
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.expires_at is None:
            self.expires_at = self.created_at + timedelta(days=7)

class OrganizationManager:
    """Manages organizations and memberships"""
    
    def __init__(self, db_session):
        self.db = db_session
        self.organizations: Dict[str, Organization] = {}
        self.members: Dict[str, OrganizationMember] = {}
        self.users: Dict[str, User] = {}
        
    def create_organization(self, name: str, admin_email: str, 
                          admin_password: str, domain: str = None) -> Organization:
        """Create new organization with admin user"""
        
        # Check if organization slug is available
        slug = self._generate_slug(name)
        if any(org.slug == slug for org in self.organizations.values()):
            raise ValueError("Organization name already taken")
        
        # Create admin user
        admin_user = self._create_user(admin_email, admin_password)
        
        # Create organization
        org = Organization(
            name=name,
            slug=slug,
            domain=domain,
            subscription_tier="free",
            status="pending_verification"
        )
        
        self.organizations[org.id] = org
        
        # Add admin as organization member
        self._add_member(
            organization_id=org.id,
            user_id=admin_user.id,
            role=OrganizationRole.ADMIN,
            status="active",
            joined_at=datetime.now()
        )
        
        logger.info(f"Created organization '{name}' with admin {admin_email}")
        return org
    
    def _create_user(self, email: str, password: str) -> User:
        """Create new user account"""
        
        # Check if email already exists
        if any(user.email == email for user in self.users.values()):
            raise ValueError("Email already registered")
        
        # Hash password
        password_hash = self._hash_password(password)
        
        # Create user
        user = User(
            email=email,
            password_hash=password_hash,
            is_verified=False
        )
        
        self.users[user.id] = user
        logger.info(f"Created user account for {email}")
        return user
    
    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256 with salt"""
        salt = secrets.token_hex(16)
        hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return f"{salt}${hash_obj.hex()}"
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            salt, hash_value = password_hash.split('$')
            hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
            return hash_obj.hex() == hash_value
        except Exception:
            return False
    
    def invite_member(self, organization_id: str, email: str, 
                     role: OrganizationRole, invited_by: str) -> Invitation:
        """Invite new member to organization"""
        
        # Verify inviter has permission
        inviter_member = self._get_member(organization_id, invited_by)
        if not inviter_member or inviter_member.role not in [OrganizationRole.ADMIN, OrganizationRole.TEAM_LEAD]:
            raise PermissionError("Only admins and team leads can invite members")
        
        # Check if user is already a member
        existing_member = self._get_member_by_email(organization_id, email)
        if existing_member:
            raise ValueError("User is already a member of this organization")
        
        # Create invitation
        invitation = Invitation(
            organization_id=organization_id,
            email=email,
            role=role,
            invited_by=invited_by
        )
        
        # TODO: Send invitation email
        logger.info(f"Sent invitation to {email} for organization {organization_id}")
        return invitation
    
    def accept_invitation(self, token: str, user_data: dict = None) -> OrganizationMember:
        """Accept organization invitation"""
        
        # Find invitation (would be in database in real implementation)
        invitation = self._get_invitation_by_token(token)
        if not invitation:
            raise ValueError("Invalid invitation token")
        
        if invitation.status != "pending":
            raise ValueError("Invitation is no longer valid")
        
        if invitation.expires_at < datetime.now():
            invitation.status = "expired"
            raise ValueError("Invitation has expired")
        
        # Create or link user account
        if user_data:
            user = self._create_user(invitation.email, user_data.get('password', ''))
        else:
            # Check if user already exists
            user = next((u for u in self.users.values() if u.email == invitation.email), None)
            if not user:
                raise ValueError("User account required to accept invitation")
        
        # Add member to organization
        member = self._add_member(
            organization_id=invitation.organization_id,
            user_id=user.id,
            role=invitation.role,
            status="active",
            invited_by=invitation.invited_by,
            joined_at=datetime.now()
        )
        
        # Mark invitation as accepted
        invitation.status = "accepted"
        
        logger.info(f"User {user.email} accepted invitation to organization")
        return member
    
    def _add_member(self, organization_id: str, user_id: str, 
                   role: OrganizationRole, **kwargs) -> OrganizationMember:
        """Add member to organization"""
        member = OrganizationMember(
            id=None,
            organization_id=organization_id,
            user_id=user_id,
            role=role,
            **kwargs
        )
        
        key = f"{organization_id}:{user_id}"
        self.members[key] = member
        return member
    
    def _get_member(self, organization_id: str, user_id: str) -> Optional[OrganizationMember]:
        """Get organization member"""
        key = f"{organization_id}:{user_id}"
        return self.members.get(key)
    
    def _get_member_by_email(self, organization_id: str, email: str) -> Optional[OrganizationMember]:
        """Get member by email"""
        user = next((u for u in self.users.values() if u.email == email), None)
        if user:
            return self._get_member(organization_id, user.id)
        return None
    
    def _get_invitation_by_token(self, token: str) -> Optional[Invitation]:
        """Get invitation by token (placeholder)"""
        # In real implementation, query database
        return None
    
    def update_member_role(self, organization_id: str, user_id: str, 
                          new_role: OrganizationRole, updated_by: str) -> bool:
        """Update member role"""
        
        # Verify updater has permission
        updater_member = self._get_member(organization_id, updated_by)
        if not updater_member or updater_member.role != OrganizationRole.ADMIN:
            raise PermissionError("Only admins can change member roles")
        
        member = self._get_member(organization_id, user_id)
        if not member:
            raise ValueError("Member not found")
        
        member.role = new_role
        logger.info(f"Updated role for user {user_id} to {new_role.value}")
        return True
    
    def remove_member(self, organization_id: str, user_id: str, 
                     removed_by: str) -> bool:
        """Remove member from organization"""
        
        # Verify remover has permission
        remover_member = self._get_member(organization_id, removed_by)
        if not remover_member or remover_member.role not in [OrganizationRole.ADMIN, OrganizationRole.TEAM_LEAD]:
            raise PermissionError("Only admins and team leads can remove members")
        
        key = f"{organization_id}:{user_id}"
        if key in self.members:
            del self.members[key]
            logger.info(f"Removed user {user_id} from organization {organization_id}")
            return True
        return False
    
    def get_user_permissions(self, organization_id: str, user_id: str) -> List[str]:
        """Get user's permissions in organization"""
        member = self._get_member(organization_id, user_id)
        if not member:
            return []
        
        permissions = []
        
        # Base permissions by role
        if member.role == OrganizationRole.ADMIN:
            permissions = ['read', 'write', 'delete', 'manage_members', 'manage_settings', 'manage_billing']
        elif member.role == OrganizationRole.TEAM_LEAD:
            permissions = ['read', 'write', 'delete', 'manage_members']
        elif member.role == OrganizationRole.MEMBER:
            permissions = ['read', 'write']
        else:  # VIEWER
            permissions = ['read']
        
        return permissions
    
    def _generate_slug(self, name: str) -> str:
        """Generate URL-friendly slug from name"""
        slug = name.lower().strip()
        slug = ''.join(c if c.isalnum() else '-' for c in slug)
        slug = '-'.join(filter(None, slug.split('-')))  # Remove consecutive dashes
        return slug[:100]  # Limit length


class WorkspaceManager:
    """Manages team workspaces"""
    
    def __init__(self, db_session):
        self.db = db_session
        self.workspaces: Dict[str, TeamWorkspace] = {}
        self.workspace_members: Dict[str, Dict[str, str]] = {}  # workspace_id -> {user_id -> role}
    
    def create_workspace(self, organization_id: str, name: str, 
                        description: str = None, lead_id: str = None) -> TeamWorkspace:
        """Create new team workspace"""
        
        workspace = TeamWorkspace(
            organization_id=organization_id,
            name=name,
            description=description,
            lead_id=lead_id
        )
        
        self.workspaces[workspace.id] = workspace
        self.workspace_members[workspace.id] = {}
        
        # Add creator as workspace lead if specified
        if lead_id:
            self.add_member(workspace.id, lead_id, 'admin')
        
        logger.info(f"Created workspace '{name}' in organization {organization_id}")
        return workspace
    
    def add_member(self, workspace_id: str, user_id: str, role: str = 'member') -> bool:
        """Add member to workspace"""
        if workspace_id not in self.workspace_members:
            self.workspace_members[workspace_id] = {}
        
        self.workspace_members[workspace_id][user_id] = role
        logger.info(f"Added user {user_id} to workspace {workspace_id} as {role}")
        return True
    
    def remove_member(self, workspace_id: str, user_id: str) -> bool:
        """Remove member from workspace"""
        if workspace_id in self.workspace_members:
            if user_id in self.workspace_members[workspace_id]:
                del self.workspace_members[workspace_id][user_id]
                logger.info(f"Removed user {user_id} from workspace {workspace_id}")
                return True
        return False
    
    def get_workspace_members(self, workspace_id: str) -> Dict[str, str]:
        """Get workspace members"""
        return self.workspace_members.get(workspace_id, {})


# Example usage
if __name__ == "__main__":
    # Mock database session
    db_session = None
    
    # Create organization manager
    org_manager = OrganizationManager(db_session)
    
    # Create organization
    try:
        org = org_manager.create_organization(
            name="Acme Corporation",
            admin_email="admin@acme.com",
            admin_password="SecurePassword123!",
            domain="acme.com"
        )
        print(f"✓ Created organization: {org.name} ({org.slug})")
        
        # Invite team member
        invitation = org_manager.invite_member(
            organization_id=org.id,
            email="john.doe@acme.com",
            role=OrganizationRole.TEAM_LEAD,
            invited_by=org_manager.users[list(org_manager.users.keys())[0]].id
        )
        print(f"✓ Sent invitation to {invitation.email}")
        
    except Exception as e:
        print(f"✗ Error: {e}")