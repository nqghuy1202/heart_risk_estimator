"""Vercel entry point.

Vercel serves each file under `api/` as a function and, for Python, looks for a
module-level `app` speaking WSGI. `vercel.json` rewrites every path here, so this
one function serves the page shell and both endpoints.
"""

import sys
from pathlib import Path

# Vercel runs from the repository root; the Django project is one level down.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from config.wsgi import application as app  # noqa: E402
