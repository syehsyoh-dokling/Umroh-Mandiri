from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import engine
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    password = Column(String(255))
    role = Column(String(20), default="enduser")  # superadmin, admin, enduser
    created_at = Column(DateTime, default=datetime.utcnow)

# create table
Base.metadata.create_all(bind=engine)
