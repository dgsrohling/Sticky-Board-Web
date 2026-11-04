"""Ponto de entrada da aplicação Sticky Board."""
import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Em produção, use um WSGI server (gunicorn, waitress etc.).
    # O modo debug é opt-in via FLASK_DEBUG=1 (nunca ativo por padrão).
    debug = os.environ.get("FLASK_DEBUG", "0").lower() in {"1", "true", "yes"}
    app.run(debug=debug, host="127.0.0.1", port=5000)
