from pathlib import Path
from dotenv import load_dotenv

# Load the single root .env (D:\CNS\.env). Works regardless of cwd.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import ALLOWED_ORIGINS
from routes import health, embed, recognize

app = FastAPI(title="C1 Face Attendance API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(embed.router)
app.include_router(recognize.router)
