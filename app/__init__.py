"""Fábrica da aplicação Flask do Sticky Board."""
import os

from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def create_app(test_config=None):
    """Cria e configura a aplicação (padrão application factory)."""
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "sqlite:///notes.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.json.sort_keys = False

    if test_config:
        app.config.update(test_config)

    db.init_app(app)

    from . import routes

    app.register_blueprint(routes.bp)

    with app.app_context():
        # Cria o banco SQLite automaticamente na primeira execução.
        db.create_all()

    @app.get("/")
    def index():
        return render_template("index.html")

    return app
