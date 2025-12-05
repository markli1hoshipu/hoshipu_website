"""
SQLAlchemy models for database tables
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from database import Base


class Message(Base):
    """
    Message model for storing user messages/comments
    """
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_visible = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<Message(id={self.id}, created_at={self.created_at})>"


class PdfTemplate(Base):
    """
    PDF Template model for storing PDF renaming templates
    """
    __tablename__ = "gjp_pdf_template"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    template_string = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<PdfTemplate(id={self.id}, name={self.name})>"


class TravelOutputTemplate(Base):
    """
    Travel translation output template model
    存储航程翻译的输出模板配置（如2023式模板、民航信息式模板等）
    """
    __tablename__ = "qff_travel_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, comment="模板名称，如：2023式模板、民航信息式模板")
    description = Column(String(500), comment="模板描述")
    config_json = Column(Text, nullable=False, comment="模板配置JSON字符串，包含格式化规则")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否启用")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<TravelOutputTemplate(id={self.id}, name={self.name})>"


class TravelAirline(Base):
    """
    Airline code mapping model
    存储航司代码与中文名称的对照关系
    """
    __tablename__ = "qff_travel_airlines"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), nullable=False, unique=True, index=True, comment="航司代码，如：CA、MU、CZ")
    name = Column(String(255), nullable=False, comment="航司中文名称，如：中国国航、东方航空")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否启用")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<TravelAirline(code={self.code}, name={self.name})>"


class TravelAirport(Base):
    """
    Airport code mapping model
    存储机场代码与中文名称的对照关系
    """
    __tablename__ = "qff_travel_airports"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), nullable=False, unique=True, index=True, comment="机场代码，如：PEK、PVG、CAN")
    name = Column(String(255), nullable=False, comment="机场中文名称，如：首都国际机场、上海浦东国际机场")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否启用")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<TravelAirport(code={self.code}, name={self.name})>"
