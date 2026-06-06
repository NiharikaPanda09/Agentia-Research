import os
import uuid
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.all_models import UploadedFile, DocumentChunk, Workspace, User
from app.schemas.all_schemas import UploadedFileResponse
from app.services.document_parser import parse_file
from app.services.vector_store import get_embedding

router = APIRouter(prefix="/documents", tags=["documents"])

# Root directory for uploaded documents
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", response_model=List[UploadedFileResponse])
def list_workspace_files(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized workspace access")
        
    return db.query(UploadedFile).filter(UploadedFile.workspace_id == workspace_id).order_by(UploadedFile.created_at.desc()).all()

@router.post("/upload", response_model=UploadedFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    workspace_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized workspace access")
        
    # Standard security checks
    filename = file.filename
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
        
    ext = os.path.splitext(filename)[1].lower().strip(".")
    if ext not in ["pdf", "docx", "csv", "txt"]:
        raise HTTPException(
            status_code=400, 
            detail="Unsupported format. Only PDF, DOCX, CSV, and TXT files are accepted."
        )
        
    file_id = str(uuid.uuid4())
    stored_filename = f"{file_id}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)
    
    # Save file on local system
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    # Get file size
    size_bytes = os.path.getsize(file_path)
    
    # Create DB file row
    uploaded_file = UploadedFile(
        id=file_id,
        workspace_id=workspace_id,
        filename=filename,
        filepath=file_path,
        file_type=ext,
        size=size_bytes
    )
    db.add(uploaded_file)
    
    # Parse and index file in background/sequentially
    try:
        chunks = parse_file(file_path, ext)
        for chunk in chunks:
            text_content = chunk["content"]
            page_num = chunk.get("page_number", 1)
            
            # Generate vector embedding (fallback works automatically in vector_store)
            vector = get_embedding(text_content)
            
            db_chunk = DocumentChunk(
                id=str(uuid.uuid4()),
                file_id=file_id,
                content=text_content,
                embedding=vector,
                page_number=page_num
            )
            db.add(db_chunk)
            
        db.commit()
        db.refresh(uploaded_file)
    except Exception as e:
        db.rollback()
        # Clean up files from disk on error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to parse and index file content: {str(e)}")
        
    return uploaded_file

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    uploaded_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not uploaded_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    # Check workspace permissions
    workspace = uploaded_file.workspace
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized workspace access")
        
    # Remove file from disk
    if os.path.exists(uploaded_file.filepath):
        try:
            os.remove(uploaded_file.filepath)
        except Exception:
            pass
            
    db.delete(uploaded_file)
    db.commit()
    return None
