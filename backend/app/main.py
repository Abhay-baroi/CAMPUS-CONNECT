from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from app.routes import router

app = FastAPI(
    title="CampusConnect API",
    description="CampusConnect event discovery and registration API",
    version="1.0.0"
)

# Enable CORS for local development clients.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local workshop development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(router)

@app.get("/health", summary="Health Check")
def health_check():
    return {
        "status": "online",
        "service": "CampusConnect Backend",
        "docs_url": "/docs"
    }

frontend_directory = Path(__file__).resolve().parents[2] / "frontend"

# Mount frontend static app under /app if directory exists (for local standalone server)
if frontend_directory.is_dir():
    app.mount(
        "/app",
        StaticFiles(directory=frontend_directory, html=True),
        name="frontend",
    )

    @app.get("/", include_in_schema=False)
    def root_redirect():
        return RedirectResponse(url="/app/")
else:
    @app.get("/", include_in_schema=False)
    def root_info():
        return {
            "status": "online",
            "service": "CampusConnect Serverless API",
            "docs": "/docs"
        }

