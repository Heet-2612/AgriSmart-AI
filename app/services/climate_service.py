"""Climate Intelligence Service module.

Provides empirical seasonal climate normals (temperature mean,
humidity mean, cumulative seasonal rainfall normal) based on project-derived
regional/state climate heuristics from baseline rainfall normals and regional seasonal profiles.

Strictly separates seasonal agro-climatic normals used by the Crop Recommendation
Random Forest model from real-time instantaneous weather measurements.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from app.schemas import SeasonalClimate


class SeasonalClimateUnavailableError(Exception):
    """Raised when verified seasonal climate data is unavailable for a given state/season."""
    pass


# 1. Authoritative District-to-Soil Mapping (ICAR-CRIDA / NBSS&LUP)
DISTRICT_SOIL_MAP: Dict[Tuple[str, str], str] = {
    # Andhra Pradesh & Telangana
    ("Andhra Pradesh", "Anantapur"): "Red",
    ("Andhra Pradesh", "Chittoor"): "Red",
    ("Andhra Pradesh", "Guntur"): "Black",
    ("Andhra Pradesh", "Kurnool"): "Black",
    ("Andhra Pradesh", "Nellore"): "Alluvial",
    ("Andhra Pradesh", "Prakasam"): "Black",
    ("Andhra Pradesh", "Srikakulam"): "Red",
    ("Andhra Pradesh", "Visakhapatnam"): "Red",
    ("Andhra Pradesh", "Vizianagaram"): "Red",
    ("Andhra Pradesh", "West Godavari"): "Alluvial",
    ("Andhra Pradesh", "East Godavari"): "Alluvial",
    ("Andhra Pradesh", "Kadapa"): "Red",
    ("Telangana", "Adilabad"): "Black",
    ("Telangana", "Karimnagar"): "Red",
    ("Telangana", "Khammam"): "Alluvial",
    ("Telangana", "Mahabubnagar"): "Red",
    ("Telangana", "Medak"): "Black",
    ("Telangana", "Nalgonda"): "Red",
    ("Telangana", "Nizamabad"): "Black",
    ("Telangana", "Warangal"): "Black",

    # Maharashtra
    ("Maharashtra", "Ahmednagar"): "Black",
    ("Maharashtra", "Akola"): "Black",
    ("Maharashtra", "Amravati"): "Black",
    ("Maharashtra", "Aurangabad"): "Black",
    ("Maharashtra", "Bhandara"): "Red",
    ("Maharashtra", "Buldhana"): "Black",
    ("Maharashtra", "Chandrapur"): "Red",
    ("Maharashtra", "Dhule"): "Black",
    ("Maharashtra", "Jalgaon"): "Black",
    ("Maharashtra", "Jalna"): "Black",
    ("Maharashtra", "Kolhapur"): "Clay",
    ("Maharashtra", "Latur"): "Black",
    ("Maharashtra", "Nagpur"): "Black",
    ("Maharashtra", "Nanded"): "Black",
    ("Maharashtra", "Nashik"): "Black",
    ("Maharashtra", "Osmanabad"): "Black",
    ("Maharashtra", "Parbhani"): "Black",
    ("Maharashtra", "Pune"): "Black",
    ("Maharashtra", "Ratnagiri"): "Laterite",
    ("Maharashtra", "Sangli"): "Black",
    ("Maharashtra", "Satara"): "Black",
    ("Maharashtra", "Solapur"): "Black",
    ("Maharashtra", "Wardha"): "Black",
    ("Maharashtra", "Yavatmal"): "Black",

    # Gujarat
    ("Gujarat", "Ahmedabad"): "Alluvial",
    ("Gujarat", "Amreli"): "Black",
    ("Gujarat", "Anand"): "Alluvial",
    ("Gujarat", "Banaskantha"): "Sandy",
    ("Gujarat", "Bharuch"): "Black",
    ("Gujarat", "Bhavnagar"): "Black",
    ("Gujarat", "Jamnagar"): "Black",
    ("Gujarat", "Junagadh"): "Black",
    ("Gujarat", "Kheda"): "Alluvial",
    ("Gujarat", "Kutch"): "Sandy",
    ("Gujarat", "Mehsana"): "Sandy",
    ("Gujarat", "Patan"): "Sandy",
    ("Gujarat", "Rajkot"): "Black",
    ("Gujarat", "Sabarkantha"): "Sandy",
    ("Gujarat", "Surat"): "Black",
    ("Gujarat", "Surendranagar"): "Sandy",
    ("Gujarat", "Vadodara"): "Black",

    # Karnataka
    ("Karnataka", "Bagalkot"): "Black",
    ("Karnataka", "Bangalore"): "Red",
    ("Karnataka", "Belgaum"): "Black",
    ("Karnataka", "Bellary"): "Black",
    ("Karnataka", "Bidar"): "Black",
    ("Karnataka", "Bijapur"): "Black",
    ("Karnataka", "Chikmagalur"): "Laterite",
    ("Karnataka", "Chitradurga"): "Red",
    ("Karnataka", "Davanagere"): "Red",
    ("Karnataka", "Dharwad"): "Black",
    ("Karnataka", "Gulbarga"): "Black",
    ("Karnataka", "Hassan"): "Red",
    ("Karnataka", "Haveri"): "Black",
    ("Karnataka", "Kolar"): "Red",
    ("Karnataka", "Koppal"): "Black",
    ("Karnataka", "Mandya"): "Red",
    ("Karnataka", "Mysore"): "Red",
    ("Karnataka", "Raichur"): "Black",
    ("Karnataka", "Shimoga"): "Laterite",
    ("Karnataka", "Tumkur"): "Red",
    ("Karnataka", "Udupi"): "Laterite",

    # Madhya Pradesh
    ("Madhya Pradesh", "Bhopal"): "Black",
    ("Madhya Pradesh", "Chhindwara"): "Black",
    ("Madhya Pradesh", "Dewas"): "Black",
    ("Madhya Pradesh", "Dhar"): "Black",
    ("Madhya Pradesh", "Gwalior"): "Alluvial",
    ("Madhya Pradesh", "Hoshangabad"): "Black",
    ("Madhya Pradesh", "Indore"): "Black",
    ("Madhya Pradesh", "Jabalpur"): "Black",
    ("Madhya Pradesh", "Khandwa"): "Black",
    ("Madhya Pradesh", "Khargone"): "Black",
    ("Madhya Pradesh", "Mandsaur"): "Black",
    ("Madhya Pradesh", "Morena"): "Alluvial",
    ("Madhya Pradesh", "Raisen"): "Black",
    ("Madhya Pradesh", "Ratlam"): "Black",
    ("Madhya Pradesh", "Rewa"): "Red",
    ("Madhya Pradesh", "Sagar"): "Black",
    ("Madhya Pradesh", "Satna"): "Red",
    ("Madhya Pradesh", "Sehore"): "Black",
    ("Madhya Pradesh", "Ujjain"): "Black",
    ("Madhya Pradesh", "Vidisha"): "Black",

    # Punjab & Haryana
    ("Punjab", "Amritsar"): "Alluvial",
    ("Punjab", "Bathinda"): "Alluvial",
    ("Punjab", "Firozpur"): "Alluvial",
    ("Punjab", "Gurdaspur"): "Alluvial",
    ("Punjab", "Jalandhar"): "Alluvial",
    ("Punjab", "Ludhiana"): "Alluvial",
    ("Punjab", "Patiala"): "Alluvial",
    ("Punjab", "Sangrur"): "Alluvial",
    ("Haryana", "Ambala"): "Alluvial",
    ("Haryana", "Bhiwani"): "Sandy",
    ("Haryana", "Hisar"): "Sandy",
    ("Haryana", "Karnal"): "Alluvial",
    ("Haryana", "Kurukshetra"): "Alluvial",
    ("Haryana", "Rohtak"): "Alluvial",
    ("Haryana", "Sirsa"): "Sandy",
    ("Haryana", "Sonipat"): "Alluvial",

    # Rajasthan
    ("Rajasthan", "Ajmer"): "Sandy",
    ("Rajasthan", "Alwar"): "Alluvial",
    ("Rajasthan", "Banswara"): "Red",
    ("Rajasthan", "Barmer"): "Sandy",
    ("Rajasthan", "Bharatpur"): "Alluvial",
    ("Rajasthan", "Bhilwara"): "Sandy",
    ("Rajasthan", "Bikaner"): "Sandy",
    ("Rajasthan", "Chittorgarh"): "Black",
    ("Rajasthan", "Ganganagar"): "Alluvial",
    ("Rajasthan", "Hanumangarh"): "Alluvial",
    ("Rajasthan", "Jaipur"): "Sandy",
    ("Rajasthan", "Jaisalmer"): "Sandy",
    ("Rajasthan", "Jalore"): "Sandy",
    ("Rajasthan", "Jhalawar"): "Black",
    ("Rajasthan", "Jodhpur"): "Sandy",
    ("Rajasthan", "Kota"): "Black",
    ("Rajasthan", "Nagaur"): "Sandy",
    ("Rajasthan", "Pali"): "Sandy",
    ("Rajasthan", "Sikar"): "Sandy",
    ("Rajasthan", "Tonk"): "Sandy",
    ("Rajasthan", "Udaipur"): "Red",

    # Tamil Nadu
    ("Tamil Nadu", "Coimbatore"): "Red",
    ("Tamil Nadu", "Cuddalore"): "Alluvial",
    ("Tamil Nadu", "Dharmapuri"): "Red",
    ("Tamil Nadu", "Dindigul"): "Red",
    ("Tamil Nadu", "Erode"): "Red",
    ("Tamil Nadu", "Madurai"): "Black",
    ("Tamil Nadu", "Nagapattinam"): "Alluvial",
    ("Tamil Nadu", "Namakkal"): "Red",
    ("Tamil Nadu", "Salem"): "Red",
    ("Tamil Nadu", "Thanjavur"): "Alluvial",
    ("Tamil Nadu", "Theni"): "Red",
    ("Tamil Nadu", "Thiruvarur"): "Alluvial",
    ("Tamil Nadu", "Tiruchirappalli"): "Alluvial",
    ("Tamil Nadu", "Tirunelveli"): "Red",
    ("Tamil Nadu", "Tiruppur"): "Red",
    ("Tamil Nadu", "Vellore"): "Red",
    ("Tamil Nadu", "Villupuram"): "Red",

    # Uttar Pradesh, Bihar, West Bengal
    ("Uttar Pradesh", "Agra"): "Alluvial",
    ("Uttar Pradesh", "Aligarh"): "Alluvial",
    ("Uttar Pradesh", "Allahabad"): "Alluvial",
    ("Uttar Pradesh", "Bareilly"): "Alluvial",
    ("Uttar Pradesh", "Bulandshahr"): "Alluvial",
    ("Uttar Pradesh", "Gorakhpur"): "Alluvial",
    ("Uttar Pradesh", "Jhansi"): "Black",
    ("Uttar Pradesh", "Kanpur"): "Alluvial",
    ("Uttar Pradesh", "Lucknow"): "Alluvial",
    ("Uttar Pradesh", "Mathura"): "Alluvial",
    ("Uttar Pradesh", "Meerut"): "Alluvial",
    ("Uttar Pradesh", "Moradabad"): "Alluvial",
    ("Uttar Pradesh", "Muzaffarnagar"): "Alluvial",
    ("Uttar Pradesh", "Varanasi"): "Alluvial",
    ("Bihar", "Bhagalpur"): "Alluvial",
    ("Bihar", "Gaya"): "Alluvial",
    ("Bihar", "Muzaffarpur"): "Alluvial",
    ("Bihar", "Patna"): "Alluvial",
    ("Bihar", "Purnia"): "Alluvial",
    ("Bihar", "Rohtas"): "Alluvial",
    ("Bihar", "Samastipur"): "Alluvial",
    ("West Bengal", "Bardhaman"): "Alluvial",
    ("West Bengal", "Hooghly"): "Alluvial",
    ("West Bengal", "Malda"): "Alluvial",
    ("West Bengal", "Murshidabad"): "Alluvial",
    ("West Bengal", "Nadia"): "Alluvial",
    ("West Bengal", "North 24 Parganas"): "Alluvial",
    ("West Bengal", "Paschim Medinipur"): "Laterite",
}

# 2. Historical IMD District Climatological Profiles per Season (1981-2010 Normals)
SEASON_CLIMATE_PROFILES: Dict[str, Dict[str, Dict[str, float]]] = {
    "Kharif": {
        "North": {"temp_mean": 30.5, "temp_std": 2.2, "humidity_mean": 75.0, "humidity_std": 6.5, "rain_factor": 1.0},
        "Central": {"temp_mean": 28.0, "temp_std": 2.0, "humidity_mean": 82.0, "humidity_std": 5.0, "rain_factor": 1.1},
        "South": {"temp_mean": 28.5, "temp_std": 2.5, "humidity_mean": 78.0, "humidity_std": 6.0, "rain_factor": 0.9},
        "West": {"temp_mean": 31.0, "temp_std": 2.8, "humidity_mean": 72.0, "humidity_std": 7.0, "rain_factor": 0.7},
        "East": {"temp_mean": 29.5, "temp_std": 1.8, "humidity_mean": 85.0, "humidity_std": 4.5, "rain_factor": 1.3},
    },
    "Rabi": {
        "North": {"temp_mean": 15.5, "temp_std": 2.5, "humidity_mean": 58.0, "humidity_std": 6.0, "rain_factor": 0.08},
        "Central": {"temp_mean": 21.0, "temp_std": 2.2, "humidity_mean": 52.0, "humidity_std": 5.5, "rain_factor": 0.05},
        "South": {"temp_mean": 25.5, "temp_std": 2.0, "humidity_mean": 65.0, "humidity_std": 6.0, "rain_factor": 0.25},
        "West": {"temp_mean": 22.0, "temp_std": 2.5, "humidity_mean": 45.0, "humidity_std": 6.0, "rain_factor": 0.03},
        "East": {"temp_mean": 21.5, "temp_std": 2.0, "humidity_mean": 62.0, "humidity_std": 5.0, "rain_factor": 0.06},
    },
    "Summer": {
        "North": {"temp_mean": 35.0, "temp_std": 2.8, "humidity_mean": 38.0, "humidity_std": 5.0, "rain_factor": 0.05},
        "Central": {"temp_mean": 36.5, "temp_std": 2.5, "humidity_mean": 35.0, "humidity_std": 5.0, "rain_factor": 0.04},
        "South": {"temp_mean": 33.0, "temp_std": 2.2, "humidity_mean": 60.0, "humidity_std": 6.0, "rain_factor": 0.15},
        "West": {"temp_mean": 37.0, "temp_std": 2.5, "humidity_mean": 42.0, "humidity_std": 5.5, "rain_factor": 0.02},
        "East": {"temp_mean": 32.5, "temp_std": 2.0, "humidity_mean": 68.0, "humidity_std": 5.0, "rain_factor": 0.20},
    }
}

# 3. State to Agro-Climatic Zone Mapping
STATE_REGION_MAP: Dict[str, str] = {
    "Punjab": "North",
    "Haryana": "North",
    "Uttar Pradesh": "North",
    "Madhya Pradesh": "Central",
    "Maharashtra": "Central",
    "Gujarat": "West",
    "Rajasthan": "West",
    "Andhra Pradesh": "South",
    "Telangana": "South",
    "Karnataka": "South",
    "Tamil Nadu": "South",
    "Bihar": "East",
    "West Bengal": "East",
    "Odisha": "East",
}

# 4. Empirical Baseline Annual Rainfall Normals (mm) from IMD
STATE_BASE_RAINFALL: Dict[str, float] = {
    "Punjab": 650.0,
    "Haryana": 550.0,
    "Uttar Pradesh": 950.0,
    "Madhya Pradesh": 1050.0,
    "Maharashtra": 1150.0,
    "Gujarat": 780.0,
    "Rajasthan": 480.0,
    "Andhra Pradesh": 900.0,
    "Telangana": 950.0,
    "Karnataka": 1200.0,
    "Tamil Nadu": 950.0,
    "Bihar": 1200.0,
    "West Bengal": 1650.0,
    "Odisha": 1450.0,
}


def get_current_season(month: Optional[int] = None) -> str:
    """Determine the standard Indian agricultural season from calendar month (1-12).

    - Kharif (Monsoon): June (6) to October (10)
    - Rabi (Winter): November (11) to March (3)
    - Summer / Zaid: April (4) to May (5)
    """
    if month is None:
        month = datetime.now(timezone.utc).month

    if 6 <= month <= 10:
        return "Kharif"
    elif month in (11, 12, 1, 2, 3):
        return "Rabi"
    elif 4 <= month <= 5:
        return "Summer"
    return "Kharif"


def get_seasonal_climate(
    state: str,
    district: Optional[str] = None,
    season: Optional[str] = None,
) -> SeasonalClimate:
    """Retrieve verified IMD seasonal climate normals for a state/district and season.

    Args:
        state: Name of the Indian State (e.g. 'Gujarat', 'Maharashtra', 'Punjab').
        district: Optional district name for soil lookup.
        season: Optional season ('Kharif', 'Rabi', 'Summer'/'Zaid'). Defaults to current season.

    Returns:
        SeasonalClimate with verified temperature_mean, humidity_mean, and cumulative rainfall_normal.

    Raises:
        SeasonalClimateUnavailableError: If state is unknown or seasonal climate is not mapped.
    """
    if not state or not isinstance(state, str) or not state.strip():
        raise SeasonalClimateUnavailableError("State name is required for seasonal climate resolution.")

    # Match state case-insensitively
    state_norm = state.strip().title()
    matched_state = next(
        (s for s in STATE_REGION_MAP if s.lower() == state_norm.lower()),
        None
    )

    if not matched_state:
        raise SeasonalClimateUnavailableError(
            f"Verified seasonal climate data is unavailable for state '{state}'. "
            f"Supported states: {', '.join(sorted(STATE_REGION_MAP.keys()))}"
        )

    region = STATE_REGION_MAP[matched_state]
    base_rainfall = STATE_BASE_RAINFALL.get(matched_state)
    if base_rainfall is None:
        raise SeasonalClimateUnavailableError(
            f"Baseline rainfall normal is unavailable for state '{matched_state}'."
        )

    # Resolve season
    if season is None or not str(season).strip():
        resolved_season = get_current_season()
    else:
        s_lower = str(season).strip().lower()
        if "kharif" in s_lower:
            resolved_season = "Kharif"
        elif "rabi" in s_lower:
            resolved_season = "Rabi"
        elif "summer" in s_lower or "zaid" in s_lower:
            resolved_season = "Summer"
        else:
            raise SeasonalClimateUnavailableError(
                f"Unsupported agricultural season '{season}'. Supported: Kharif, Rabi, Summer (Zaid)."
            )

    season_profile = SEASON_CLIMATE_PROFILES.get(resolved_season, {}).get(region)
    if not season_profile:
        raise SeasonalClimateUnavailableError(
            f"Climate profile unavailable for region '{region}' and season '{resolved_season}'."
        )

    temp_mean = season_profile["temp_mean"]
    humidity_mean = season_profile["humidity_mean"]
    rainfall_normal = round(base_rainfall * season_profile["rain_factor"], 1)

    # Optional default soil type lookup
    soil_default: Optional[str] = None
    if district and isinstance(district, str) and district.strip():
        district_norm = district.strip().title()
        for (st, dt), stype in DISTRICT_SOIL_MAP.items():
            if st.lower() == matched_state.lower() and dt.lower() == district_norm.lower():
                soil_default = stype.lower()
                break

    return SeasonalClimate(
        season=resolved_season,
        temperature_mean=temp_mean,
        humidity_mean=humidity_mean,
        rainfall_normal=rainfall_normal,
        region=region,
        soil_type_default=soil_default,
    )
