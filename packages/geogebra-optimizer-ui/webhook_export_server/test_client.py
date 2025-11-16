#!/usr/bin/env python3
"""
Test client for GeoGebra Export Server

This script demonstrates how to call the export server API to convert
an SVG file to DXF format.

Usage:
    python test_client.py

Requirements:
    pip install requests
"""

import requests
from pathlib import Path


def convert_svg_to_dxf(
    svg_path: str,
    output_path: str,
    server_url: str = "http://localhost:8000",
    optimize: bool = True,
    tolerance: str = "0.01mm",
    scale: float = 1.0,
    units: str = "mm"
):
    """
    Convert SVG to DXF using the export server.

    Args:
        svg_path: Path to input SVG file
        output_path: Path where the DXF file will be saved
        server_url: URL of the export server
        optimize: Apply vpype optimization
        tolerance: Simplification tolerance for vpype
        scale: Scale factor (1.0 = 1:1, 0.264 ≈ px→mm)
        units: Units metadata for DXF (mm, cm, inch)
    """
    # Read SVG file
    svg_file = Path(svg_path)
    if not svg_file.exists():
        raise FileNotFoundError(f"SVG file not found: {svg_path}")

    svg_content = svg_file.read_text(encoding='utf-8')

    # Prepare request
    payload = {
        "format": "svg",
        "data": svg_content,
        "outputFormat": "dxf",
        "options": {
            "optimize": optimize,
            "tolerance": tolerance,
            "scale": scale,
            "units": units
        }
    }

    # Send request to server
    print(f"Converting {svg_path} to DXF...")
    print(f"  Server: {server_url}")
    print(f"  Optimize: {optimize}")
    print(f"  Tolerance: {tolerance}")
    print(f"  Scale: {scale}")
    print(f"  Units: {units}")

    try:
        response = requests.post(
            f"{server_url}/api/process",
            json=payload,
            timeout=60  # 60 seconds timeout
        )

        # Check if request was successful
        response.raise_for_status()

        # Save DXF file
        output_file = Path(output_path)
        output_file.write_bytes(response.content)

        print(f"✓ DXF file saved to: {output_path}")
        print(f"  File size: {len(response.content)} bytes")

        return True

    except requests.exceptions.ConnectionError:
        print(f"✗ Error: Could not connect to server at {server_url}")
        print("  Make sure the server is running: python server.py")
        return False

    except requests.exceptions.Timeout:
        print("✗ Error: Request timeout (>60s)")
        print("  Try simplifying the drawing or increasing tolerance")
        return False

    except requests.exceptions.HTTPError as e:
        print(f"✗ Server error: {e}")
        try:
            error_detail = response.json().get('detail', 'Unknown error')
            print(f"  Detail: {error_detail}")
        except:
            print(f"  Response: {response.text}")
        return False

    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False


def main():
    """Main function - convert hexagone_test.svg to DXF with and without optimization."""

    # Configuration
    svg_input = "hexagone_test.svg"
    server_url = "http://localhost:8000"

    # Check server health
    print("Checking server health...")
    try:
        health = requests.get(f"{server_url}/health", timeout=5)
        health_data = health.json()
        print(f"Server status: {health_data.get('status')}")

        vpype = health_data.get('vpype', {})
        print(f"  vpype: {'✓' if vpype.get('available') else '✗'} {vpype.get('version', 'N/A')}")

        ezdxf = health_data.get('ezdxf', {})
        print(f"  ezdxf: {'✓' if ezdxf.get('available') else '✗'} {ezdxf.get('version', 'N/A')}")

        print()

    except Exception as e:
        print(f"Warning: Could not check server health: {e}\n")

    # Test 1: Convert with optimization
    print("=" * 70)
    print("TEST 1: With optimization (linemerge + linesimplify)")
    print("=" * 70)

    success1 = convert_svg_to_dxf(
        svg_path=svg_input,
        output_path="hexagone_test_optimized.dxf",
        server_url=server_url,
        optimize=True,
        tolerance="0.001mm",
        scale=1.0,
        units="mm"
    )

    print()

    # Test 2: Convert without optimization
    print("=" * 70)
    print("TEST 2: Without optimization")
    print("=" * 70)

    success2 = convert_svg_to_dxf(
        svg_path=svg_input,
        output_path="hexagone_test_raw.dxf",
        server_url=server_url,
        optimize=False,
        tolerance="0.001mm",
        scale=1.0,
        units="mm"
    )

    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)

    if success1 and success2:
        print("✓ Both conversions completed successfully!")
        print("\nGenerated files:")
        print("  - hexagone_test_optimized.dxf (with optimization)")
        print("  - hexagone_test_raw.dxf (without optimization)")
        print("\nCompare file sizes to see optimization impact:")

        from pathlib import Path
        try:
            size_optimized = Path("hexagone_test_optimized.dxf").stat().st_size
            size_raw = Path("hexagone_test_raw.dxf").stat().st_size
            reduction = ((size_raw - size_optimized) / size_raw * 100) if size_raw > 0 else 0

            print(f"  Optimized: {size_optimized:,} bytes")
            print(f"  Raw:       {size_raw:,} bytes")
            print(f"  Reduction: {reduction:.1f}%")
        except:
            pass
    else:
        print("✗ One or more conversions failed")
        exit(1)


if __name__ == "__main__":
    main()
