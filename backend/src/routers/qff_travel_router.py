"""
Router for QFF Travel management - templates, airlines, airports
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import TravelOutputTemplate, TravelAirline, TravelAirport
from schemas import (
    TravelTemplateCreate, TravelTemplateUpdate, TravelTemplateDelete, TravelTemplateResponse,
    TravelAirlineCreate, TravelAirlineUpdate, TravelAirlineDelete, TravelAirlineResponse,
    TravelAirportCreate, TravelAirportUpdate, TravelAirportDelete, TravelAirportResponse
)

router = APIRouter(prefix="/api/qff-travel", tags=["qff-travel"])

PASSWORD = "qff123"


@router.get("/templates", response_model=List[TravelTemplateResponse])
def get_all_templates(db: Session = Depends(get_db)):
    """Get all travel templates"""
    templates = db.query(TravelOutputTemplate).order_by(TravelOutputTemplate.name).all()
    return templates


@router.get("/templates/{template_id}", response_model=TravelTemplateResponse)
def get_template(template_id: int, db: Session = Depends(get_db)):
    """Get a specific travel template by ID"""
    template = db.query(TravelOutputTemplate).filter(TravelOutputTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with id {template_id} not found"
        )
    return template


@router.post("/templates", response_model=TravelTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(template_data: TravelTemplateCreate, db: Session = Depends(get_db)):
    """Create a new travel template"""
    if template_data.password != PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    existing = db.query(TravelOutputTemplate).filter(TravelOutputTemplate.name == template_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template with name '{template_data.name}' already exists"
        )
    
    new_template = TravelOutputTemplate(
        name=template_data.name,
        description=template_data.description,
        config_json=template_data.config_json
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template


@router.put("/templates/{template_id}", response_model=TravelTemplateResponse)
def update_template(
    template_id: int,
    template_data: TravelTemplateUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing travel template"""
    if template_data.password != PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    template = db.query(TravelOutputTemplate).filter(TravelOutputTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with id {template_id} not found"
        )
    
    if template_data.name is not None:
        existing = db.query(TravelOutputTemplate).filter(
            TravelOutputTemplate.name == template_data.name,
            TravelOutputTemplate.id != template_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template with name '{template_data.name}' already exists"
            )
        template.name = template_data.name
    
    if template_data.description is not None:
        template.description = template_data.description
    
    if template_data.config_json is not None:
        template.config_json = template_data.config_json
    
    if template_data.is_active is not None:
        template.is_active = template_data.is_active
    
    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: int, delete_data: TravelTemplateDelete, db: Session = Depends(get_db)):
    """Delete a travel template"""
    if delete_data.password != PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    template = db.query(TravelOutputTemplate).filter(TravelOutputTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with id {template_id} not found"
        )
    
    db.delete(template)
    db.commit()
    return None


@router.get("/airlines", response_model=List[TravelAirlineResponse])
def get_all_airlines(db: Session = Depends(get_db)):
    """Get all airlines"""
    airlines = db.query(TravelAirline).order_by(TravelAirline.code).all()
    return airlines


@router.get("/airlines/{airline_id}", response_model=TravelAirlineResponse)
def get_airline(airline_id: int, db: Session = Depends(get_db)):
    """Get a specific airline by ID"""
    airline = db.query(TravelAirline).filter(TravelAirline.id == airline_id).first()
    if not airline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airline with id {airline_id} not found"
        )
    return airline


@router.post("/airlines", response_model=TravelAirlineResponse, status_code=status.HTTP_201_CREATED)
def create_airline(airline_data: TravelAirlineCreate, db: Session = Depends(get_db)):
    """Create a new airline"""
    if airline_data.password != PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    existing = db.query(TravelAirline).filter(TravelAirline.code == airline_data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Airline with code '{airline_data.code}' already exists"
        )
    
    new_airline = TravelAirline(
        code=airline_data.code,
        name=airline_data.name
    )
    db.add(new_airline)
    db.commit()
    db.refresh(new_airline)
    return new_airline


@router.put("/airlines/{airline_id}", response_model=TravelAirlineResponse)
def update_airline(
    airline_id: int,
    airline_data: TravelAirlineUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing airline"""
    if airline_data.password != PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    airline = db.query(TravelAirline).filter(TravelAirline.id == airline_id).first()
    if not airline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airline with id {airline_id} not found"
        )
    
    if airline_data.code is not None:
        existing = db.query(TravelAirline).filter(
            TravelAirline.code == airline_data.code,
            TravelAirline.id != airline_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Airline with code '{airline_data.code}' already exists"
            )
        airline.code = airline_data.code
    
    if airline_data.name is not None:
        airline.name = airline_data.name
    
    if airline_data.is_active is not None:
        airline.is_active = airline_data.is_active
    
    db.commit()
    db.refresh(airline)
    return airline


@router.delete("/airlines/{airline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_airline(airline_id: int, delete_data: TravelAirlineDelete, db: Session = Depends(get_db)):
    """Delete an airline"""
    if delete_data.password != PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    airline = db.query(TravelAirline).filter(TravelAirline.id == airline_id).first()
    if not airline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airline with id {airline_id} not found"
        )
    
    db.delete(airline)
    db.commit()
    return None


@router.get("/airports", response_model=List[TravelAirportResponse])
def get_all_airports(db: Session = Depends(get_db)):
    """Get all airports"""
    airports = db.query(TravelAirport).order_by(TravelAirport.code).all()
    return airports


@router.get("/airports/{airport_id}", response_model=TravelAirportResponse)
def get_airport(airport_id: int, db: Session = Depends(get_db)):
    """Get a specific airport by ID"""
    airport = db.query(TravelAirport).filter(TravelAirport.id == airport_id).first()
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airport with id {airport_id} not found"
        )
    return airport


@router.post("/airports", response_model=TravelAirportResponse, status_code=status.HTTP_201_CREATED)
def create_airport(airport_data: TravelAirportCreate, db: Session = Depends(get_db)):
    """Create a new airport"""
    if airport_data.password != PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    existing = db.query(TravelAirport).filter(TravelAirport.code == airport_data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Airport with code '{airport_data.code}' already exists"
        )
    
    new_airport = TravelAirport(
        code=airport_data.code,
        name=airport_data.name
    )
    db.add(new_airport)
    db.commit()
    db.refresh(new_airport)
    return new_airport


@router.put("/airports/{airport_id}", response_model=TravelAirportResponse)
def update_airport(
    airport_id: int,
    airport_data: TravelAirportUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing airport"""
    if airport_data.password != PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    airport = db.query(TravelAirport).filter(TravelAirport.id == airport_id).first()
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airport with id {airport_id} not found"
        )
    
    if airport_data.code is not None:
        existing = db.query(TravelAirport).filter(
            TravelAirport.code == airport_data.code,
            TravelAirport.id != airport_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Airport with code '{airport_data.code}' already exists"
            )
        airport.code = airport_data.code
    
    if airport_data.name is not None:
        airport.name = airport_data.name
    
    if airport_data.is_active is not None:
        airport.is_active = airport_data.is_active
    
    db.commit()
    db.refresh(airport)
    return airport


@router.delete("/airports/{airport_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_airport(airport_id: int, delete_data: TravelAirportDelete, db: Session = Depends(get_db)):
    """Delete an airport"""
    if delete_data.password != PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid password"
        )
    
    airport = db.query(TravelAirport).filter(TravelAirport.id == airport_id).first()
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airport with id {airport_id} not found"
        )
    
    db.delete(airport)
    db.commit()
    return None
