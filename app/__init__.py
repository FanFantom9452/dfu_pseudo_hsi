from flask import Flask

from .config import Config
from .routes.api import api_bp
from .routes.pages import pages_bp
from .services.annotation_manager import ClinicalAnnotationManager


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    manager = ClinicalAnnotationManager(app.config["DATA_DIR"])
    app.config["ANNOTATION_MANAGER"] = manager

    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp)

    return app
