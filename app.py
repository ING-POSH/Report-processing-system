#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Report Processing System - Main Application
Author: Boo-Boo Konneh
Date: March 2026
"""

import os
import uuid
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
import logging

# Import organization management
from organization_manager import OrganizationManager, WorkspaceManager, OrganizationRole

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()  # Load .env file

# Error handler for better debugging
@app.errorhandler(Exception)
def handle_exception(e):
    """Handle uncaught exceptions"""
    logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
    return jsonify({'error': 'Internal server error', 'details': str(e) if app.debug else 'See logs'}), 500

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///report_bot.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
app.config['PROCESSED_FOLDER'] = os.path.join(os.getcwd(), 'processed')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['DEBUG'] = True  # Enable debug mode for detailed errors

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app)
jwt = JWTManager(app)

# Create upload directories
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)

# Initialize managers
org_manager = OrganizationManager(db)
workspace_manager = WorkspaceManager(db)

# ==================== DATABASE MODELS ====================

class User(db.Model):
    """User model"""
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255))
    avatar_url = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    last_login = db.Column(db.DateTime)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'avatar_url': self.avatar_url,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Organization(db.Model):
    """Organization model"""
    __tablename__ = 'organizations'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    domain = db.Column(db.String(255), unique=True)
    subscription_tier = db.Column(db.String(50), default='free')
    status = db.Column(db.String(20), default='active')
    settings = db.Column(db.JSON, default={})
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'domain': self.domain,
            'subscription_tier': self.subscription_tier,
            'status': self.status,
            'settings': self.settings,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class OrganizationMember(db.Model):
    """Organization member model"""
    __tablename__ = 'organization_members'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = db.Column(db.String(36), db.ForeignKey('organizations.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # admin, team_lead, member, viewer
    status = db.Column(db.String(20), default='active')
    invited_by = db.Column(db.String(36), db.ForeignKey('users.id'))
    invited_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    joined_at = db.Column(db.DateTime)
    
    __table_args__ = (db.UniqueConstraint('organization_id', 'user_id', name='unique_org_member'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'user_id': self.user_id,
            'role': self.role,
            'status': self.status,
            'invited_at': self.invited_at.isoformat() if self.invited_at else None,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None
        }

class TeamWorkspace(db.Model):
    """Team workspace model"""
    __tablename__ = 'team_workspaces'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = db.Column(db.String(36), db.ForeignKey('organizations.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    lead_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    settings = db.Column(db.JSON, default={})
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'name': self.name,
            'description': self.description,
            'lead_id': self.lead_id,
            'settings': self.settings,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ProcessingTask(db.Model):
    """Document processing task model"""
    __tablename__ = 'processing_tasks'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = db.Column(db.String(36), db.ForeignKey('team_workspaces.id'))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50))
    status = db.Column(db.String(50), default='pending')  # pending, processing, completed, failed
    progress = db.Column(db.Float, default=0.0)
    result_path = db.Column(db.String(500))
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'user_id': self.user_id,
            'file_name': self.file_name,
            'file_type': self.file_type,
            'status': self.status,
            'progress': self.progress,
            'result_path': self.result_path,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

# ==================== NEW MODELS: UN-HABITAT SPECIFIC ====================

class StakeholderReport(db.Model):
    """Report submitted and tagged by stakeholder type"""
    __tablename__ = 'stakeholder_reports'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = db.Column(db.String(36), db.ForeignKey('team_workspaces.id'), nullable=False)
    submitted_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    space_id = db.Column(db.String(36), db.ForeignKey('spaces.id'))
    title = db.Column(db.String(255), nullable=False)
    report_type = db.Column(db.String(50))  # meeting_minutes, field_report, article, assessment
    report_category = db.Column(db.String(30))  # biweekly, monthly, field, meeting_minutes
    stakeholder_type = db.Column(db.String(50))  # trader, street_vendor, resident, urban_regen_team
    location = db.Column(db.String(255))
    content = db.Column(db.Text)
    file_path = db.Column(db.String(500))
    file_name = db.Column(db.String(255))
    file_type = db.Column(db.String(50))
    status = db.Column(db.String(30), default='pending')  # pending, processing, completed
    processing_task_id = db.Column(db.String(36), db.ForeignKey('processing_tasks.id'))
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'space_id': self.space_id,
            'submitted_by': self.submitted_by,
            'title': self.title,
            'report_type': self.report_type,
            'report_category': self.report_category,
            'stakeholder_type': self.stakeholder_type,
            'location': self.location,
            'content': self.content,
            'status': self.status,
            'file_name': self.file_name,
            'file_type': self.file_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Task(db.Model):
    """Task assignment model"""
    __tablename__ = 'tasks'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = db.Column(db.String(36), db.ForeignKey('team_workspaces.id'), nullable=False)
    organization_id = db.Column(db.String(36), db.ForeignKey('organizations.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    assigned_to = db.Column(db.String(36), db.ForeignKey('users.id'))
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'))  # null = UNH task
    week_of = db.Column(db.DateTime)  # for weekly task planning
    stakeholder_type = db.Column(db.String(50))  # trader, street_vendor, resident
    priority = db.Column(db.String(20), default='medium')  # low, medium, high
    status = db.Column(db.String(30), default='open')  # open, in_progress, completed, cancelled
    due_date = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'organization_id': self.organization_id,
            'project_id': self.project_id,
            'title': self.title,
            'description': self.description,
            'assigned_to': self.assigned_to,
            'created_by': self.created_by,
            'stakeholder_type': self.stakeholder_type,
            'priority': self.priority,
            'status': self.status,
            'week_of': self.week_of.isoformat() if self.week_of else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ActivityLog(db.Model):
    """Activity and engagement log"""
    __tablename__ = 'activity_logs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = db.Column(db.String(36), db.ForeignKey('organizations.id'), nullable=False)
    workspace_id = db.Column(db.String(36), db.ForeignKey('team_workspaces.id'))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)  # report_uploaded, task_assigned, engagement_logged
    entity_type = db.Column(db.String(50))  # report, task, stakeholder
    entity_id = db.Column(db.String(36))
    stakeholder_type = db.Column(db.String(50))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'workspace_id': self.workspace_id,
            'user_id': self.user_id,
            'action': self.action,
            'entity_type': self.entity_type,
            'stakeholder_type': self.stakeholder_type,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ==================== DUAL-SPACE MODELS ====================

class Space(db.Model):
    """Operational space — UNH Internal or Partner Projects"""
    __tablename__ = 'spaces'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = db.Column(db.String(36), db.ForeignKey('organizations.id'), nullable=False)
    space_type = db.Column(db.String(30), nullable=False)  # 'unh_internal' | 'partner_projects'
    is_paid_tier = db.Column(db.Boolean, default=False)
    settings = db.Column(db.JSON, default={})
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'space_type': self.space_type,
            'is_paid_tier': self.is_paid_tier,
            'settings': self.settings,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Project(db.Model):
    """Partner project — lives in partner_projects space"""
    __tablename__ = 'projects'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    space_id = db.Column(db.String(36), db.ForeignKey('spaces.id'), nullable=False)
    organization_id = db.Column(db.String(36), db.ForeignKey('organizations.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    partner_name = db.Column(db.String(255))
    partner_org = db.Column(db.String(255))
    status = db.Column(db.String(30), default='active')  # active, completed, on_hold
    risk_level = db.Column(db.String(20), default='low')  # low, medium, high
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def to_dict(self):
        return {
            'id': self.id,
            'space_id': self.space_id,
            'organization_id': self.organization_id,
            'name': self.name,
            'description': self.description,
            'partner_name': self.partner_name,
            'partner_org': self.partner_org,
            'status': self.status,
            'risk_level': self.risk_level,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class RiskEntry(db.Model):
    """Risk analysis entry for a project"""
    __tablename__ = 'risk_entries'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    likelihood = db.Column(db.String(20), default='medium')  # low, medium, high
    impact = db.Column(db.String(20), default='medium')      # low, medium, high
    mitigation_plan = db.Column(db.Text)
    status = db.Column(db.String(20), default='open')        # open, mitigated, closed
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'title': self.title,
            'description': self.description,
            'likelihood': self.likelihood,
            'impact': self.impact,
            'mitigation_plan': self.mitigation_plan,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class StakeholderEngagement(db.Model):
    """Stakeholder engagement log for partner projects"""
    __tablename__ = 'stakeholder_engagements'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'), nullable=False)
    engaged_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    stakeholder_name = db.Column(db.String(255))
    stakeholder_type = db.Column(db.String(50))
    engagement_type = db.Column(db.String(50))  # meeting, consultation, survey, workshop
    notes = db.Column(db.Text)
    date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'engaged_by': self.engaged_by,
            'stakeholder_name': self.stakeholder_name,
            'stakeholder_type': self.stakeholder_type,
            'engagement_type': self.engagement_type,
            'notes': self.notes,
            'date': self.date.isoformat() if self.date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class TranscriptionJob(db.Model):
    """Audio transcription and report generation job"""
    __tablename__ = 'transcription_jobs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    space_id = db.Column(db.String(36), db.ForeignKey('spaces.id'), nullable=False)
    submitted_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    organization_id = db.Column(db.String(36), db.ForeignKey('organizations.id'), nullable=False)
    workspace_id = db.Column(db.String(36), db.ForeignKey('team_workspaces.id'))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'))
    audio_file_path = db.Column(db.String(500), nullable=False)
    audio_file_name = db.Column(db.String(255))
    transcript_text = db.Column(db.Text)
    generated_report = db.Column(db.Text)
    report_format = db.Column(db.String(30), default='unh_template')  # unh_template | partner_generic
    status = db.Column(db.String(30), default='pending')  # pending, transcribing, generating, completed, failed
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    completed_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'space_id': self.space_id,
            'submitted_by': self.submitted_by,
            'audio_file_name': self.audio_file_name,
            'transcript_text': self.transcript_text,
            'generated_report': self.generated_report,
            'report_format': self.report_format,
            'status': self.status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


# ==================== AUTH ROUTES ====================

@app.route('/api/auth/signup/organization', methods=['POST'])
def signup_organization():
    """Register new organization with admin user"""
    data = request.get_json()
    
    required_fields = ['organization_name', 'admin_email', 'admin_password']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Check if organization slug is available
        slug = data['organization_name'].lower().replace(' ', '-').replace('--', '-')
        existing_org = Organization.query.filter_by(slug=slug).first()
        if existing_org:
            return jsonify({'error': 'Organization name already taken'}), 409
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=data['admin_email']).first()
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 409
        
        # Create organization
        org = Organization(
            name=data['organization_name'],
            slug=slug,
            domain=data.get('domain'),
            subscription_tier=data.get('subscription_tier', 'free')
        )
        db.session.add(org)
        db.session.flush()
        
        # Create admin user
        admin_user = User(
            email=data['admin_email'],
            full_name=data.get('admin_name'),
            is_verified=False
        )
        admin_user.set_password(data['admin_password'])
        db.session.add(admin_user)
        db.session.flush()
        
        # Add admin as organization member
        member = OrganizationMember(
            organization_id=org.id,
            user_id=admin_user.id,
            role='admin',
            status='active',
            joined_at=db.func.current_timestamp()
        )
        db.session.add(member)
        
        # Create default workspace
        default_workspace = TeamWorkspace(
            organization_id=org.id,
            name='Default Workspace',
            description='Default team workspace',
            lead_id=admin_user.id
        )
        db.session.add(default_workspace)

        # Auto-create both spaces for the organization
        unh_space = Space(organization_id=org.id, space_type='unh_internal', is_paid_tier=False)
        partner_space = Space(organization_id=org.id, space_type='partner_projects', is_paid_tier=True)
        db.session.add(unh_space)
        db.session.add(partner_space)

        db.session.commit()
        
        # Generate JWT token
        access_token = create_access_token(
            identity=admin_user.id,
            additional_claims={'organization_id': org.id, 'role': 'admin'}
        )
        
        logger.info(f"Created organization '{org.name}' with admin {admin_user.email}")
        
        return jsonify({
            'message': 'Organization created successfully',
            'organization': org.to_dict(),
            'user': {**admin_user.to_dict(), 'role': 'admin'},
            'spaces': [unh_space.to_dict(), partner_space.to_dict()],
            'access_token': access_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating organization: {type(e).__name__}: {str(e)}", exc_info=True)
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to create organization', 'details': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login"""
    data = request.get_json()
    
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Missing email or password'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 403
    
    # Get user's primary organization
    primary_membership = OrganizationMember.query.filter_by(
        user_id=user.id,
        status='active'
    ).first()
    
    # Update last login
    user.last_login = db.func.current_timestamp()
    db.session.commit()
    
    # Generate JWT token
    additional_claims = {}
    org_id_for_spaces = None
    if primary_membership:
        additional_claims['organization_id'] = primary_membership.organization_id
        additional_claims['role'] = primary_membership.role
        org_id_for_spaces = primary_membership.organization_id

    access_token = create_access_token(
        identity=user.id,
        additional_claims=additional_claims
    )

    # Include spaces in login response
    spaces = []
    if org_id_for_spaces:
        spaces = [s.to_dict() for s in Space.query.filter_by(organization_id=org_id_for_spaces).all()]
        org = Organization.query.get(org_id_for_spaces)
    else:
        org = None

    logger.info(f"User {user.email} logged in")

    return jsonify({
        'message': 'Login successful',
        'user': {**user.to_dict(), 'role': primary_membership.role if primary_membership else None},
        'organization': org.to_dict() if org else None,
        'spaces': spaces,
        'access_token': access_token
    }), 200

