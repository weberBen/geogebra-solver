"""
FastAPI Export Server - Example Implementation

This is an example server that receives SVG from the GeoGebra optimizer UI
and converts it to DXF using vpype (for optimization) and ezdxf (for DXF generation).

Architecture:
    1. SVG optimization (optional): vpype linemerge + linesimplify
    2. DXF generation: ezdxf converts SVG paths to DXF entities

⚠️ WARNING: This is a REFERENCE IMPLEMENTATION for users who want server-side
processing. It should be customized for production use.

Usage:
    python server.py

    Or with uvicorn directly:
    uvicorn server:app --reload --host 0.0.0.0 --port 8000
"""

import tempfile
import subprocess
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

import ezdxf
import vpype as vp
import numpy as np


# ============================================================================
# Configuration
# ============================================================================

app = FastAPI(
    title="GeoGebra Export Server",
    description="Example server for SVG→DXF conversion using vpype (optimization) and ezdxf (DXF generation)",
    version="2.0.0"
)

# CORS configuration (allow requests from frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Request/Response Models
# ============================================================================

class ExportRequest(BaseModel):
    """Request body for export processing."""
    format: str  # Source format: 'svg', 'png', 'json'
    data: str  # Source data content
    outputFormat: str  # Desired output format: 'dxf', etc.
    options: dict = {}  # Processing options


