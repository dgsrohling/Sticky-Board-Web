"""Ponto de entrada da aplicação Sticky Board."""
from app import create_app

app = create_app()

if __name__ == "__main__":
    # Em produção, use um WSGI server (gunicorn, waitress etc.).
    app.run(debug=True, host="127.0.0.1", port=5000)
