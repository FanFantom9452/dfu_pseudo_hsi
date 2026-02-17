import os


class Config:
    DATA_DIR = os.environ.get("DATA_DIR", "./data")
