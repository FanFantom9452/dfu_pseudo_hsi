import base64
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_file

api_bp = Blueprint("api", __name__, url_prefix="/api")


def get_manager():
    return current_app.config["ANNOTATION_MANAGER"]


@api_bp.route("/annotations", methods=["POST"])
def save_annotation():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    manager = get_manager()
    result = manager.save_annotation(data)
    return jsonify(result), 201


@api_bp.route("/annotations", methods=["GET"])
def list_annotations():
    manager = get_manager()
    annotations = manager.list_annotations()
    return jsonify(annotations)


@api_bp.route("/annotations/<case_id>", methods=["GET"])
def get_annotation(case_id):
    manager = get_manager()
    annotation = manager.get_annotation(case_id)
    if annotation is None:
        return jsonify({"error": "Not found"}), 404
    return jsonify(annotation)


@api_bp.route("/upload-image", methods=["POST"])
def upload_image():
    data = request.get_json()
    if not data or "image" not in data or "caseId" not in data:
        return jsonify({"error": "Missing image or caseId"}), 400

    manager = get_manager()
    image_data = data["image"]

    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    image_bytes = base64.b64decode(image_data)
    image_path = Path(manager.data_dir) / "images" / f"{data['caseId']}.jpg"
    image_path.write_bytes(image_bytes)

    return jsonify({"success": True, "path": str(image_path)})


@api_bp.route("/statistics", methods=["GET"])
def get_statistics():
    manager = get_manager()
    report = manager.generate_statistics_report()
    return jsonify(report)


@api_bp.route("/export/csv", methods=["GET"])
def export_csv():
    manager = get_manager()
    filepath = manager.export_for_research()
    return send_file(
        filepath,
        mimetype="text/csv",
        as_attachment=True,
        download_name=Path(filepath).name,
    )
