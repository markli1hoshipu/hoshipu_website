"""
Router for PDF template management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import PdfTemplate
from schemas import PdfTemplateCreate, PdfTemplateUpdate, PdfTemplateResponse, PdfTemplateDelete

router = APIRouter(prefix="/api/pdf-templates", tags=["pdf-templates"])


@router.get("", response_model=List[PdfTemplateResponse])
def get_all_templates(db: Session = Depends(get_db)):
    """Get all PDF templates"""
    templates = db.query(PdfTemplate).order_by(PdfTemplate.name).all()
    return templates


@router.get("/{template_id}", response_model=PdfTemplateResponse)
def get_template(template_id: int, db: Session = Depends(get_db)):
    """Get a specific PDF template by ID"""
    template = db.query(PdfTemplate).filter(PdfTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with id {template_id} not found"
        )
    return template


@router.post("", response_model=PdfTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(template_data: PdfTemplateCreate, db: Session = Depends(get_db)):
    """Create a new PDF template"""
    if template_data.password != "gjp123":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    existing = db.query(PdfTemplate).filter(PdfTemplate.name == template_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template with name '{template_data.name}' already exists"
        )
    
    new_template = PdfTemplate(
        name=template_data.name,
        template_string=template_data.template_string
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template


@router.put("/{template_id}", response_model=PdfTemplateResponse)
def update_template(
    template_id: int,
    template_data: PdfTemplateUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing PDF template"""
    if template_data.password != "gjp123":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    template = db.query(PdfTemplate).filter(PdfTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with id {template_id} not found"
        )
    
    if template_data.name is not None:
        existing = db.query(PdfTemplate).filter(
            PdfTemplate.name == template_data.name,
            PdfTemplate.id != template_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template with name '{template_data.name}' already exists"
            )
        template.name = template_data.name
    
    if template_data.template_string is not None:
        template.template_string = template_data.template_string
    
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: int, delete_data: PdfTemplateDelete, db: Session = Depends(get_db)):
    """Delete a PDF template"""
    if delete_data.password != "gjp123":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    template = db.query(PdfTemplate).filter(PdfTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with id {template_id} not found"
        )
    
    db.delete(template)
    db.commit()
    return None
