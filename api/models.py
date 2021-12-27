from flask.ext.sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID

db = SQLAlchemy()

class Player(db.model):
    id = db.Column(db.Integer, primary_key=True)
    progress = db.Column(db.Unicode)