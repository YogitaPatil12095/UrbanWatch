"""
UrbanWatch AI - FastAPI Backend
Satellite imagery fetching + AI-based change detection
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.routes import satellite, detection, stats, analyze

app = FastAPI(
    title="UrbanWatch AI API",
    description="Satellite-powered urban change detection",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated images
os.makedirs("static/images", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Routes
app.include_router(satellite.router, tags=["Satellite"])
app.include_router(detection.router, tags=["Detection"])
app.include_router(stats.router, tags=["Stats"])
app.include_router(analyze.router, tags=["Analysis"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
