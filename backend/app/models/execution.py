from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Literal
from datetime import datetime
from enum import Enum
import uuid

class ExecutionStatus(str, Enum):
    PENDING = "pending"
    STARTING = "starting"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class TerminalOutputType(str, Enum):
    STDOUT = "stdout"
    STDERR = "stderr"
    SYSTEM = "system"
    AGENT = "agent"
    COMMAND = "command"

class MessageType(str, Enum):
    EXECUTION_STARTED = "execution_started"
    STEP_STARTED = "step_started"
    STEP_PROGRESS = "step_progress"
    STEP_COMPLETED = "step_completed"
    STEP_FAILED = "step_failed"
    TERMINAL_OUTPUT = "terminal_output"
    EXECUTION_COMPLETED = "execution_completed"
    EXECUTION_FAILED = "execution_failed"
    EXECUTION_PAUSED = "execution_paused"
    EXECUTION_RESUMED = "execution_resumed"
    EXECUTION_CANCELLED = "execution_cancelled"
    HEARTBEAT = "heartbeat"
    ERROR = "error"

class Artifact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # 'file', 'directory', 'output', 'log'
    path: Optional[str] = None
    size: Optional[int] = None
    content: Optional[str] = None  # For small files/outputs
    url: Optional[str] = None  # For downloadable artifacts
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExecutionStep(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    agent_type: str
    status: StepStatus = StepStatus.PENDING
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[str] = None  # Human readable duration
    progress: float = 0.0  # 0-100 percentage
    output: Optional[str] = None
    error_message: Optional[str] = None
    artifacts: List[Artifact] = []
    metadata: Optional[Dict[str, Any]] = None

class TerminalOutput(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    execution_id: str
    step_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    type: TerminalOutputType
    content: str
    agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class WorkflowExecution(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    workflow_id: Optional[str] = None
    workflow_name: str
    status: ExecutionStatus = ExecutionStatus.PENDING
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_duration: Optional[str] = None
    current_step_id: Optional[str] = None
    total_steps: int = 0
    completed_steps: int = 0
    failed_steps: int = 0
    progress: float = 0.0  # Overall progress 0-100
    steps: List[ExecutionStep] = []
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None

class ExecutionCreate(BaseModel):
    workflow_name: str
    workflow_data: Dict[str, Any]  # Contains nodes, edges, etc.
    estimated_steps: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

class ExecutionUpdate(BaseModel):
    status: Optional[ExecutionStatus] = None
    current_step_id: Optional[str] = None
    progress: Optional[float] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# WebSocket Message Models
class WebSocketMessage(BaseModel):
    type: MessageType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Optional[Dict[str, Any]] = None

class ExecutionStartedMessage(WebSocketMessage):
    type: MessageType = MessageType.EXECUTION_STARTED
    data: Dict[str, Any]  # Contains execution details

class StepStartedMessage(WebSocketMessage):
    type: MessageType = MessageType.STEP_STARTED
    data: Dict[str, Any]  # Contains step details

class StepProgressMessage(WebSocketMessage):
    type: MessageType = MessageType.STEP_PROGRESS
    data: Dict[str, Any]  # Contains progress update

class StepCompletedMessage(WebSocketMessage):
    type: MessageType = MessageType.STEP_COMPLETED
    data: Dict[str, Any]  # Contains completed step details

class StepFailedMessage(WebSocketMessage):
    type: MessageType = MessageType.STEP_FAILED
    data: Dict[str, Any]  # Contains error details

class TerminalOutputMessage(WebSocketMessage):
    type: MessageType = MessageType.TERMINAL_OUTPUT
    data: Dict[str, Any]  # Contains terminal output

class ExecutionCompletedMessage(WebSocketMessage):
    type: MessageType = MessageType.EXECUTION_COMPLETED
    data: Dict[str, Any]  # Contains completion details

class ExecutionFailedMessage(WebSocketMessage):
    type: MessageType = MessageType.EXECUTION_FAILED
    data: Dict[str, Any]  # Contains failure details

class HeartbeatMessage(WebSocketMessage):
    type: MessageType = MessageType.HEARTBEAT
    data: Optional[Dict[str, Any]] = None

class ErrorMessage(WebSocketMessage):
    type: MessageType = MessageType.ERROR
    data: Dict[str, Any]  # Contains error details

# Control Message Models (from client to server)
class ControlMessageType(str, Enum):
    START_EXECUTION = "start_execution"
    PAUSE_EXECUTION = "pause_execution"
    RESUME_EXECUTION = "resume_execution"
    CANCEL_EXECUTION = "cancel_execution"
    GET_STATUS = "get_status"
    PING = "ping"

class ControlMessage(BaseModel):
    type: ControlMessageType
    data: Optional[Dict[str, Any]] = None

class StartExecutionControl(ControlMessage):
    type: ControlMessageType = ControlMessageType.START_EXECUTION
    data: Dict[str, Any]  # Contains workflow data

class PauseExecutionControl(ControlMessage):
    type: ControlMessageType = ControlMessageType.PAUSE_EXECUTION

class ResumeExecutionControl(ControlMessage):
    type: ControlMessageType = ControlMessageType.RESUME_EXECUTION

class CancelExecutionControl(ControlMessage):
    type: ControlMessageType = ControlMessageType.CANCEL_EXECUTION

class GetStatusControl(ControlMessage):
    type: ControlMessageType = ControlMessageType.GET_STATUS

class PingControl(ControlMessage):
    type: ControlMessageType = ControlMessageType.PING