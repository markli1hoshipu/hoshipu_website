"""
Router for the AE 欠条报表 updater — merge QFF daily-IOU files into the AE ledger.
"""
import base64
import logging
from typing import List

from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse

from ae_qff_processor import merge

router = APIRouter(prefix="/api/ae-qff", tags=["AE-QFF Merge"])
logger = logging.getLogger(__name__)


@router.post("/merge")
async def merge_endpoint(
    ae_file: UploadFile = File(...),
    qff_files: List[UploadFile] = File(...),
):
    """Merge the uploaded QFF files into the uploaded AE ledger.

    Returns the merge report plus the updated workbook (base64) so the client
    can show the summary and offer a download from a single request.
    """
    try:
        ae_bytes = await ae_file.read()
        qff_bytes = [await f.read() for f in qff_files]
        out_bytes, report = merge(ae_bytes, qff_bytes)
    except Exception as e:  # noqa: BLE001
        logger.exception("AE-QFF merge failed")
        return JSONResponse(status_code=400, content={"error": str(e)})

    name = ae_file.filename or "AE.xlsx"
    if name.lower().endswith(".xlsx"):
        name = name[:-5]
    download_name = f"{name}-updated.xlsx"

    return {
        "report": report,
        "filename": download_name,
        "file_base64": base64.b64encode(out_bytes).decode("ascii"),
    }
