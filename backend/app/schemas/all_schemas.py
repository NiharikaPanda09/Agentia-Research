from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Token and Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Citations ---
class CitationResponse(BaseModel):
    id: str
    message_id: str
    source_title: str
    source_url: Optional[str] = None
    snippet: Optional[str] = None
    confidence_score: float

    class Config:
        from_attributes = True

# --- Messages ---
class MessageResponse(BaseModel):
    id: str
    chat_id: str
    sender: str
    content: str
    agent_flow_state: Optional[str] = None
    created_at: datetime
    citations: List[CitationResponse] = []

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str

# --- Chats ---
class ChatBase(BaseModel):
    title: str

class ChatCreate(BaseModel):
    title: str
    workspace_id: str

class ChatResponse(BaseModel):
    id: str
    title: str
    workspace_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Uploaded Files ---
class UploadedFileResponse(BaseModel):
    id: str
    workspace_id: str
    filename: str
    file_type: str
    size: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Reports ---
class ReportCreate(BaseModel):
    chat_id: str
    workspace_id: str
    title: str

class ReportResponse(BaseModel):
    id: str
    chat_id: str
    workspace_id: str
    title: str
    markdown_content: str
    generated_at: datetime

    class Config:
        from_attributes = True

# --- Notes ---
class NoteCreate(BaseModel):
    workspace_id: str
    title: str
    content: Optional[str] = ""
    linked_chat_id: Optional[str] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    linked_chat_id: Optional[str] = None

class NoteResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    content: str
    linked_chat_id: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Workspaces ---
class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    created_at: datetime

    class Config:
        from_attributes = True
