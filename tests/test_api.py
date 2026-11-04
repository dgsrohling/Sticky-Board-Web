"""Testes da API REST de notas."""


def test_index_page(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"Sticky Board" in response.data


def test_list_notes_empty(client):
    response = client.get("/api/notes")
    assert response.status_code == 200
    assert response.get_json() == []


def test_create_note_with_defaults(client):
    response = client.post("/api/notes", json={})
    assert response.status_code == 201
    note = response.get_json()
    assert note["title"] == "Nova nota"
    assert note["content"] == ""
    assert note["color"] == "yellow"
    assert note["width"] == 240
    assert note["height"] == 220


def test_timestamps_include_utc_offset(client):
    note = client.post("/api/notes", json={}).get_json()
    assert note["created_at"].endswith("+00:00")
    assert note["updated_at"].endswith("+00:00")


def test_create_note_with_custom_values(client):
    payload = {
        "title": "Compras",
        "content": "leite, café, pão",
        "color": "green",
        "position_x": 120,
        "position_y": 80,
        "width": 300,
        "height": 260,
        "z_index": 5,
    }
    response = client.post("/api/notes", json=payload)
    assert response.status_code == 201
    note = response.get_json()
    assert note["title"] == "Compras"
    assert note["content"] == "leite, café, pão"
    assert note["color"] == "green"
    assert note["position_x"] == 120
    assert note["z_index"] == 5


def test_create_note_clamps_and_sanitizes(client):
    response = client.post(
        "/api/notes",
        json={"title": "  título  ", "color": "invalid", "width": 10, "height": 99999},
    )
    assert response.status_code == 201
    note = response.get_json()
    assert note["title"] == "título"
    assert note["color"] == "yellow"
    assert note["width"] == 180
    assert note["height"] == 1000


def test_update_note(client):
    created = client.post("/api/notes", json={"title": "Antes"}).get_json()
    response = client.put(
        f"/api/notes/{created['id']}",
        json={"title": "Depois", "content": "novo texto", "color": "blue"},
    )
    assert response.status_code == 200
    note = response.get_json()
    assert note["title"] == "Depois"
    assert note["content"] == "novo texto"
    assert note["color"] == "blue"


def test_update_note_invalid_color(client):
    created = client.post("/api/notes", json={}).get_json()
    response = client.put(f"/api/notes/{created['id']}", json={"color": "neon"})
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_update_note_requires_json(client):
    created = client.post("/api/notes", json={}).get_json()
    response = client.put(f"/api/notes/{created['id']}", data="not json")
    assert response.status_code == 400


def test_update_missing_note(client):
    response = client.put("/api/notes/9999", json={"title": "x"})
    assert response.status_code == 404


def test_delete_note(client):
    created = client.post("/api/notes", json={}).get_json()
    response = client.delete(f"/api/notes/{created['id']}")
    assert response.status_code == 200
    assert response.get_json() == {"ok": True}
    assert client.get("/api/notes").get_json() == []


def test_delete_missing_note(client):
    response = client.delete("/api/notes/9999")
    assert response.status_code == 404
