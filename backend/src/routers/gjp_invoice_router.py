"""
Router for GJP 发票导出 — extract flight e-invoice PDFs and export the
YUHANG SAP-reconciliation Excel workbook.
"""
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List
import io
import logging

from gjp_invoice_processor import (
    extract_text_from_pdf,
    extract_invoice,
    validate,
    build_workbook,
)

router = APIRouter(prefix="/api/gjp-invoice", tags=["GJP Invoice Export"])
logger = logging.getLogger(__name__)


@router.post("/process")
async def process_invoices(files: List[UploadFile] = File(...)):
    """Extract base columns from each PDF and return them for preview."""
    results = []
    for file in files:
        try:
            info = extract_invoice(extract_text_from_pdf(await file.read()))
            v = validate(info)
            results.append({
                "filename": file.filename,
                "info": info,
                "status": "success" if v["valid"] else "incomplete",
                "missing_fields": v["missing"],
            })
        except Exception as e:  # noqa: BLE001
            logger.error(f"Error processing {file.filename}: {e}")
            results.append({
                "filename": file.filename,
                "info": {},
                "status": "error",
                "error": str(e),
            })
    return {"results": results}


@router.post("/export")
async def export_invoices(files: List[UploadFile] = File(...)):
    """Extract all PDFs and stream back the filled .xlsx workbook."""
    rows = []
    for file in files:
        try:
            rows.append(extract_invoice(extract_text_from_pdf(await file.read())))
        except Exception as e:  # noqa: BLE001
            logger.error(f"Error processing {file.filename}: {e}")

    xlsx_bytes = build_workbook(rows)
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=gjp_invoice_export.xlsx"},
    )
