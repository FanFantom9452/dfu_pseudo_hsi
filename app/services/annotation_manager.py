"""
DFU Clinical Annotation Data Management System
"""

import json
import shutil
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import warnings

warnings.filterwarnings("ignore")


class ClinicalAnnotationManager:

    def __init__(self, data_dir: str = "./data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        (self.data_dir / "annotations").mkdir(exist_ok=True)
        (self.data_dir / "exports").mkdir(exist_ok=True)
        (self.data_dir / "reports").mkdir(exist_ok=True)
        (self.data_dir / "images").mkdir(exist_ok=True)

        self.annotations: List[Dict] = []
        self.load_all_annotations()

    def validate_annotation(self, annotation: Dict) -> Tuple[bool, List[str]]:
        errors = []

        required_fields = {
            "A. 基本資料": ["caseId", "date", "ageGroup", "gender"],
            "B. 傷口位置": ["location"],
            "C. 傷口外觀": ["erythema", "exudate", "necrosis", "granulation"],
            "D. 深度判斷": ["depth"],
            "F. Wagner分級": ["wagnerGrade"],
        }

        for section, fields in required_fields.items():
            for field in fields:
                if not annotation.get(field):
                    errors.append(f"{section}: {field} 未填寫")

        infection_signs = annotation.get("infectionSigns", {})
        infection_count = sum(infection_signs.values())
        if infection_count >= 2:
            clinical_actions = annotation.get("clinicalActions", {})
            if not clinical_actions.get("antibiotics") and not clinical_actions.get(
                "debridement"
            ):
                errors.append("感染判定為陽性，但未勾選抗生素或清創處置")

        wagner_depth_mapping = {
            "0": ["callus"],
            "1": ["superficial"],
            "2": ["deep"],
            "3": ["deep", "tendon"],
            "4": ["tendon", "bone"],
            "5": ["bone"],
        }

        wagner = annotation.get("wagnerGrade", "")
        depth = annotation.get("depth", "")

        if wagner and depth:
            expected_depths = wagner_depth_mapping.get(wagner, [])
            if depth not in expected_depths:
                errors.append(f"Wagner Grade {wagner} 與深度判斷 {depth} 不一致")

        photo_compliance = annotation.get("photoCompliance", {})
        if photo_compliance:
            compliance_rate = sum(photo_compliance.values()) / len(photo_compliance)
        else:
            compliance_rate = 0

        if compliance_rate < 0.7:
            errors.append(
                f"照片規範合規率過低 ({compliance_rate*100:.0f}%)，建議 >= 70%"
            )

        is_valid = len(errors) == 0
        return is_valid, errors

    def save_annotation(
        self, annotation: Dict, image_path: Optional[str] = None
    ) -> Dict:
        is_valid, errors = self.validate_annotation(annotation)

        annotation["validation"] = {
            "is_valid": is_valid,
            "errors": errors,
            "validated_at": datetime.now().isoformat(),
        }

        annotation = self._enrich_annotation(annotation)

        case_id = annotation.get("caseId", "unknown")
        filename = f"{case_id}.json"
        filepath = self.data_dir / "annotations" / filename

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(annotation, f, ensure_ascii=False, indent=2)

        if image_path and Path(image_path).exists():
            image_filename = f"{case_id}{Path(image_path).suffix}"
            shutil.copy(image_path, self.data_dir / "images" / image_filename)

        self.annotations.append(annotation)

        return {
            "success": True,
            "filepath": str(filepath),
            "is_valid": is_valid,
            "errors": errors,
            "annotation": annotation,
        }

    def _enrich_annotation(self, annotation: Dict) -> Dict:
        enriched = annotation.copy()

        # 1. Infection score
        infection_signs = annotation.get("infectionSigns", {})
        infection_score = sum(infection_signs.values()) * 20
        enriched["computed_infection_score"] = infection_score
        enriched["is_infected"] = infection_score >= 40

        # 2. Wagner numeric
        wagner_map = {"0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5}
        enriched["wagner_numeric"] = wagner_map.get(
            annotation.get("wagnerGrade", "0"), 0
        )

        # 3. Depth severity
        depth_scores = {
            "callus": 10,
            "superficial": 30,
            "deep": 60,
            "tendon": 80,
            "bone": 100,
        }
        enriched["depth_severity_score"] = depth_scores.get(
            annotation.get("depth", ""), 0
        )

        # 4. Appearance risk score
        appearance_score = 0

        erythema_scores = {"none": 0, "<2cm": 30, ">2cm": 70}
        appearance_score += erythema_scores.get(
            annotation.get("erythema", "none"), 0
        )

        exudate_scores = {"none": 0, "minimal": 20, "moderate": 50, "heavy": 80}
        appearance_score += exudate_scores.get(
            annotation.get("exudate", "none"), 0
        )

        necrosis_scores = {"none": 0, "dry": 40, "wet": 70}
        appearance_score += necrosis_scores.get(
            annotation.get("necrosis", "none"), 0
        )

        granulation_scores = {"0": 50, "<50": 30, ">50": 0}
        appearance_score += granulation_scores.get(
            annotation.get("granulation", "0"), 0
        )

        if annotation.get("edema", False):
            appearance_score += 20
        if annotation.get("odor", False):
            appearance_score += 30

        enriched["appearance_risk_score"] = min(appearance_score, 100)

        # 5. Total risk score
        total_risk = (
            enriched["wagner_numeric"] / 5 * 40
            + enriched["depth_severity_score"]
            + infection_score * 0.2
            + enriched["appearance_risk_score"] * 0.1
        )
        enriched["total_risk_score"] = min(int(total_risk), 100)

        # 6. Risk level
        if enriched["total_risk_score"] < 40:
            enriched["risk_level"] = "low"
        elif enriched["total_risk_score"] < 70:
            enriched["risk_level"] = "medium"
        else:
            enriched["risk_level"] = "high"

        # 7. Photo quality
        photo_compliance = annotation.get("photoCompliance", {})
        if photo_compliance:
            photo_score = sum(photo_compliance.values()) / len(photo_compliance) * 100
        else:
            photo_score = 0
        enriched["photo_quality_score"] = round(photo_score, 1)

        return enriched

    def load_all_annotations(self):
        annotations_dir = self.data_dir / "annotations"
        self.annotations = []

        for json_file in annotations_dir.glob("*.json"):
            with open(json_file, "r", encoding="utf-8") as f:
                self.annotations.append(json.load(f))

    def get_annotation(self, case_id: str) -> Optional[Dict]:
        filepath = self.data_dir / "annotations" / f"{case_id}.json"
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def list_annotations(self) -> List[Dict]:
        self.load_all_annotations()
        summaries = []
        for ann in self.annotations:
            summaries.append(
                {
                    "caseId": ann.get("caseId"),
                    "date": ann.get("date"),
                    "wagnerGrade": ann.get("wagnerGrade"),
                    "risk_level": ann.get("risk_level"),
                    "total_risk_score": ann.get("total_risk_score"),
                    "is_valid": ann.get("validation", {}).get("is_valid"),
                }
            )
        return summaries

    def export_to_dataframe(self) -> pd.DataFrame:
        if not self.annotations:
            return pd.DataFrame()

        flattened_data = []

        for ann in self.annotations:
            flat = {
                "case_id": ann.get("caseId"),
                "date": ann.get("date"),
                "age_group": ann.get("ageGroup"),
                "gender": ann.get("gender"),
                "diabetes_duration": ann.get("diabetesDuration"),
                "hba1c": ann.get("hba1c"),
                "location": ann.get("location"),
                "erythema": ann.get("erythema"),
                "exudate": ann.get("exudate"),
                "necrosis": ann.get("necrosis"),
                "granulation": ann.get("granulation"),
                "edema": ann.get("edema"),
                "odor": ann.get("odor"),
                "depth": ann.get("depth"),
                "infection_redness": ann.get("infectionSigns", {}).get(
                    "redness", False
                ),
                "infection_heat": ann.get("infectionSigns", {}).get("heat", False),
                "infection_swelling": ann.get("infectionSigns", {}).get(
                    "swelling", False
                ),
                "infection_pain": ann.get("infectionSigns", {}).get("pain", False),
                "infection_pus": ann.get("infectionSigns", {}).get("pus", False),
                "is_infected": ann.get("is_infected", False),
                "wagner_grade": ann.get("wagnerGrade"),
                "wagner_numeric": ann.get("wagner_numeric", 0),
                "action_homecare": ann.get("clinicalActions", {}).get(
                    "homecare", False
                ),
                "action_followup": ann.get("clinicalActions", {}).get(
                    "followup", False
                ),
                "action_debridement": ann.get("clinicalActions", {}).get(
                    "debridement", False
                ),
                "action_antibiotics": ann.get("clinicalActions", {}).get(
                    "antibiotics", False
                ),
                "action_hospitalization": ann.get("clinicalActions", {}).get(
                    "hospitalization", False
                ),
                "action_surgery": ann.get("clinicalActions", {}).get(
                    "surgery", False
                ),
                "infection_score": ann.get("computed_infection_score", 0),
                "depth_severity_score": ann.get("depth_severity_score", 0),
                "appearance_risk_score": ann.get("appearance_risk_score", 0),
                "total_risk_score": ann.get("total_risk_score", 0),
                "risk_level": ann.get("risk_level", "unknown"),
                "photo_quality_score": ann.get("photo_quality_score", 0),
                "is_valid": ann.get("validation", {}).get("is_valid", False),
                "validation_errors": len(
                    ann.get("validation", {}).get("errors", [])
                ),
            }
            flattened_data.append(flat)

        return pd.DataFrame(flattened_data)

    def generate_statistics_report(self) -> Dict:
        self.load_all_annotations()
        df = self.export_to_dataframe()

        if df.empty:
            return {}

        report = {
            "basic_stats": {
                "total_cases": len(df),
                "date_range": {
                    "earliest": str(df["date"].min()),
                    "latest": str(df["date"].max()),
                },
                "validation_rate": round(df["is_valid"].sum() / len(df) * 100, 1),
                "avg_photo_quality": round(df["photo_quality_score"].mean(), 1),
            },
            "demographics": {
                "age_distribution": df["age_group"].value_counts().to_dict(),
                "gender_distribution": df["gender"].value_counts().to_dict(),
                "diabetes_duration": df["diabetes_duration"].value_counts().to_dict(),
            },
            "clinical_findings": {
                "location_distribution": df["location"].value_counts().to_dict(),
                "depth_distribution": df["depth"].value_counts().to_dict(),
                "wagner_grade_distribution": df["wagner_grade"]
                .value_counts()
                .to_dict(),
                "infection_rate": round(
                    df["is_infected"].sum() / len(df) * 100, 1
                ),
            },
            "risk_assessment": {
                "avg_total_risk": round(df["total_risk_score"].mean(), 1),
                "risk_level_distribution": df["risk_level"].value_counts().to_dict(),
                "high_risk_cases": int((df["risk_level"] == "high").sum()),
                "avg_infection_score": round(df["infection_score"].mean(), 1),
                "avg_depth_severity": round(df["depth_severity_score"].mean(), 1),
            },
            "clinical_actions": {
                "debridement_rate": round(
                    df["action_debridement"].sum() / len(df) * 100, 1
                ),
                "antibiotics_rate": round(
                    df["action_antibiotics"].sum() / len(df) * 100, 1
                ),
                "hospitalization_rate": round(
                    df["action_hospitalization"].sum() / len(df) * 100, 1
                ),
                "surgery_rate": round(
                    df["action_surgery"].sum() / len(df) * 100, 1
                ),
            },
        }

        return report

    def export_for_research(self, output_path: Optional[str] = None) -> str:
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = str(
                self.data_dir / "exports" / f"research_dataset_{timestamp}.csv"
            )

        self.load_all_annotations()
        df = self.export_to_dataframe()

        df_valid = df[df["is_valid"] == True].copy()

        if not df_valid.empty:
            df_valid["wagner_binary"] = (df_valid["wagner_numeric"] >= 2).astype(int)
            df_valid["severe_infection"] = (df_valid["infection_score"] >= 60).astype(
                int
            )
            df_valid["deep_ulcer"] = (
                df_valid["depth"].isin(["deep", "tendon", "bone"]).astype(int)
            )

        df_valid.to_csv(output_path, index=False, encoding="utf-8-sig")

        return output_path
