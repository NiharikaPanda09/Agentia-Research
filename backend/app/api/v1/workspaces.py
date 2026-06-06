import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.all_models import Workspace, User
from app.schemas.all_schemas import WorkspaceCreate, WorkspaceResponse

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

@router.get("/", response_model=List[WorkspaceResponse])
def get_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Retrieve all workspaces where user is a member or owner
    # Using join or direct owner query:
    workspaces = current_user.workspaces
    # If the user is the owner but somehow not in the members list, we merge them
    owned_workspaces = db.query(Workspace).filter(Workspace.owner_id == current_user.id).all()
    
    workspace_ids = {w.id for w in workspaces}
    for w in owned_workspaces:
        if w.id not in workspace_ids:
            workspaces.append(w)
            
    return workspaces

@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    workspace_in: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = Workspace(
        id=str(uuid.uuid4()),
        name=workspace_in.name,
        description=workspace_in.description,
        owner_id=current_user.id
    )
    workspace.members.append(current_user)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace_by_id(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Check if user is member
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this workspace")
        
    return workspace

@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the workspace owner can delete it")
        
    db.delete(workspace)
    db.commit()
    return None
