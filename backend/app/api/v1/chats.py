import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.core.security import verify_token
from app.models.all_models import Chat, Message, User, Citation, Report, Workspace
from app.schemas.all_schemas import ChatCreate, ChatResponse, MessageResponse
from app.agents.graph import run_research_flow

router = APIRouter(prefix="/chats", tags=["chats"])

@router.get("/", response_model=List[ChatResponse])
def get_chats(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify workspace membership
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view workspace chats")
        
    return db.query(Chat).filter(Chat.workspace_id == workspace_id).order_by(Chat.created_at.desc()).all()

@router.post("/", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
def create_chat(
    chat_in: ChatCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(Workspace.id == chat_in.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add chats here")

    chat = Chat(
        id=str(uuid.uuid4()),
        title=chat_in.title,
        workspace_id=chat_in.workspace_id,
        user_id=current_user.id
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat

@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
def get_chat_messages(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    # Verify workspace membership
    workspace = chat.workspace
    if current_user not in workspace.members and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to read these messages")
        
    return db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()

# --- Real-time Multi-Agent WebSocket ---

@router.websocket("/ws/{chat_id}")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    chat_id: str,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    await websocket.accept()
    
    # 1. Authenticate WebSocket token
    if not token:
        await websocket.send_json({"type": "error", "message": "Missing authentication token"})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    user_id = verify_token(token)
    if not user_id:
        await websocket.send_json({"type": "error", "message": "Invalid or expired token"})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    user = db.query(User).filter(User.id == user_id).first()
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat or not user:
        await websocket.send_json({"type": "error", "message": "Chat or User session missing"})
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return
        
    # Check workspace membership
    workspace = chat.workspace
    if user not in workspace.members and workspace.owner_id != user.id:
        await websocket.send_json({"type": "error", "message": "Access unauthorized"})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        while True:
            # Receive research queries from the client
            data = await websocket.receive_text()
            payload = json.loads(data)
            query_content = payload.get("content")
            
            if not query_content:
                continue
                
            # A. Save user message to database
            user_msg_id = str(uuid.uuid4())
            user_msg = Message(
                id=user_msg_id,
                chat_id=chat_id,
                sender="user",
                content=query_content
            )
            db.add(user_msg)
            db.commit()
            
            # Send confirmation of user message back
            await websocket.send_json({
                "type": "message",
                "message": {
                    "id": user_msg_id,
                    "chat_id": chat_id,
                    "sender": "user",
                    "content": query_content,
                    "created_at": str(user_msg.created_at),
                    "citations": []
                }
            })

            # Fetch context history for memory agent
            previous_messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()
            history = [{"role": msg.sender, "content": msg.content} for msg in previous_messages[:-1]]
            
            # B. Define WebSocket update callback
            async def send_agent_update(update_payload: dict):
                try:
                    await websocket.send_json(update_payload)
                except Exception as e:
                    print(f"WebSocket update transmission error: {e}")
                    
            # C. Spin up the LangGraph pipeline
            result_state = await run_research_flow(
                query=query_content,
                workspace_id=chat.workspace_id,
                chat_history=history,
                db=db,
                on_update=send_agent_update
            )
            
            # D. Persist results in Database
            assistant_msg_id = str(uuid.uuid4())
            assistant_msg = Message(
                id=assistant_msg_id,
                chat_id=chat_id,
                sender="assistant",
                content=result_state["final_answer"],
                agent_flow_state=json.dumps({
                    "workflow": "completed",
                    "active_agent": result_state.get("active_agent", "Finished")
                })
            )
            db.add(assistant_msg)
            
            # Save citations
            db_citations = []
            for c in result_state.get("verified_citations", []):
                cite = Citation(
                    id=str(uuid.uuid4()),
                    message_id=assistant_msg_id,
                    source_title=c["source_title"],
                    source_url=c["source_url"],
                    snippet=c["snippet"],
                    confidence_score=c["confidence_score"]
                )
                db.add(cite)
                db_citations.append({
                    "id": cite.id,
                    "message_id": assistant_msg_id,
                    "source_title": cite.source_title,
                    "source_url": cite.source_url,
                    "snippet": cite.snippet,
                    "confidence_score": cite.confidence_score
                })
                
            # Create a report if compiled
            report_data = None
            if result_state.get("report_markdown"):
                report = Report(
                    id=str(uuid.uuid4()),
                    chat_id=chat_id,
                    workspace_id=chat.workspace_id,
                    title=result_state.get("report_title", f"Report: {query_content[:30]}..."),
                    markdown_content=result_state["report_markdown"]
                )
                db.add(report)
                report_data = {
                    "id": report.id,
                    "chat_id": chat_id,
                    "title": report.title,
                    "markdown_content": report.markdown_content,
                    "generated_at": str(report.generated_at)
                }

            db.commit()

            # E. Stream final message details
            await websocket.send_json({
                "type": "message",
                "message": {
                    "id": assistant_msg_id,
                    "chat_id": chat_id,
                    "sender": "assistant",
                    "content": assistant_msg.content,
                    "created_at": str(assistant_msg.created_at),
                    "citations": db_citations
                },
                "report": report_data
            })
            
    except WebSocketDisconnect:
        print(f"WebSocket client disconnected from chat session {chat_id}.")
    except Exception as e:
        print(f"WebSocket execution error: {e}")
        await websocket.send_json({"type": "error", "message": str(e)})
