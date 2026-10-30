from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import auth, health
from app.config import Settings, get_settings
from app.core.errors import register_error_handlers
from app.core.origin import origin_check
from app.db import create_db_engine, create_session_factory, init_db


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = create_db_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        init_db(engine)
        yield
        engine.dispose()

    app = FastAPI(
        title="Expense Tracker API",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url=None,
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)
    register_error_handlers(app)
    app.middleware("http")(origin_check)
    app.include_router(health.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    return app


app = create_app()
