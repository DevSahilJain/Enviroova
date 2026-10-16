# Enviroova — Campus Energy Intelligence & Decarbonization

> **College Hackathon Prototype**  
> *Data & Sustainability Analysis Component*

---

## Team Members
* **Jeet Kotadiya**
* **Kislay Agarwal**
* **Vedant Jain**
* **Sahil Jain**

---

## Project Overview
**Enviroova** is an intelligent campus energy decarbonization platform designed to detect building energy anomalies, prescribe automated operational interventions, and verify energy and carbon savings using measurement and verification (M&V) best practices.

This repository contains the **curated synthetic campus energy dataset** for fictional **Building A (Science & Engineering Hall)**, covering a 14-day observation period (336 hourly readings) with pre-intervention anomaly modeling and post-intervention optimization verification.

> [!NOTE]
> **Synthetic Demo Data Disclaimer:** All data points, measurements, equipment telemetry, baseline estimates, and diagnostic log messages in this dataset are **100% synthetically generated** for the ECOLOOP hackathon prototype. No real campus or DSU facility measurements are represented.

---

## Dataset Deliverables

| File | Format | Description |
| :--- | :--- | :--- |
| **[`data/synthetic_building_a_energy.csv`](file:///c:/Users/hp/ecoloop/data/synthetic_building_a_energy.csv)** | CSV | 336 hourly observations with standard fields: `building_id`, `timestamp`, `kwh`, `actual_kwh`, `expected_kwh`, `baseline_kwh`, `subsystem`, `occupancy_count`, `outdoor_temp_c`, `anomaly_flag`, `anomaly_type`, `intervention_active`, and `evidence`. |
| **[`data/synthetic_building_a_energy.json`](file:///c:/Users/hp/ecoloop/data/synthetic_building_a_energy.json)** | JSON | Comprehensive JSON payload with facility metadata, KPI rollups, enriched anomaly models, linked evidence references, intervention specifications, and sample records. |
| **[`data/evidence_records.json`](file:///c:/Users/hp/ecoloop/data/evidence_records.json)** | JSON | Standalone atomic telemetry evidence records linked to Building A anomalies, separating facts from hypotheses and providing causality cautions. |
| **[`data/sample_sustainability_dataset.csv`](file:///c:/Users/hp/ecoloop/data/sample_sustainability_dataset.csv)** | CSV | Multi-resource sustainability dataset across generic locations (Block A, Block B, Cafeteria, Library, Hostel 1) measuring Electricity (kWh), Water (litres), and Waste (kg). |
| **[`data/sample_sustainability_dataset.json`](file:///c:/Users/hp/ecoloop/data/sample_sustainability_dataset.json)** | JSON | Structured multi-resource sustainability dataset with stream summaries, generic location tags, anomaly severities, and simulation flags. |
| **[`data/interventions_summary.json`](file:///c:/Users/hp/ecoloop/data/interventions_summary.json)** | JSON | Machine-readable breakdown of the 3 interventions, predicted vs. observed savings, carbon emissions avoided, and cost savings. |
| **[`data/DATA_DICTIONARY.md`](file:///c:/Users/hp/ecoloop/data/DATA_DICTIONARY.md)** | Markdown | Complete technical specification, field data dictionary, anomaly hypotheses, intervention controls, and developer integration guide. |

---

## Key Highlights & Performance Summary

### 1. Three Realistic Operational Waste Anomalies (Week 1)
* **`ANOM-01` (HVAC Overrun):** Friday night manual thermostat override (18°C) forces AHU-1 and chillers to run 100% overnight while unoccupied (**437.8 kWh excess**).
* **`ANOM-02` (Overnight Lighting):** Custodial master key override left ON in 3rd-floor lecture hall and atrium over Sunday early morning (**159.2 kWh excess**).
* **`ANOM-03` (Lab Equipment Idle Drain):** 40 high-performance GPU workstations and 3D printers left energized overnight with sleep disabled (**255.4 kWh excess**).

### 2. Three Coordinated ECOLOOP Interventions (Week 2)
1. **HVAC Scheduling & Night Setback (`INT-01`):** Night setback (27.5°C cool / 15.5°C heat), 20% minimum AHU ventilation, 90-min max override timeout (**2,168.4 kWh saved / 37.3%**).
2. **PIR Lighting Optimization (`INT-02`):** 15-minute vacancy timeouts, 20:30 automated circuit sweeps, and continuous perimeter daylight dimming (**1,318.2 kWh saved / 44.8%**).
3. **Unused-Equipment Shutdown (`INT-03`):** Active Directory 15-min idle S3 sleep policy, scheduled smart relay cutoff for lab benches at 20:00 (**1,482.6 kWh saved / 46.6%**).

### 3. Before-and-After Comparison (Week 1 vs. Week 2)
* **Weekly Baseline:** `11,940.0 kWh`
* **Predicted Savings:** `5,080.0 kWh` (**42.55%**)
* **Observed Savings:** `4,969.2 kWh` (**41.62%**)
* **Model Accuracy:** `97.82%` (-110.8 kWh variance)
* **Carbon Avoided:** **`1,913.1 kg CO₂e / week`** (~99.5 MT CO₂e annualized)
* **Financial Savings:** **`$596.30 / week`** (~$31,000 / year @ $0.12/kWh)

---

## How Team Members Can Use This Data

### Frontend Integration (Charts & Dashboards)
* Ingest [`data/synthetic_building_a_energy.csv`](file:///c:/Users/hp/ecoloop/data/synthetic_building_a_energy.csv) via `papaparse` or D3 to plot diurnal curves comparing `actual_kwh`, `expected_kwh`, and `baseline_kwh`.
* Color-code anomalies in red using `anomaly_flag == true` and display the `evidence` field in a modal or tooltip.
* Render KPI cards directly from [`data/interventions_summary.json`](file:///c:/Users/hp/ecoloop/data/interventions_summary.json).

### Backend Integration (APIs)
* Ingest the CSV into SQLite / PostgreSQL or serve JSON endpoints:
  * `GET /api/buildings/BUILDING_A/energy`
  * `GET /api/buildings/BUILDING_A/anomalies`
  * `GET /api/buildings/BUILDING_A/interventions`