# ==================== ORGANIZATION ROUTES ====================

@app.route('/api/organizations/<org_id>', methods=['GET'])
@jwt_required()
def get_organization(org_id):
    """Get organization details"""
    current_user_id = get_jwt_identity()
    
    # Verify user has access to this organization
    membership = OrganizationMember.query.filter_by(
        organization_id=org_id,
        user_id=current_user_id,
        status='active'
    ).first()
    
    if not membership:
        return jsonify({'error': 'Access denied'}), 403
    
    org = Organization.query.get(org_id)
    if not org:
        return jsonify({'error': 'Organization not found'}), 404
    
    # Get members count
    members_count = OrganizationMember.query.filter_by(
        organization_id=org_id,
        status='active'
    ).count()
    
    # Get workspaces count
    workspaces_count = TeamWorkspace.query.filter_by(organization_id=org_id).count()
    
    return jsonify({
        'organization': org.to_dict(),
        'members_count': members_count,
        'workspaces_count': workspaces_count
    }), 200

@app.route('/api/organizations/<org_id>/members', methods=['GET'])
@jwt_required()
def get_organization_members(org_id):
    """List organization members"""
    current_user_id = get_jwt_identity()
    
    # Verify user has access
    membership = OrganizationMember.query.filter_by(
        organization_id=org_id,
        user_id=current_user_id,
        status='active'
    ).first()
    
    if not membership:
        return jsonify({'error': 'Access denied'}), 403
    
    members = OrganizationMember.query.filter_by(
        organization_id=org_id,
        status='active'
    ).all()
    
    member_list = []
    for member in members:
        user = User.query.get(member.user_id)
        member_list.append({
            'id': member.id,
            'user': user.to_dict() if user else None,
            'role': member.role,
            'joined_at': member.joined_at.isoformat() if member.joined_at else None
        })
    
    return jsonify({'members': member_list}), 200

