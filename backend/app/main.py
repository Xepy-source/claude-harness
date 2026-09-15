from fastapi import FastAPI

from app.auth import auth_router
from app.user import user_router

app = FastAPI(title="claude_harness API")
app.include_router(auth_router.router)
app.include_router(user_router.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
