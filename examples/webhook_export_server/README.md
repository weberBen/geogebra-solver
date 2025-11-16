# GeoGebra Export Server - Example Implementation

This is an **example server** that demonstrates how to implement server-side processing for GeoGebra exports. It receives SVG from the GeoGebra Optimizer UI and converts it to DXF using `vpype` (for optimization) and `ezdxf` (for DXF generation).

⚠️ **WARNING**: This is a **REFERENCE IMPLEMENTATION**. Customize it for production use (add authentication, rate limiting, proper error handling, etc.).

## Architecture

1. **SVG Optimization** (optional): `vpype` applies `linemerge` + `linesimplify` to reduce segments
2. **DXF Generation**: `ezdxf` converts SVG paths to DXF LWPOLYLINE entities

## Units & Scaling

**Important**: This server does **NOT** automatically convert units (no DPI assumptions).

- **Default behavior**: 1:1 coordinate mapping (SVG coordinate → DXF coordinate)
- **Scale parameter**: Apply custom scaling factor
  - `scale=1.0` → No change (default)
  - `scale=0.264` → Approximate px-to-mm if your SVG uses 96 DPI pixels
  - `scale=0.1` → Shrink 10x
- **Units parameter**: Only sets DXF metadata (`$INSUNITS`) for CAD software display
  - Does **NOT** affect actual coordinates
  - Tells AutoCAD/etc. how to interpret the numbers

**Example**: If your SVG has a line from `(0,0)` to `(100,0)`:
- With `scale=1.0`: DXF will have `(0,0)` to `(100,0)` ✓
- With `scale=0.1`: DXF will have `(0,0)` to `(10,0)` ✓
- Setting `units="mm"` doesn't change coordinates, just tells CAD "these are millimeters"

## Features

- **SVG → DXF conversion** using `vpype` (optimization) and `ezdxf` (DXF generation)
- **Path optimization**: Optional `linemerge`, `linesimplify` to reduce segments
- **Configurable options**: tolerance, units, optimization level
- **CORS enabled**: Accepts requests from frontend
- **Health check endpoint**: Verify vpype and ezdxf installation
- **Test client**: Example script to convert SVG to DXF

## Limitations & Warnings

### DXF Export Quality

⚠️ **IMPORTANT**: DXF export via vpype converts Bézier curves to polylines (line segments).

**Implications**:
- **Loss of precision** on complex curves
- **Many small segments** for smooth curves
- Can cause **machine wear** (laser cutter/CNC) due to micro-segments
- **Large DXF files** for complex drawings

**Adjust settings** based on your use case:
- High-precision cutting: Lower tolerance (`0.001mm`)
- Fast prototyping: Higher tolerance (`0.1mm`)
- Complex curves: Enable optimization to reduce segments

### GeoGebra Vector Export Limitations

GeoGebra itself has precision limitations in vector exports (SVG, PDF, EPS):

- **Bézier control points rounded to integers**
- **Only 5 significant digits** written (insufficient for full single-precision)
- **Does NOT affect PNG exports**

Source: GeoGebra community discussions and documentation.

**Recommendation**: For highest precision, export PNG at high DPI (300-600) instead of vector formats.

## Installation

### 1. Create Virtual Environment

```bash
cd examples/export-server
python3 -m venv venv
```

### 2. Activate Virtual Environment

**Linux/macOS**:
```bash
source venv/bin/activate
```

**Windows**:
```cmd
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `vpype` - Vector processing and optimization
- `ezdxf` - DXF file generation
- `svgelements` - SVG parsing
- `requests` - HTTP client (for test_client.py)

### 4. Verify Installation

```bash
vpype --version
python -c "import ezdxf; print(f'ezdxf {ezdxf.version}')"
```

Should output:
- `vpype 1.14.0` (or similar)
- `ezdxf 1.4.3` (or similar)

## Usage

### Start the Server

```bash
python server.py
```

Or with uvicorn directly:
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Server will be available at:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Test the Server (Quick Test)

Use the provided test client to convert the example SVG file:

```bash
python test_client.py
```

This will:
1. Check server health
2. Read `hexagone_test.svg`
3. Send it to the server for conversion
4. Save the result as `hexagone_test.dxf`

**Example output**:
```
Checking server health...
Server status: healthy
  vpype: ✓ vpype 1.14.0
  ezdxf: ✓ 1.4.3

Converting hexagone_test.svg to DXF...
  Server: http://localhost:8000
  Optimize: True
  Tolerance: 0.01mm
  Units: mm
✓ DXF file saved to: hexagone_test.dxf
  File size: 12458 bytes