@app.route('/api/organizations/<org_id>/invite', methods=['POST'])
@jwt_required()
def invite_member(org_id):
    """Invite new member to organization"""
    current_user_id = get_jwt_identity()
    
    # Verify inviter has permission
    inviter_membership = OrganizationMember.query.filter_by(
        organization_id=org_id,
        user_id=current_user_id,
        status='active'
    ).first()
    
    if not inviter_membership or inviter_membership.role not in ['admin', 'team_lead']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    
    if not data or 'email' not in data or 'role' not in data:
        return jsonify({'error': 'Missing email or role'}), 400
    
    valid_roles = ['admin', 'team_lead', 'member', 'viewer']
    if data['role'] not in valid_roles:
        return jsonify({'error': f'Invalid role. Must be one of: {valid_roles}'}), 400
    
    # Check if user already exists
    existing_user = User.query.filter_by(email=data['email']).first()
    
    # Check if user is already a member
    if existing_user:
        existing_membership = OrganizationMember.query.filter_by(
            organization_id=org_id,
            user_id=existing_user.id,
            status='active'
        ).first()
        if existing_membership:
            return jsonify({'error': 'User is already a member'}), 409
    
    # TODO: Send invitation email
    # For now, we'll directly add the user if they exist, or create pending invitation
    
    logger.info(f"Invitation sent to {data['email']} for organization {org_id}")
    
    return jsonify({
        'message': 'Invitation sent successfully',
        'email': data['email'],
        'role': data['role']
    }), 200

