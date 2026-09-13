"""Backend tests for Sustainability Score and Simulated IoT Telemetry Engine."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_iot_telemetry_presets_endpoint():
    """Verify GET /api/sustainability/iot-telemetry returns deterministic scenarios."""
    res = client.get("/api/sustainability/iot-telemetry")
    assert res.status_code == 200
    data = res.json()
    assert "presets" in data
    assert len(data["presets"]) >= 3
    preset_ids = [p["preset_id"] for p in data["presets"]]
    assert "optimal_loam" in preset_ids
    assert "dry_deficit" in preset_ids
    assert "saturated_heavy" in preset_ids


def test_scenario_a_optimal_conditions_high_score():
    """Scenario A: Excellent conditions (rain imminent, delayed irrigation, legume rotation, optimal soil)."""
    payload = {
        "crop": "chickpea",
        "farm_area_hectares": 0.2,
        "soil_type": "Black",
        "previous_crop": "cotton",
        "action": "delay",
        "temperature_celsius": 24.0,
        "humidity_percent": 55.0,
        "rain_probability_percent": 75.0,
        "expected_rainfall_mm": 15.0,
        "soil_moisture_percent": 32.0,
    }
    res = client.post("/api/sustainability-score", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["total_score"] >= 80
    assert data["score_label"] == "Excellent"
    assert data["breakdown"]["water_conservation"]["points"] == 40.0
    assert data["breakdown"]["crop_rotation_compatibility"]["points"] == 15.0
    assert data["water_impact"]["impact_type"] in ("avoided", "saved")
    # Option A: 30 L/min * 60 min = 1,800 Litres (total field flow rate)
    assert data["water_impact"]["litres"] == 1800
    assert "Avoided" in data["water_impact"]["label"]


def test_scenario_b_poor_management_decreases_score():
    """Scenario B: Unnecessary irrigation right before heavy rain, monoculture, over-saturated soil."""
    payload = {
        "crop": "rice",
        "farm_area_hectares": 0.2,
        "soil_type": "Alluvial",
        "previous_crop": "rice",
        "action": "irrigate_now",
        "temperature_celsius": 38.0,
        "humidity_percent": 90.0,
        "rain_probability_percent": 80.0,
        "expected_rainfall_mm": 25.0,
        "soil_moisture_percent": 50.0,
    }
    res = client.post("/api/sustainability-score", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["total_score"] < 50
    assert data["score_label"] == "Needs Improvement"
    assert data["breakdown"]["water_conservation"]["points"] == 10.0
    assert data["breakdown"]["crop_rotation_compatibility"]["points"] == 4.0
    assert data["water_impact"]["impact_type"] == "unnecessary_use"


def test_scenario_c_determinism_identical_inputs_produce_identical_scores():
    """Scenario C: Determinism verification — two identical requests produce bit-for-bit identical outputs."""
    payload = {
        "crop": "wheat",
        "farm_area_hectares": 0.5,
        "soil_type": "Alluvial",
        "previous_crop": "rice",
        "action": "delay",
        "temperature_celsius": 20.0,
        "humidity_percent": 55.0,
        "rain_probability_percent": 40.0,
        "expected_rainfall_mm": 2.0,
        "soil_moisture_percent": 28.0,
    }
    res1 = client.post("/api/sustainability-score", json=payload)
    res2 = client.post("/api/sustainability-score", json=payload)

    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json() == res2.json()


def test_scenario_d_validation_rejects_invalid_inputs():
    """Scenario D: Validation check — missing or invalid values return 422 with structured detail."""
    res_area = client.post("/api/sustainability-score", json={"crop": "wheat", "temperature_celsius": 25, "humidity_percent": 50, "farm_area_hectares": -1.0})
    assert res_area.status_code == 422

    res_act = client.post("/api/sustainability-score", json={"crop": "wheat", "temperature_celsius": 25, "humidity_percent": 50, "action": "invalid_action"})
    assert res_act.status_code == 422

    res_temp = client.post("/api/sustainability-score", json={"crop": "wheat", "temperature_celsius": 150, "humidity_percent": 50})
    assert res_temp.status_code == 422


def test_what_if_comparison_logic():
    """Verify that both action branches (delay vs irrigate_now) are precomputed and explainable."""
    payload = {
        "crop": "maize",
        "farm_area_hectares": 0.1,
        "action": "irrigate_now",
        "temperature_celsius": 28.0,
        "humidity_percent": 65.0,
        "rain_probability_percent": 70.0,
        "expected_rainfall_mm": 10.0,
        "soil_moisture_percent": 35.0,
    }
    res = client.post("/api/sustainability-score", json=payload)
    assert res.status_code == 200
    data = res.json()

    comp = data["comparison"]
    assert "delay" in comp
    assert "irrigate_now" in comp
    assert comp["delay"]["score"] > comp["irrigate_now"]["score"]


def test_soil_profile_awareness():
    """Verify that soil moisture interpretation differs between Sandy and Clay profiles."""
    base = {
        "crop": "maize",
        "farm_area_hectares": 0.1,
        "action": "delay",
        "temperature_celsius": 25.0,
        "humidity_percent": 60.0,
        "rain_probability_percent": 10.0,
        "expected_rainfall_mm": 0.0,
        "soil_moisture_percent": 20.0,
    }

    # In sandy soil, 20% VWC is within optimal field capacity (14-24%)
    res_sand = client.post("/api/sustainability-score", json={**base, "soil_type": "Sandy"})
    assert res_sand.status_code == 200
    data_sand = res_sand.json()
    assert data_sand["breakdown"]["soil_moisture_balance"]["points"] == 15.0
    assert "Sandy" in data_sand["breakdown"]["soil_moisture_balance"]["reason"]

    # In clay soil, 20% VWC is near the wilting point / severe deficit
    res_clay = client.post("/api/sustainability-score", json={**base, "soil_type": "Clay"})
    assert res_clay.status_code == 200
    data_clay = res_clay.json()
    assert data_clay["breakdown"]["soil_moisture_balance"]["points"] <= 8.0
    assert "Clay" in data_clay["breakdown"]["soil_moisture_balance"]["reason"]


def test_dry_soil_dry_forecast_irrigate_now_positive_score():
    """Dry soil + dry forecast + irrigation now produces a sensible positive water-management score."""
    payload = {
        "crop": "cotton",
        "farm_area_hectares": 0.1,
        "soil_type": "Loam",
        "action": "irrigate_now",
        "temperature_celsius": 28.0,
        "humidity_percent": 50.0,
        "rain_probability_percent": 10.0,
        "expected_rainfall_mm": 0.0,
        "soil_moisture_percent": 12.0,  # Below wilting point for loam
    }
    res = client.post("/api/sustainability-score", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Timely irrigation of deficit produces 36.0 water conservation points
    assert data["breakdown"]["water_conservation"]["points"] == 36.0
    assert "Targeted Relief" in data["breakdown"]["water_conservation"]["status"]


def test_water_volume_impact_represents_total_field_flow():
    """Verify that flow_rate_lpm represents total field flow, so area does not multiply volume."""
    payload_small = {
        "crop": "wheat",
        "farm_area_hectares": 0.1,
        "action": "delay",
        "temperature_celsius": 25.0,
        "humidity_percent": 60.0,
        "rain_probability_percent": 80.0,
        "expected_rainfall_mm": 15.0,
        "soil_moisture_percent": 32.0,
    }
    payload_large = {
        **payload_small,
        "farm_area_hectares": 5.0,
    }
    res_small = client.post("/api/sustainability-score", json=payload_small)
    res_large = client.post("/api/sustainability-score", json=payload_large)

    assert res_small.status_code == 200
    assert res_large.status_code == 200
    # Both should evaluate to identical 1,800 L (30 L/min * 60 min)
    assert res_small.json()["water_impact"]["litres"] == 1800
    assert res_large.json()["water_impact"]["litres"] == 1800
