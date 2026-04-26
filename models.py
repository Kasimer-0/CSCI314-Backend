import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

# Create the base class for SQLAlchemy
Base = declarative_base()


# ===========================================
# 1. Enumeration Type Definition (Enum)
# ============================================

class UserRole(str, enum.Enum):
    """System Character Enumeration (Corresponding to Story 4, 10: Character Assignment)"""
    SYS_ADMIN = "sys_admin"  # System administrator
    PLATFORM_ADMIN = "platform_admin"  # Platform administrator
    FUNDRAISER = "fundraiser"  # Fundraiser
    DONEE = "donee"  # Donee


class UserStatus(str, enum.Enum):
    """User Account Status Enumeration (Corresponding to Story 10, 11: Approval and Ban)"""
    PENDING = "pending"  # Pending approval (initial status after registration)
    ACTIVE = "active"  # Normal activity
    SUSPENDED = "suspended"  # Banned


# ===========================================
# 2. Database Table Model Definition (Models)
# ============================================

class User(Base):
    """
    User Core Information Table
    Covering Story 1 (Login), 3 (View Profile), 4 (Update Profile), 7 (Search Filter), 9 (Privacy Encryption)
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(100), unique=True, index=True, nullable=False)

    # Story 9: Privacy Encryption, Never Store Plaintext Passwords
    hashed_password = Column(String(255), nullable=False)

    username = Column(String(100), index=True)
    phone_number = Column(String(20), nullable=True)  # For use in updating contact information in Story 4

    # Role and Status Control (Story 10, 11)
    role = Column(Enum(UserRole), default=UserRole.DONEE, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING, nullable=False)

    # Story 6: Indicate whether the administrator account was manually created internally
    is_internal_admin = Column(Boolean, default=False)

    # Timestamps, recording the account's creation and last update times
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship Mapping: One user (administrator) can generate multiple operation logs
    audit_logs_made = relationship("AuditLog", foreign_keys="[AuditLog.admin_id]", back_populates="admin")
    # Relationship Mapping: One user can appear in multiple logs as the object of operation
    audit_logs_received = relationship("AuditLog", foreign_keys="[AuditLog.target_user_id]",
                                       back_populates="target_user")

    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role}', status='{self.status}')>"


class AuditLog(Base):
    """
    Audit Log Table
    Corresponding Story 12: Records sensitive operations such as blocking and approval for future reference.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Administrator ID performing the operation
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # Target user ID being operated on
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Action type, for example: "APPROVE_USER", "SUSPEND_USER", "RESET_PASSWORD"
    action = Column(String(50), nullable=False)

    # Detailed description of the action or reason, such as "Account permanently banned for fraud"
    details = Column(Text, nullable=True)

    # The time when the action occurred
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship Mapping (Establishing a bidirectional relationship with the User table)
    admin = relationship("User", foreign_keys=[admin_id], back_populates="audit_logs_made")
    target_user = relationship("User", foreign_keys=[target_user_id], back_populates="audit_logs_received")

    def __repr__(self):
        return f"<AuditLog(action='{self.action}', admin_id={self.admin_id}, target_id={self.target_user_id})>"