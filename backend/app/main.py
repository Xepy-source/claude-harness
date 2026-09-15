from fastapi import FastAPI

app = FastAPI(title="claude_harness API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
