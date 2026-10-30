from collections.abc import Iterator
from pathlib import Path

from fastapi import Request
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import BACKEND_DIR


class Base(DeclarativeBase):
    pass


def _resolve_sqlite_url(database_url: str) -> str:
    url = make_url(database_url)
    if url.get_backend_name() == "sqlite" and url.database and url.database != ":memory:":
        path = Path(url.database)
        if not path.is_absolute():
            path = BACKEND_DIR / path
        url = url.set(database=str(path))
    return url.render_as_string(hide_password=False)


def create_db_engine(database_url: str) -> Engine:
    resolved = _resolve_sqlite_url(database_url)
    engine = create_engine(resolved, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _record) -> None:  # noqa: ANN001
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db(engine: Engine) -> None:
    database = engine.url.database
    if engine.url.get_backend_name() == "sqlite" and database and database != ":memory:":
        Path(database).parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)


def get_db(request: Request) -> Iterator[Session]:
    with request.app.state.session_factory() as session:
        yield session
