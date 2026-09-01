import asyncio
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# Import route calculation logic from sibling file
from route_optimizer import get_optimized_route_data

app = FastAPI(title="Fleet Route Optimizer API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves index.html when you open http://127.0.0.1:8000
@app.get("/")
async def serve_frontend():
    return FileResponse("index.html")

# API endpoint called by index.html JavaScript
@app.get("/api/v1/route")
async def fetch_route_data():
    try:
        # Offload synchronous/blocking OSRM calls to an asynchronous worker thread
        route_data = await asyncio.to_thread(get_optimized_route_data)
        
        # Check if the optimizer returned an internal error dictionary
        if isinstance(route_data, dict) and "error" in route_data:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Route calculation failed: {route_data['error']}"
            )

        return route_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while computing routes: {str(e)}"
        )