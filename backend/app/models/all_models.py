import datetime
import json
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text, Float, Boolean, Table
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator
from app.core.database import Base

# Helper table for workspace members
workspace_members = Table(
    "workspace_members",
    Base.metadata,
    Column("workspace_id", String, ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role", String, default="member") # admin, member, viewer
)

class SafeVector(TypeDecorator):
    """
    Handles pgvector.sqlalchemy Vector type when PostgreSQL is used, 
    otherwise falls back to text serialized JSON for SQLite.
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        try:
            return json.loads(value)
        except Exception:
            return value

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    workspaces = relationship("Workspace", secondary=workspace_members, back_populates="members")
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    members = relationship("User", secondary=workspace_members, back_populates="workspaces")
    chats = relationship("Chat", back_populates="workspace", cascade="all, delete-orphan")
    files = relationship("UploadedFile", back_populates="workspace", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="workspace", cascade="all, delete-orphan")

class Chat(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    workspace = relationship("Workspace", back_populates="chats")
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="chat", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="chat")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, index=True)
    chat_id = Column(String, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    # JSON state for active agents, e.g. {"active_agent": "Report Agent", "status": "completed"}
    agent_flow_state = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    chat = relationship("Chat", back_populates="messages")
    citations = relationship("Citation", back_populates="message", cascade="all, delete-orphan")

class Citation(Base):
    __tablename__ = "citations"

    id = Column(String, primary_key=True, index=True)
    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    source_title = Column(String, nullable=False)
    source_url = Column(String, nullable=True)
    snippet = Column(Text, nullable=True)
    confidence_score = Column(Float, default=1.0)

    message = relationship("Message", back_populates="citations")

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # "pdf", "docx", "csv", "txt"
    size = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    workspace = relationship("Workspace", back_populates="files")
    chunks = relationship("DocumentChunk", back_populates="file", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, index=True)
    file_id = Column(String, ForeignKey("uploaded_files.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(SafeVector, nullable=True)  # Store 768-dim floats list
    page_number = Column(Integer, nullable=True)

    file = relationship("UploadedFile", back_populates="chunks")

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    chat_id = Column(String, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    markdown_content = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

    chat = relationship("Chat", back_populates="reports")
    workspace = relationship("Workspace")

class Note(Base):
    __tablename__ = "notes"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    linked_chat_id = Column(String, ForeignKey("chats.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    workspace = relationship("Workspace", back_populates="notes")
    chat = relationship("Chat", back_populates="notes")
