from fastapi import FastAPI
from app.core.config import settings
from app.api.routers import auth, health
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

class SlashlessRoutes:
    """Serve "/api/v1/requests" as "/api/v1/requests/" in place, instead of a 307 redirect.
    Behind an HTTPS proxy that redirect can point at http:// and be blocked by the browser."""

    def __init__(self, asgi_app):
        self.asgi_app = asgi_app
        self.slash_paths = None

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            if self.slash_paths is None:
                # Full paths from the OpenAPI spec (routers are nested, so app.routes doesn't list them)
                self.slash_paths = {p for p in app.openapi().get("paths", {}) if p.endswith("/") and p != "/"}
            path = scope["path"]
            if not path.endswith("/") and path + "/" in self.slash_paths:
                scope = dict(scope, path=path + "/", raw_path=(path + "/").encode())
        await self.asgi_app(scope, receive, send)


app.add_middleware(SlashlessRoutes)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])

@app.get("/")
def root():
    return {"message": "Welcome to Mr. Valet Parking Outsource Tracking API"}

from app.api.routers import suppliers, workers, sites, users
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(suppliers.router, prefix=f"{settings.API_V1_STR}/suppliers", tags=["suppliers"])
app.include_router(workers.router, prefix=f"{settings.API_V1_STR}/workers", tags=["workers"])
app.include_router(sites.router, prefix=f"{settings.API_V1_STR}/sites", tags=["sites"])

from app.api.routers import assignments, attendance
app.include_router(assignments.router, prefix=f"{settings.API_V1_STR}/assignments", tags=["assignments"])
app.include_router(attendance.router, prefix=f"{settings.API_V1_STR}/attendance", tags=["attendance"])
from app.api.routers import requests, allocations, reports
app.include_router(requests.router, prefix=f"{settings.API_V1_STR}/requests", tags=["requests"])
app.include_router(allocations.router, prefix=f"{settings.API_V1_STR}/allocations", tags=["allocations"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])

from app.api.routers import dashboard
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])

from app.api.routers import accounting, notifications
app.include_router(accounting.router, prefix=f"{settings.API_V1_STR}/accounting", tags=["accounting"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])

from app.db.base import Base
from app.db.session import engine
from app.models import all_models  # noqa

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    pass

