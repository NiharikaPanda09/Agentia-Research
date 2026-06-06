import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.all_models import Note, Workspace, User
from app.schemas.all_schemas import NoteCreate, NoteUpdate, NoteResponse

router = APIRouter(prefix="/notes", tags=["notes"])

@router.get("/", response_model=List[NoteResponse])
def get_notes(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized workspace access")
        
    return db.query(Note).filter(Note.workspace_id == workspace_id).order_by(Note.updated_at.desc()).all()

@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    note_in: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(Workspace.id == note_in.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized workspace access")

    note = Note(
        id=str(uuid.uuid4()),
        workspace_id=note_in.workspace_id,
        title=note_in.title,
        content=note_in.content,
        linked_chat_id=note_in.linked_chat_id
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.get("/{note_id}", response_model=NoteResponse)
def get_note_by_id(
    note_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    workspace = note.workspace
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized workspace access")
        
    return note

@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: str,
    note_in: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    workspace = note.workspace
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized workspace access")
        
    # Update fields
    if note_in.title is not None:
        note.title = note_in.title
    if note_in.content is not None:
        note.content = note_in.content
    if note_in.linked_chat_id is not None:
        note.linked_chat_id = note_in.linked_chat_id
        
    db.commit()
    db.refresh(note)
    return note

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    workspace = note.workspace
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized workspace access")
        
    db.delete(note)
    db.commit()
    return None
