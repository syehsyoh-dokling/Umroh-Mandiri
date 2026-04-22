import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:UmrohIktikaf#2026@localhost:3306/umroh_dev",
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Reusable Indonesian administrative regions database.
WILAYAH_DATABASE_URL = os.getenv(
    "WILAYAH_DATABASE_URL",
    "mysql+pymysql://root:UmrohIktikaf#2026@localhost:3306/master_wilayah_shared",
)

engine_wilayah = create_engine(WILAYAH_DATABASE_URL)
SessionWilayah = sessionmaker(autocommit=False, autoflush=False, bind=engine_wilayah)
