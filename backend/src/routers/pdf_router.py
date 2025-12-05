from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import zipfile
import io
from pdf_processor import (
    extract_text_from_pdf,
    extract_info,
    render_filename_template,
    validate_required_fields,
    DEFAULT_TEMPLATES
)
from database import get_db
from models import PdfTemplate

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/process")
async def process_pdfs(
    files: List[UploadFile] = File(...),
    template: str = Form(DEFAULT_TEMPLATES["行程信息"])
):
    results = []
    
    for file in files:
        try:
            pdf_bytes = await file.read()
            text = extract_text_from_pdf(pdf_bytes)
            info = extract_info(text)
            
            validation = validate_required_fields(info, template)
            new_name = render_filename_template(template, info, file.filename or "unnamed.pdf")
            
            results.append({
                "original_name": file.filename,
                "new_name": new_name,
                "extracted_info": info,
                "status": "success" if validation["valid"] else "incomplete",
                "missing_fields": validation["missing"] if not validation["valid"] else []
            })
            
        except Exception as e:
            logger.error(f"Error processing {file.filename}: {e}")
            results.append({
                "original_name": file.filename,
                "new_name": file.filename,
                "extracted_info": {},
                "status": "error",
                "error": str(e)
            })
    
    return {"results": results}


@router.post("/process-and-download")
async def process_and_download(
    files: List[UploadFile] = File(...),
    template: str = Form(DEFAULT_TEMPLATES["行程信息"])
):
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for file in files:
            try:
                pdf_bytes = await file.read()
                text = extract_text_from_pdf(pdf_bytes)
                info = extract_info(text)
                
                validation = validate_required_fields(info, template)
                new_name = render_filename_template(template, info, file.filename or "unnamed.pdf")
                
                folder = "renamed" if validation["valid"] else "incomplete"
                zip_file.writestr(f"{folder}/{new_name}", pdf_bytes)
                
            except Exception as e:
                logger.error(f"Error processing {file.filename}: {e}")
                zip_file.writestr(f"errors/{file.filename}", pdf_bytes)
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=renamed_pdfs.zip"}
    )


@router.get("/templates")
async def get_templates(db: Session = Depends(get_db)):
    db_templates = db.query(PdfTemplate).all()
    templates_dict = {t.name: t.template_string for t in db_templates}
    if not templates_dict:
        templates_dict = DEFAULT_TEMPLATES
    return {"templates": templates_dict}