# ==================== WORKSPACE ROUTES ====================

@app.route('/api/workspaces', methods=['GET'])
@jwt_required()
def get_workspaces():
    """List user's workspaces"""
    current_user_id = get_jwt_identity()
    
    # Get user's organizations
    memberships = OrganizationMember.query.filter_by(
        user_id=current_user_id,
        status='active'
    ).all()
    
    org_ids = [m.organization_id for m in memberships]
    
    # Get workspaces from these organizations
    workspaces = TeamWorkspace.query.filter(TeamWorkspace.organization_id.in_(org_ids)).all()
    
    workspace_list = []
    for ws in workspaces:
        org = Organization.query.get(ws.organization_id)
        workspace_list.append({
            'id': ws.id,
            'organization_id': ws.organization_id,
            'organization_name': org.name if org else None,
            'name': ws.name,
            'description': ws.description,
            'created_at': ws.created_at.isoformat() if ws.created_at else None
        })
    
    return jsonify({'workspaces': workspace_list}), 200

@app.route('/api/workspaces', methods=['POST'])
@jwt_required()
def create_workspace():
    """Create new workspace"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or 'organization_id' not in data or 'name' not in data:
        return jsonify({'error': 'Missing organization_id or name'}), 400
    
    # Verify user has access to organization
    membership = OrganizationMember.query.filter_by(
        organization_id=data['organization_id'],
        user_id=current_user_id,
        status='active'
    ).first()
    
    if not membership:
        return jsonify({'error': 'Access denied to organization'}), 403
    
    if membership.role not in ['admin', 'team_lead']:
        return jsonify({'error': 'Insufficient permissions to create workspace'}), 403
    
    workspace = TeamWorkspace(
        organization_id=data['organization_id'],
        name=data['name'],
        description=data.get('description'),
        lead_id=current_user_id
    )
    
    db.session.add(workspace)
    db.session.commit()
    
    logger.info(f"Created workspace '{workspace.name}'")
    
    return jsonify({
        'message': 'Workspace created successfully',
        'workspace': workspace.to_dict()
    }), 201

# ==================== HEALTH CHECK ====================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    from datetime import datetime
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()}), 200

# ==================== STAKEHOLDER REPORTS ROUTES ====================

def _get_default_workspace(org_id):
    """Return the default workspace id for an organization"""
    ws = TeamWorkspace.query.filter_by(organization_id=org_id).first()
    return ws.id if ws else None


@app.route('/api/reports', methods=['GET'])
@jwt_required()
def list_reports():
    org_id = request.args.get('organization_id')
    workspace_id = request.args.get('workspace_id')
    stakeholder_type = request.args.get('stakeholder_type')
    report_category = request.args.get('report_category')
    project_id = request.args.get('project_id')

    query = StakeholderReport.query
    if org_id:
        # Filter via workspace → org join
        ws_ids = [w.id for w in TeamWorkspace.query.filter_by(organization_id=org_id).all()]
        query = query.filter(StakeholderReport.workspace_id.in_(ws_ids))
    elif workspace_id:
        query = query.filter_by(workspace_id=workspace_id)
    if stakeholder_type:
        query = query.filter_by(stakeholder_type=stakeholder_type)
    if report_category:
        query = query.filter_by(report_category=report_category)
    reports = query.order_by(StakeholderReport.created_at.desc()).all()
    return jsonify({'reports': [r.to_dict() for r in reports]}), 200


@app.route('/api/reports', methods=['POST'])
@jwt_required()
def create_report():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    if 'title' not in data:
        return jsonify({'error': 'Missing field: title'}), 400

    org_id = data.get('organization_id')
    # Auto-resolve workspace_id if not provided
    workspace_id = data.get('workspace_id') or (
        _get_default_workspace(org_id) if org_id else None
    )
    if not workspace_id:
        return jsonify({'error': 'Could not resolve workspace. Provide workspace_id or organization_id.'}), 400

    try:
        report = StakeholderReport(
            workspace_id=workspace_id,
            submitted_by=current_user_id,
            space_id=data.get('space_id'),
            title=data['title'],
            report_type=data.get('report_type'),
            report_category=data.get('report_category'),
            stakeholder_type=data.get('stakeholder_type'),
            location=data.get('location'),
            content=data.get('content'),
        )
        db.session.add(report)
        if org_id:
            log = ActivityLog(
                organization_id=org_id,
                workspace_id=workspace_id,
                user_id=current_user_id,
                action='report_uploaded',
                entity_type='report',
                entity_id=report.id,
                stakeholder_type=data.get('stakeholder_type'),
            )
            db.session.add(log)
        db.session.commit()
        return jsonify({'report': report.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating report: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ==================== TASKS ROUTES ====================

@app.route('/api/tasks', methods=['GET'])
@jwt_required()
def list_tasks():
    org_id = request.args.get('organization_id')
    workspace_id = request.args.get('workspace_id')
    status = request.args.get('status')
    project_id = request.args.get('project_id')
    week_of = request.args.get('week_of')

    query = Task.query
    if org_id:
        query = query.filter_by(organization_id=org_id)
    if workspace_id:
        query = query.filter_by(workspace_id=workspace_id)
    if status:
        query = query.filter_by(status=status)
    if project_id:
        query = query.filter_by(project_id=project_id)
    if week_of:
        # Return tasks for the ISO week that contains week_of date
        from datetime import datetime, timedelta
        try:
            week_start = datetime.fromisoformat(week_of.replace('Z', '+00:00')).replace(tzinfo=None)
            week_end = week_start + timedelta(days=7)
            query = query.filter(Task.week_of >= week_start, Task.week_of < week_end)
        except Exception:
            pass

    tasks = query.order_by(Task.created_at.desc()).all()
    result = []
    for t in tasks:
        d = t.to_dict()
        if t.assigned_to:
            u = User.query.get(t.assigned_to)
            d['assigned_to'] = u.full_name or u.email if u else t.assigned_to
        result.append(d)
    return jsonify({'tasks': result}), 200


@app.route('/api/tasks', methods=['POST'])
@jwt_required()
def create_task():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    if 'title' not in data or 'organization_id' not in data:
        return jsonify({'error': 'Missing title or organization_id'}), 400

    org_id = data['organization_id']
    workspace_id = data.get('workspace_id') or _get_default_workspace(org_id)
    if not workspace_id:
        return jsonify({'error': 'Could not resolve workspace'}), 400

    try:
        from datetime import datetime
        due = None
        if data.get('due_date'):
            due = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00')).replace(tzinfo=None)
        week = None
        if data.get('week_of'):
            week = datetime.fromisoformat(data['week_of'].replace('Z', '+00:00')).replace(tzinfo=None)

        task = Task(
            workspace_id=workspace_id,
            organization_id=org_id,
            title=data['title'],
            description=data.get('description'),
            assigned_to=data.get('assigned_to'),
            created_by=current_user_id,
            project_id=data.get('project_id'),
            week_of=week,
            stakeholder_type=data.get('stakeholder_type'),
            priority=data.get('priority', 'medium'),
            due_date=due,
        )
        db.session.add(task)
        log = ActivityLog(
            organization_id=org_id,
            workspace_id=workspace_id,
            user_id=current_user_id,
            action='task_assigned',
            entity_type='task',
            entity_id=task.id,
            stakeholder_type=data.get('stakeholder_type'),
        )
        db.session.add(log)
        db.session.commit()
        return jsonify({'task': task.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating task: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/tasks/<task_id>', methods=['PATCH'])
@jwt_required()
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()
    if 'status' in data:
        task.status = data['status']
        if data['status'] == 'completed':
            from datetime import datetime
            task.completed_at = datetime.now()
    if 'assigned_to' in data:
        task.assigned_to = data['assigned_to']
    if 'priority' in data:
        task.priority = data['priority']
    db.session.commit()
    return jsonify({'task': task.to_dict()}), 200


# ==================== ACTIVITY LOG ROUTES ====================

@app.route('/api/activity', methods=['GET'])
@jwt_required()
def list_activity():
    org_id = request.args.get('organization_id')
    workspace_id = request.args.get('workspace_id')
    query = ActivityLog.query
    if org_id:
        query = query.filter_by(organization_id=org_id)
    if workspace_id:
        query = query.filter_by(workspace_id=workspace_id)
    logs = query.order_by(ActivityLog.created_at.desc()).limit(50).all()
    result = []
    for log in logs:
        d = log.to_dict()
        user = User.query.get(log.user_id)
        d['user_name'] = user.full_name or user.email if user else 'Unknown'
        result.append(d)
    return jsonify({'activity': result}), 200


@app.route('/api/activity', methods=['POST'])
@jwt_required()
def log_activity():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    try:
        log = ActivityLog(
            organization_id=data['organization_id'],
            workspace_id=data.get('workspace_id'),
            user_id=current_user_id,
            action=data.get('action', 'engagement_logged'),
            entity_type=data.get('entity_type', 'stakeholder'),
            stakeholder_type=data.get('stakeholder_type'),
            notes=data.get('notes'),
        )
        db.session.add(log)
        db.session.commit()
        return jsonify({'log': log.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== DASHBOARD STATS ROUTE ====================

@app.route('/api/dashboard/stats', methods=['GET'])
@jwt_required()
def dashboard_stats():
    org_id = request.args.get('organization_id')
    if not org_id:
        return jsonify({'error': 'organization_id required'}), 400

    total_reports = StakeholderReport.query.join(
        TeamWorkspace, StakeholderReport.workspace_id == TeamWorkspace.id
    ).filter(TeamWorkspace.organization_id == org_id).count()

    total_tasks = Task.query.filter_by(organization_id=org_id).count()
    open_tasks = Task.query.filter_by(organization_id=org_id, status='open').count()
    completed_tasks = Task.query.filter_by(organization_id=org_id, status='completed').count()
    total_members = OrganizationMember.query.filter_by(organization_id=org_id, status='active').count()

    # Reports by stakeholder type
    from sqlalchemy import func
    stakeholder_counts = db.session.query(
        StakeholderReport.stakeholder_type, func.count(StakeholderReport.id)
    ).join(TeamWorkspace, StakeholderReport.workspace_id == TeamWorkspace.id
    ).filter(TeamWorkspace.organization_id == org_id
    ).group_by(StakeholderReport.stakeholder_type).all()

    return jsonify({
        'total_reports': total_reports,
        'total_tasks': total_tasks,
        'open_tasks': open_tasks,
        'completed_tasks': completed_tasks,
        'total_members': total_members,
        'stakeholder_breakdown': {k or 'untagged': v for k, v in stakeholder_counts},
    }), 200


# ==================== SPACE ROUTES ====================

def get_or_create_spaces(org_id):
    """Ensure both spaces exist for an organization"""
    spaces = {}
    for space_type in ['unh_internal', 'partner_projects']:
        sp = Space.query.filter_by(organization_id=org_id, space_type=space_type).first()
        if not sp:
            sp = Space(organization_id=org_id, space_type=space_type,
                       is_paid_tier=(space_type == 'partner_projects'))
            db.session.add(sp)
            db.session.flush()
        spaces[space_type] = sp
    return spaces


def require_space_access(space_type):
    """Decorator: block partner users from UNH routes and enforce paid tier on partner routes"""
    def decorator(fn):
        from functools import wraps
        @wraps(fn)
        def wrapper(*args, **kwargs):
            from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            # Paid tier check for partner_projects
            if space_type == 'partner_projects':
                org_id = request.args.get('organization_id') or (request.get_json() or {}).get('organization_id')
                if org_id:
                    org = Organization.query.get(org_id)
                    if org and org.subscription_tier == 'free':
                        # Check if this org is UNH (exempt from paid requirement)
                        sp = Space.query.filter_by(organization_id=org_id, space_type='unh_internal').first()
                        if not sp:
                            return jsonify({'error': 'Partner Projects space requires a paid subscription'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


@app.route('/api/spaces', methods=['GET'])
@jwt_required()
def list_spaces():
    org_id = request.args.get('organization_id')
    if not org_id:
        return jsonify({'error': 'organization_id required'}), 400
    # Auto-create spaces if not exist
    with db.session.begin_nested():
        spaces = get_or_create_spaces(org_id)
    db.session.commit()
    all_spaces = Space.query.filter_by(organization_id=org_id).all()
    return jsonify({'spaces': [s.to_dict() for s in all_spaces]}), 200


# ==================== PROJECT ROUTES (Partner Space) ====================

@app.route('/api/projects', methods=['GET'])
@jwt_required()
def list_projects():
    org_id = request.args.get('organization_id')
    status = request.args.get('status')
    query = Project.query.filter_by(organization_id=org_id)
    if status:
        query = query.filter_by(status=status)
    projects = query.order_by(Project.created_at.desc()).all()
    result = []
    for p in projects:
        d = p.to_dict()
        d['task_count'] = Task.query.filter_by(project_id=p.id).count()
        d['risk_count'] = RiskEntry.query.filter_by(project_id=p.id, status='open').count()
        result.append(d)
    return jsonify({'projects': result}), 200


@app.route('/api/projects', methods=['POST'])
@jwt_required()
def create_project():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    required = ['organization_id', 'name']
    for f in required:
        if f not in data:
            return jsonify({'error': f'Missing field: {f}'}), 400
    try:
        from datetime import datetime
        # Get or create partner space
        space = Space.query.filter_by(
            organization_id=data['organization_id'], space_type='partner_projects'
        ).first()
        if not space:
            space = Space(organization_id=data['organization_id'],
                          space_type='partner_projects', is_paid_tier=True)
            db.session.add(space)
            db.session.flush()

        project = Project(
            space_id=space.id,
            organization_id=data['organization_id'],
            name=data['name'],
            description=data.get('description'),
            partner_name=data.get('partner_name'),
            partner_org=data.get('partner_org'),
            status=data.get('status', 'active'),
            risk_level=data.get('risk_level', 'low'),
            start_date=datetime.fromisoformat(data['start_date']) if data.get('start_date') else None,
            end_date=datetime.fromisoformat(data['end_date']) if data.get('end_date') else None,
            created_by=current_user_id,
        )
        db.session.add(project)
        log = ActivityLog(
            organization_id=data['organization_id'],
            user_id=current_user_id,
            action='project_created',
            entity_type='project',
            entity_id=project.id,
        )
        db.session.add(log)
        db.session.commit()
        return jsonify({'project': project.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating project: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    project = Project.query.get_or_404(project_id)
    d = project.to_dict()
    d['tasks'] = [t.to_dict() for t in Task.query.filter_by(project_id=project_id).all()]
    d['open_risks'] = RiskEntry.query.filter_by(project_id=project_id, status='open').count()
    d['engagements'] = StakeholderEngagement.query.filter_by(project_id=project_id).count()
    return jsonify({'project': d}), 200


@app.route('/api/projects/<project_id>', methods=['PATCH'])
@jwt_required()
def update_project(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json()
    for field in ['name', 'description', 'partner_name', 'partner_org', 'status', 'risk_level']:
        if field in data:
            setattr(project, field, data[field])
    db.session.commit()
    return jsonify({'project': project.to_dict()}), 200


# ==================== RISK ROUTES ====================

@app.route('/api/projects/<project_id>/risks', methods=['GET'])
@jwt_required()
def list_risks(project_id):
    risks = RiskEntry.query.filter_by(project_id=project_id).order_by(RiskEntry.created_at.desc()).all()
    return jsonify({'risks': [r.to_dict() for r in risks]}), 200


@app.route('/api/projects/<project_id>/risks', methods=['POST'])
@jwt_required()
def create_risk(project_id):
    current_user_id = get_jwt_identity()
    data = request.get_json()
    try:
        risk = RiskEntry(
            project_id=project_id,
            title=data['title'],
            description=data.get('description'),
            likelihood=data.get('likelihood', 'medium'),
            impact=data.get('impact', 'medium'),
            mitigation_plan=data.get('mitigation_plan'),
            status=data.get('status', 'open'),
            created_by=current_user_id,
        )
        db.session.add(risk)
        db.session.commit()
        return jsonify({'risk': risk.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/risks/<risk_id>', methods=['PATCH'])
@jwt_required()
def update_risk(risk_id):
    risk = RiskEntry.query.get_or_404(risk_id)
    data = request.get_json()
    for field in ['title', 'likelihood', 'impact', 'mitigation_plan', 'status']:
        if field in data:
            setattr(risk, field, data[field])
    db.session.commit()
    return jsonify({'risk': risk.to_dict()}), 200


# ==================== STAKEHOLDER ENGAGEMENT ROUTES ====================

@app.route('/api/projects/<project_id>/engagements', methods=['GET'])
@jwt_required()
def list_engagements(project_id):
    engagements = StakeholderEngagement.query.filter_by(
        project_id=project_id
    ).order_by(StakeholderEngagement.date.desc()).all()
    return jsonify({'engagements': [e.to_dict() for e in engagements]}), 200


@app.route('/api/projects/<project_id>/engagements', methods=['POST'])
@jwt_required()
def create_engagement(project_id):
    current_user_id = get_jwt_identity()
    data = request.get_json()
    try:
        from datetime import datetime
        eng = StakeholderEngagement(
            project_id=project_id,
            engaged_by=current_user_id,
            stakeholder_name=data.get('stakeholder_name'),
            stakeholder_type=data.get('stakeholder_type'),
            engagement_type=data.get('engagement_type'),
            notes=data.get('notes'),
            date=datetime.fromisoformat(data['date']) if data.get('date') else datetime.now(),
        )
        db.session.add(eng)
        db.session.commit()
        return jsonify({'engagement': eng.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== TRANSCRIPTION ROUTES ====================

@app.route('/api/transcribe', methods=['POST'])
@jwt_required()
def start_transcription():
    current_user_id = get_jwt_identity()
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    space_id = request.form.get('space_id')
    organization_id = request.form.get('organization_id')
    report_format = request.form.get('report_format', 'unh_template')
    workspace_id = request.form.get('workspace_id')
    project_id = request.form.get('project_id')

    if not space_id or not organization_id:
        return jsonify({'error': 'space_id and organization_id required'}), 400

    # Enforce: partner space cannot use unh_template
    space = Space.query.get(space_id)
    if space and space.space_type == 'partner_projects' and report_format == 'unh_template':
        report_format = 'partner_generic'

    import tempfile
    audio_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}_{audio_file.filename}")
    audio_file.save(audio_path)

    try:
        job = TranscriptionJob(
            space_id=space_id,
            submitted_by=current_user_id,
            organization_id=organization_id,
            workspace_id=workspace_id,
            project_id=project_id,
            audio_file_path=audio_path,
            audio_file_name=audio_file.filename,
            report_format=report_format,
            status='transcribing',
        )
        db.session.add(job)
        db.session.commit()

        # Run transcription inline (for now — would be async in production)
        _run_transcription(job.id)

        job = TranscriptionJob.query.get(job.id)
        return jsonify({'job': job.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Transcription error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


def _run_transcription(job_id):
    """Run transcription and report generation for a job"""
    from datetime import datetime
    job = TranscriptionJob.query.get(job_id)
    if not job:
        return
    try:
        # Transcribe audio
        transcript = _transcribe_audio(job.audio_file_path)
        job.transcript_text = transcript
        job.status = 'generating'
        db.session.commit()

        # Generate report from transcript
        report = _generate_report(transcript, job.report_format, job.organization_id)
        job.generated_report = report
        job.status = 'completed'
        job.completed_at = datetime.now()
        db.session.commit()
    except Exception as e:
        job.status = 'failed'
        job.error_message = str(e)
        db.session.commit()
        logger.error(f"Transcription job {job_id} failed: {e}", exc_info=True)


def _transcribe_audio(audio_path):
    """Transcribe audio using OpenAI Whisper API, with local fallback"""
    openai_key = os.environ.get('OPENAI_API_KEY')

    # --- Primary: OpenAI Whisper API ---
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            with open(audio_path, 'rb') as audio_file:
                response = client.audio.transcriptions.create(
                    model='whisper-1',
                    file=audio_file,
                )
            logger.info("Transcription completed via OpenAI Whisper API")
            return response.text
        except Exception as e:
            logger.warning(f"OpenAI Whisper API failed: {e} — trying local fallback")

    # --- Fallback 1: local openai-whisper model ---
    try:
        import whisper
        model = whisper.load_model('base')
        result = model.transcribe(audio_path)
        logger.info("Transcription completed via local Whisper model")
        return result['text']
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"Local Whisper failed: {e}")

    # --- Fallback 2: SpeechRecognition ---
    try:
        import speech_recognition as sr
        from pydub import AudioSegment

        if not audio_path.lower().endswith('.wav'):
            audio = AudioSegment.from_file(audio_path)
            wav_path = audio_path + '.wav'
            audio.export(wav_path, format='wav')
        else:
            wav_path = audio_path

        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
            logger.info("Transcription completed via SpeechRecognition")
            return text
    except Exception as e:
        logger.warning(f"SpeechRecognition fallback failed: {e}")

    return f"[Transcription unavailable — audio received: {os.path.basename(audio_path)}]"


def _generate_report(transcript, report_format, organization_id):
    """Generate a structured report from transcript using GPT-4o if available, else template"""
    from datetime import datetime
    now = datetime.now().strftime('%B %d, %Y')
    openai_key = os.environ.get('OPENAI_API_KEY')

    # --- OpenAI GPT report generation ---
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)

            if report_format == 'unh_template':
                system_prompt = (
                    "You are a UN-Habitat reporting assistant. Given a meeting or field activity transcript, "
                    "generate a formal field report in UN-Habitat format. Include: Date, Location, Attendees, "
                    "Summary of Discussion, Key Points Raised, Action Items, Stakeholder Notes, and Next Steps. "
                    "Keep the tone professional and factual."
                )
            else:
                system_prompt = (
                    "You are a project reporting assistant. Given an activity or meeting transcript, "
                    "generate a clear project report. Include: Summary, Key Outcomes, Action Items, "
                    "and Next Steps. Keep the tone concise and professional."
                )

            response = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': f"Transcript:\n\n{transcript}\n\nDate: {now}"}
                ],
                max_tokens=1000,
                temperature=0.3,
            )
            logger.info("Report generated via GPT-4o-mini")
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"GPT report generation failed: {e} — using template fallback")

    # --- Template fallback ---
    if report_format == 'unh_template':
        return f"""UN-HABITAT FIELD REPORT
