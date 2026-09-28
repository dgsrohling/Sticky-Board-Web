"""Modelo de dados das notas."""
from datetime import datetime, timezone

from . import db


def _utcnow():
    return datetime.now(timezone.utc)


class Note(db.Model):
    """Uma nota adesiva no quadro."""

    __tablename__ = "notes"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), default="", nullable=False)
    content = db.Column(db.Text, default="", nullable=False)
    color = db.Column(db.String(20), default="yellow", nullable=False)
    position_x = db.Column(db.Integer, default=40, nullable=False)
    position_y = db.Column(db.Integer, default=40, nullable=False)
    width = db.Column(db.Integer, default=240, nullable=False)
    height = db.Column(db.Integer, default=220, nullable=False)
    z_index = db.Column(db.Integer, default=1, nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    def to_dict(self):
        """Serializa a nota para JSON (datas em ISO 8601)."""
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "color": self.color,
            "position_x": self.position_x,
            "position_y": self.position_y,
            "width": self.width,
            "height": self.height,
            "z_index": self.z_index,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
