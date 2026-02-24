"""
Training LMS models: modules, questions, assignments, completion records.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


def gen_uuid():
    import uuid
    return str(uuid.uuid4())


class TrainingModule(Base):
    __tablename__ = "training_modules"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    questions: Mapped[list["TrainingQuestion"]] = relationship(
        "TrainingQuestion", back_populates="module", cascade="all, delete-orphan", order_by="TrainingQuestion.sort_order"
    )
    assignments: Mapped[list["TrainingAssignment"]] = relationship(
        "TrainingAssignment", back_populates="module", cascade="all, delete-orphan"
    )


class TrainingQuestion(Base):
    __tablename__ = "training_questions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    training_module_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("training_modules.id", ondelete="CASCADE"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSONB, nullable=False)
    correct_index: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    module: Mapped["TrainingModule"] = relationship("TrainingModule", back_populates="questions")
    completions: Mapped[list["TrainingCompletion"]] = relationship(
        "TrainingCompletion", back_populates="question", cascade="all, delete-orphan"
    )


class TrainingAssignment(Base):
    __tablename__ = "training_assignments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    training_module_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("training_modules.id", ondelete="CASCADE"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    score_percent: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    certificate_storage_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    module: Mapped["TrainingModule"] = relationship("TrainingModule", back_populates="assignments")
    completions: Mapped[list["TrainingCompletion"]] = relationship(
        "TrainingCompletion", back_populates="assignment", cascade="all, delete-orphan"
    )


class TrainingCompletion(Base):
    """One row per question answered when completing an assignment."""
    __tablename__ = "training_completions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    assignment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("training_assignments.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("training_questions.id", ondelete="CASCADE"), nullable=False)
    selected_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assignment: Mapped["TrainingAssignment"] = relationship("TrainingAssignment", back_populates="completions")
    question: Mapped["TrainingQuestion"] = relationship("TrainingQuestion", back_populates="completions")
