"""Rotas da API REST das notas."""
from flask import Blueprint, jsonify, request

from . import db
from .models import Note

bp = Blueprint("api", __name__, url_prefix="/api")

# Paleta de cores válidas (tons pastéis).
VALID_COLORS = {"yellow", "blue", "green", "pink", "orange", "purple", "gray"}

MAX_TITLE_LEN = 150
MAX_CONTENT_LEN = 10000

MIN_WIDTH = 180
MIN_HEIGHT = 150
MAX_WIDTH = 1000
MAX_HEIGHT = 1000


def _clamp(value, minimum, maximum):
    """Limita um número inteiro a um intervalo válido."""
    return max(minimum, min(maximum, value))


def _to_int(value, default):
    """Converte para int de forma tolerante; retorna default se inválido."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _clean_text(value, max_len):
    """Garante que o texto seja string limitada e sem espaços extras nas pontas."""
    if not isinstance(value, str):
        return ""
    return value.strip()[:max_len]


def _validate_color(value):
    """Retorna a cor se válida; caso contrário None."""
    if isinstance(value, str) and value in VALID_COLORS:
        return value
    return None


def _apply_update(note, data):
    """Aplica campos válidos do JSON na nota. Retorna lista de erros."""
    errors = []
    if "title" in data:
        if not isinstance(data["title"], str):
            errors.append("Título deve ser texto.")
        else:
            note.title = data["title"].strip()[:MAX_TITLE_LEN]
    if "content" in data:
        if not isinstance(data["content"], str):
            errors.append("Conteúdo deve ser texto.")
        else:
            note.content = data["content"][:MAX_CONTENT_LEN]
    if "color" in data:
        color = _validate_color(data["color"])
        if color is None:
            errors.append("Cor inválida.")
        else:
            note.color = color
    if "position_x" in data:
        note.position_x = _clamp(_to_int(data["position_x"], note.position_x), 0, 20000)
    if "position_y" in data:
        note.position_y = _clamp(_to_int(data["position_y"], note.position_y), 0, 20000)
    if "width" in data:
        note.width = _clamp(_to_int(data["width"], note.width), MIN_WIDTH, MAX_WIDTH)
    if "height" in data:
        note.height = _clamp(_to_int(data["height"], note.height), MIN_HEIGHT, MAX_HEIGHT)
    if "z_index" in data:
        note.z_index = _clamp(_to_int(data["z_index"], note.z_index), 0, 100000)
    return errors


@bp.get("/notes")
def list_notes():
    """Retorna todas as notas em JSON."""
    notes = Note.query.order_by(Note.z_index).all()
    return jsonify([n.to_dict() for n in notes])


@bp.post("/notes")
def create_note():
    """Cria uma nova nota com valores padrão (ou os enviados no JSON)."""
    data = request.get_json(silent=True) or {}
    note = Note(
        title=_clean_text(data.get("title", "Nova nota"), MAX_TITLE_LEN) or "Nova nota",
        content=data.get("content", "")[:MAX_CONTENT_LEN] if isinstance(data.get("content", ""), str) else "",
        color=_validate_color(data.get("color")) or "yellow",
        position_x=_clamp(_to_int(data.get("position_x"), 40), 0, 20000),
        position_y=_clamp(_to_int(data.get("position_y"), 40), 0, 20000),
        width=_clamp(_to_int(data.get("width"), 240), MIN_WIDTH, MAX_WIDTH),
        height=_clamp(_to_int(data.get("height"), 220), MIN_HEIGHT, MAX_HEIGHT),
        z_index=_clamp(_to_int(data.get("z_index"), 1), 0, 100000),
    )
    db.session.add(note)
    db.session.commit()
    return jsonify(note.to_dict()), 201


@bp.put("/notes/<int:note_id>")
def update_note(note_id):
    """Atualiza campos de uma nota existente."""
    note = db.session.get(Note, note_id)
    if note is None:
        return jsonify({"error": "Nota não encontrada."}), 404

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Corpo da requisição deve ser JSON."}), 400

    errors = _apply_update(note, data)
    if errors:
        db.session.rollback()
        return jsonify({"error": "; ".join(errors)}), 400

    db.session.commit()
    return jsonify(note.to_dict())


@bp.delete("/notes/<int:note_id>")
def delete_note(note_id):
    """Remove uma nota do banco."""
    note = db.session.get(Note, note_id)
    if note is None:
        return jsonify({"error": "Nota não encontrada."}), 404
    db.session.delete(note)
    db.session.commit()
    return jsonify({"ok": True})