✓ Conversion completed successfully!
```

You can customize the conversion by editing `test_client.py` or using it as a reference for your own client code.

### Configure Frontend

In your GeoGebra Optimizer UI, set the webhook URL:

```javascript
const exportManager = new ExportManager({
    geogebraManager,
    webhookUrl: 'http://localhost:8000/api/process'
});
```

### Export via Webhook

```javascript
// From UI
await exportManager.exportViaWebhook('svg', null, {
    outputFormat: 'dxf',
    tolerance: '0.01mm',
    optimize: true,
    scale: 1.0,  // 1:1 coordinate mapping
    units: 'mm'
});
```

## API Reference

### POST /api/process

Process export request (SVG → DXF conversion).

**Request Body**:
```json
{
  "format": "svg",
  "data": "<svg>...</svg>",
  "outputFormat": "dxf",
  "options": {
    "tolerance": "0.01mm",
    "optimize": true,
    "scale": 1.0,
    "units": "mm"
  }
}
```

**Options**:
- `tolerance` (string): Simplification tolerance
  - `"0.001mm"` - High precision (more segments)
  - `"0.01mm"` - Balanced (recommended)
  - `"0.1mm"` - Fast (fewer segments, lower precision)
- `optimize` (boolean): Apply `linemerge` and `linesimplify`
- `scale` (number): Scale factor applied to coordinates
  - `1.0` - No scaling (1:1 mapping, **default**)
  - `0.264` - Approximate conversion if SVG uses pixels (96 DPI → mm)
  - `0.1` - Reduce size by 10x
  - `10.0` - Increase size by 10x
- `units` (string): DXF units metadata (`"mm"`, `"cm"`, `"inch"`)
  - **Note**: This only sets metadata for CAD software display
  - Does NOT affect coordinate values (use `scale` for that)

**Response**:
- Binary DXF file download
- HTTP 200 on success
- HTTP 4xx/5xx on error

### GET /health

Check server health and dependencies availability.

**Response**:
```json
{
  "status": "healthy",
  "vpype": {
    "available": true,
    "version": "vpype 1.14.0",
    "purpose": "SVG optimization"
  },
  "ezdxf": {
    "available": true,
    "version": "1.4.3",
    "purpose": "DXF generation"
  }
}
```

## Customization

### Add New Conversions

To add more conversion types (e.g., PNG → PDF):

1. Add handler function in `server.py`:
```python
async def convert_png_to_pdf(png_data: str, options: dict) -> FileResponse:
    # Implementation here
    pass
```

2. Add route in `process_export()`:
```python
if request.format.lower() == 'png' and request.outputFormat.lower() == 'pdf':
    return await convert_png_to_pdf(request.data, request.options)
```

### Add Authentication

For production, add API key authentication:

```python
from fastapi import Header, HTTPException

async def verify_api_key(x_api_key: str = Header()):
    if x_api_key != "your-secret-key":
        raise HTTPException(status_code=401, detail="Invalid API key")

@app.post("/api/process", dependencies=[Depends(verify_api_key)])
async def process_export(request: ExportRequest):
    # ...
```

### Add Rate Limiting

Use `slowapi` for rate limiting:

```bash
pip install slowapi
```

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/process")
@limiter.limit("10/minute")
async def process_export(request: ExportRequest):
    # ...
```

## Troubleshooting

### vpype not found

```
FileNotFoundError: vpype not found
```

**Solution**: Ensure vpype is installed in the virtual environment:
```bash
pip install vpype
vpype --version
```

### ezdxf import error

```
ModuleNotFoundError: No module named 'ezdxf'
```

**Solution**: Ensure ezdxf is installed in the virtual environment:
```bash
pip install ezdxf svgelements
python -c "import ezdxf; print(ezdxf.version)"
```

### Processing timeout

```
504 Gateway Timeout: vpype processing timeout (>30s)
```

**Solution**: Simplify the drawing or increase tolerance:
- Reduce curve complexity in GeoGebra
- Increase `tolerance` to `0.1mm` or higher
- Modify timeout in `server.py` (line 158)

### Empty DXF file

```
vpype did not generate output file
```

**Solution**: Check vpype command manually:
```bash
vpype read input.svg linemerge --tolerance 0.01mm linesimplify write output.dxf
```

Check vpype error output for details.

## Development

### Run in Development Mode

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Auto-reloads on code changes.

### View API Documentation

Interactive API docs available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Test Endpoint

```bash
curl -X GET http://localhost:8000/health
```

## Production Deployment

For production deployment, consider:

1. **Use a production ASGI server**: Gunicorn + Uvicorn workers
2. **Add authentication**: API keys or OAuth2
3. **Add rate limiting**: Prevent abuse
4. **Add logging**: Track usage and errors
5. **Add monitoring**: Health checks, metrics
6. **Use HTTPS**: Secure communication
7. **Validate input**: Sanitize SVG content, limit file size
8. **Set CORS origins**: Restrict to your frontend domain

Example production command:
```bash
gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## License

This is example code for reference. Modify and use as needed.

## Resources

- [vpype Documentation](https://vpype.readthedocs.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [GeoGebra Apps API](https://wiki.geogebra.org/en/Reference:GeoGebra_Apps_API)
