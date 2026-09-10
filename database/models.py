from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    chat_history = relationship("ChatHistory", back_populates="user", cascade="all, delete")

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String(100), index=True, nullable=False)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default="India")
    
class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="chat_history")

class WeatherCache(Base):
    __tablename__ = "weather_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    city = Column(String(100), index=True, nullable=False)
    temperature = Column(Float, nullable=False)
    condition = Column(String(50), nullable=False)
    humidity = Column(Float, nullable=True)
    raw_data = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
