from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Numeric, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.models.base import Base

class PredictionLog(Base):
    """SQLAlchemy model for recording crop disease diagnosis inferences."""
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    image_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    predicted_class: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    confidence: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<PredictionLog(id={self.id}, "
            f"filename='{self.image_filename}', "
            f"class='{self.predicted_class}', "
            f"confidence={self.confidence}, "
            f"model='{self.model_version}')>"
        )
