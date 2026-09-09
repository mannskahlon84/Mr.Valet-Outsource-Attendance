from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()

from app.models.all_models import *  # Import all models for Alembic
