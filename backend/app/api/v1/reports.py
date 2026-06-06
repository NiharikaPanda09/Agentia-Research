from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.all_models import Report, Workspace, User
from app.schemas.all_schemas import ReportResponse

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/", response_model=List[ReportResponse])
def get_reports(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized workspace access")
        
    return db.query(Report).filter(Report.workspace_id == workspace_id).order_by(Report.generated_at.desc()).all()

@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    workspace = report.workspace
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized report access")
        
    return report

@router.get("/{report_id}/export/markdown")
def export_report_markdown(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    workspace = report.workspace
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized report access")
        
    # Return report as text/markdown attachment download
    response_content = report.markdown_content
    filename = f"{report.title.lower().replace(' ', '_')}.md"
    
    return Response(
        content=response_content,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    workspace = report.workspace
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized report access")
        
    db.delete(report)
    db.commit()
    return None
