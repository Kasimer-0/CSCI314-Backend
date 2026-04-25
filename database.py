from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Using SQLite local database
SQLALCHEMY_DATABASE_URL = "sqlite:///./fundraising.db"

# connect_args={"check_same_thread": False} This is a requirement specific to SQLite.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Functions for initializing database tables
def init_db():
    Base.metadata.create_all(bind=engine)