# ============================================================================
# Routes
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "message": "GeoGebra Export Server is running",
        "endpoints": {
            "process": "/api/process (POST)",
            "health": "/health (GET)"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    # Check if vpype is available (used for optimization)
    try:
        result = subprocess.run(
            ["vpype", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        vpype_version = result.stdout.strip()
        vpype_available = result.returncode == 0
    except Exception as e:
        vpype_version = str(e)
        vpype_available = False

    # Check if ezdxf is available (used for DXF generation)
    try:
        import ezdxf
        ezdxf_version = ezdxf.version
        ezdxf_available = True
    except Exception as e:
        ezdxf_version = str(e)
        ezdxf_available = False

    return {
        "status": "healthy" if (vpype_available and ezdxf_available) else "degraded",
        "vpype": {
            "available": vpype_available,
            "version": vpype_version if vpype_available else "not found",
            "purpose": "SVG optimization"
        },
        "ezdxf": {
            "available": ezdxf_available,
            "version": ezdxf_version if ezdxf_available else "not found",
            "purpose": "DXF generation"
        }
    }


@app.post("/api/process")
async def process_export(request: ExportRequest):
    """
    Process export request.

    Receives source data (SVG, PNG, JSON) and converts to desired output format.
    Currently supports SVG → DXF conversion using vpype (optimization) + ezdxf (DXF generation).

    Example request body:
    {
        "format": "svg",
        "data": "<svg>...</svg>",
        "outputFormat": "dxf",
        "options": {
            "tolerance": "0.01mm",
            "optimize": true,  // Use vpype for SVG optimization
            "scale": 1.0,      // Scale factor: 1.0=1:1, 0.264≈px→mm
            "units": "mm"      // Units metadata (display only)
        }
    }
    """

    # Validate source format
    if request.format.lower() not in ['svg', 'png', 'json']:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported source format: {request.format}. Supported: svg, png, json"
        )

    # Validate output format
    if request.outputFormat.lower() not in ['dxf']:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported output format: {request.outputFormat}. Supported: dxf"
        )

    # Route to appropriate converter
    if request.format.lower() == 'svg' and request.outputFormat.lower() == 'dxf':
        return await convert_svg_to_dxf(request.data, request.options)
    else:
        raise HTTPException(
            status_code=501,
            detail=f"Conversion {request.format}→{request.outputFormat} not yet implemented"
        )


# ============================================================================
# Conversion Functions
# ============================================================================


async def convert_svg_to_dxf(svg_content: str, options: dict) -> Response:
    """
    Convert SVG to DXF using vpype (Python API) and ezdxf.

    Uses vpype Python API for reading SVG and optional optimization,
    then converts to DXF using ezdxf.

    Options:
        tolerance (str): Simplification tolerance for vpype (e.g., "0.01mm")
        optimize (bool): Apply vpype linemerge and linesimplify
        scale (float): Scale factor for coordinates (1.0 = 1:1, 0.264 ≈ px to mm)
        units (str): Units metadata for DXF (mm, cm, inch) - display only
    """

    # Extract options
    tolerance_str = options.get('tolerance', '0.01mm')
    optimize = options.get('optimize', True)
    scale = options.get('scale', 1.0)
    units = options.get('units', 'mm')

    try:
        # Write SVG to temporary file (vpype needs a file path)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.svg', delete=False, encoding='utf-8') as tmp_svg:
            tmp_svg.write(svg_content)
            tmp_svg_path = tmp_svg.name

        try:
            # Apply optimization using vpype CLI if requested
            if optimize:
                # Create optimized SVG file path
                optimized_svg_path = tmp_svg_path.replace('.svg', '_optimized.svg')

                # Build vpype CLI command for optimization
                cmd = [
                    'vpype',
                    'read', tmp_svg_path,
                    'linemerge', '--tolerance', tolerance_str,
                    'linesimplify',
                    'write', optimized_svg_path
                ]

                # Execute vpype CLI
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30
                )

                if result.returncode != 0:
                    raise HTTPException(
                        status_code=500,
                        detail=f"vpype optimization failed: {result.stderr}"
                    )

                # Use optimized SVG
                svg_to_read = optimized_svg_path
            else:
                # Use original SVG
                svg_to_read = tmp_svg_path

            # Read SVG using vpype Python API
            doc = vp.read_multilayer_svg(svg_to_read, quantization=0.1)

            # Create DXF document
            dxf_doc = ezdxf.new('R2010')
            msp = dxf_doc.modelspace()

            # Set DXF units metadata (for CAD software display)
            units_codes = {
                'mm': 4,    # Millimeters
                'cm': 5,    # Centimeters
                'inch': 1,  # Inches
                'm': 6      # Meters
            }
            if units.lower() in units_codes:
                dxf_doc.header['$INSUNITS'] = units_codes[units.lower()]

            # Convert vpype document to DXF
            path_count = 0
            for layer_id in doc.layers:
                layer = doc.layers[layer_id]

                for line in layer:
                    # Convert vpype line (complex numbers) to DXF points
                    coords = np.array(line)
                    points = []

                    for coord in coords:
                        x = coord.real * scale
                        y = -coord.imag * scale  # Flip Y axis (SVG vs DXF)
                        points.append((x, y))

                    # Add polyline to DXF
                    if len(points) >= 2:
                        msp.add_lwpolyline(points)
                        path_count += 1

            print(f"Converted {path_count} paths to DXF (optimize={optimize}, scale={scale}, units={units})")

            # Save DXF to BytesIO (in-memory)
            from io import BytesIO
            dxf_buffer = BytesIO()

            # Save to temporary file then read (ezdxf doesn't support BytesIO directly for all versions)
            with tempfile.NamedTemporaryFile(mode='wb', suffix='.dxf', delete=False) as tmp_dxf:
                tmp_dxf_path = tmp_dxf.name

            dxf_doc.saveas(tmp_dxf_path)

            with open(tmp_dxf_path, 'rb') as f:
                dxf_content = f.read()

            # Cleanup temp DXF
            Path(tmp_dxf_path).unlink()

            # Return DXF file
            return Response(
                content=dxf_content,
                media_type='application/dxf',
                headers={
                    'Content-Disposition': 'attachment; filename="geogebra-export.dxf"'
                }
            )

        finally:
            # Cleanup temp SVG files
            Path(tmp_svg_path).unlink()

            # Cleanup optimized SVG if it exists
            if optimize:
                optimized_svg_path = tmp_svg_path.replace('.svg', '_optimized.svg')
                if Path(optimized_svg_path).exists():
                    Path(optimized_svg_path).unlink()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"SVG to DXF conversion failed: {str(e)}"
        )


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    print("""
    ╔═══════════════════════════════════════════════════════════════╗
    ║       GeoGebra Export Server - Example Implementation        ║
    ╠═══════════════════════════════════════════════════════════════╣
    ║                                                               ║
    ║  ⚠️  WARNING: This is a REFERENCE IMPLEMENTATION             ║
    ║     Customize for production use (security, error handling)  ║
    ║                                                               ║
    ║  Server running at: http://localhost:8000                    ║
    ║  API docs:          http://localhost:8000/docs               ║
    ║  Health check:      http://localhost:8000/health             ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
    """)

    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