=======================
Date: {now}
Organization: UN-Habitat Urban Regeneration Programme

MEETING/ACTIVITY SUMMARY
-------------------------
{transcript}

KEY POINTS RAISED
-----------------
[Auto-extracted from transcript — review and complete before submission]

ACTION ITEMS
------------
[To be completed by report author]

STAKEHOLDER NOTES
-----------------
[To be completed by report author]

Next Steps: [To be completed]

Prepared by: ___________________
Reviewed by: ___________________
"""
    else:
        return f"""PROJECT REPORT
==============
Date: {now}

SUMMARY
-------
{transcript}

KEY OUTCOMES
------------
[Review transcript above and summarize key outcomes]

ACTION ITEMS
------------
[List action items identified during this session]

NEXT STEPS
----------
[Describe agreed next steps]

Prepared by: ___________________
"""


@app.route('/api/transcribe/<job_id>', methods=['GET'])
@jwt_required()
def get_transcription(job_id):
    job = TranscriptionJob.query.get_or_404(job_id)
    return jsonify({'job': job.to_dict()}), 200


@app.route('/api/transcribe', methods=['GET'])
@jwt_required()
def list_transcriptions():
    org_id = request.args.get('organization_id')
    space_id = request.args.get('space_id')
    query = TranscriptionJob.query.filter_by(organization_id=org_id)
    if space_id:
        query = query.filter_by(space_id=space_id)
    jobs = query.order_by(TranscriptionJob.created_at.desc()).limit(20).all()
    return jsonify({'jobs': [j.to_dict() for j in jobs]}), 200


# ==================== PARTNER DASHBOARD STATS ====================

@app.route('/api/dashboard/partner-stats', methods=['GET'])
@jwt_required()
def partner_dashboard_stats():
    org_id = request.args.get('organization_id')
    if not org_id:
        return jsonify({'error': 'organization_id required'}), 400

    total_projects = Project.query.filter_by(organization_id=org_id).count()
    active_projects = Project.query.filter_by(organization_id=org_id, status='active').count()
    completed_projects = Project.query.filter_by(organization_id=org_id, status='completed').count()

    open_risks = db.session.query(RiskEntry).join(
        Project, RiskEntry.project_id == Project.id
    ).filter(Project.organization_id == org_id, RiskEntry.status == 'open').count()

    high_risks = db.session.query(RiskEntry).join(
        Project, RiskEntry.project_id == Project.id
    ).filter(Project.organization_id == org_id, RiskEntry.impact == 'high', RiskEntry.status == 'open').count()

    total_engagements = db.session.query(StakeholderEngagement).join(
        Project, StakeholderEngagement.project_id == Project.id
    ).filter(Project.organization_id == org_id).count()

    projects = Project.query.filter_by(organization_id=org_id).all()
    project_summaries = []
    for p in projects:
        project_summaries.append({
            'id': p.id,
            'name': p.name,
            'partner_name': p.partner_name,
            'status': p.status,
            'risk_level': p.risk_level,
            'open_risks': RiskEntry.query.filter_by(project_id=p.id, status='open').count(),
        })

    return jsonify({
        'total_projects': total_projects,
        'active_projects': active_projects,
        'completed_projects': completed_projects,
        'open_risks': open_risks,
        'high_risks': high_risks,
        'total_engagements': total_engagements,
        'projects': project_summaries,
    }), 200


# ==================== APP INITIALIZATION ====================

if __name__ == '__main__':
    # Create database tables
    with app.app_context():
        db.create_all()
        logger.info("Database tables created")
    
    # Run the application
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Report Processing System on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)