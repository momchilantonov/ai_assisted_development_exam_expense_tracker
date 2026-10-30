from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.config import Settings
from app.main import create_app


class Payload(BaseModel):
    name: str
    password: str


def _app_with_probe_routes(settings: Settings) -> FastAPI:
    app = create_app(settings)

    @app.post("/probe/validate")
    def validate(payload: Payload) -> dict[str, str]:
        return {"name": payload.name}

    @app.get("/probe/forbidden")
    def forbidden() -> None:
        raise HTTPException(status_code=403, detail="Origin not allowed.")

    @app.get("/probe/boom")
    def boom() -> None:
        raise RuntimeError("secret-internal-detail")

    return app


def test_unknown_route_returns_not_found_envelope(client: TestClient) -> None:
    response = client.get("/api/does-not-exist")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
    assert "message" in response.json()["error"]


def test_validation_error_returns_envelope_without_echoing_input(settings: Settings) -> None:
    with TestClient(_app_with_probe_routes(settings)) as client:
        response = client.post("/probe/validate", json={"name": "a", "password": 123})

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["details"][0]["loc"] == ["body", "password"]
    assert "input" not in error["details"][0]
    assert "123" not in response.text


def test_http_exception_is_mapped_to_envelope(settings: Settings) -> None:
    with TestClient(_app_with_probe_routes(settings)) as client:
        response = client.get("/probe/forbidden")

    assert response.status_code == 403
    assert response.json() == {
        "error": {"code": "forbidden_origin", "message": "Origin not allowed."}
    }


def test_unhandled_exception_returns_internal_error_without_leaking(settings: Settings) -> None:
    with TestClient(_app_with_probe_routes(settings), raise_server_exceptions=False) as client:
        response = client.get("/probe/boom")

    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "internal_error", "message": "Internal server error."}
    }
    assert "secret-internal-detail" not in response.text
    assert "Traceback" not in response.text
