// Generator script for ECOLOOP Synthetic Building A Energy Dataset
const fs = require('fs');
const path = require('path');

const BUILDING_ID = "BUILDING_A";
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Pseudo-random seeded generator for reproducible, realistic variations
let seed = 42;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

function gaussianNoise(mean = 0, stdev = 1) {
  let u = 1 - random();
  let v = random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdev;
}

// Simulation parameters for Building A (Academic Science & Lab Building, ~45,000 sq ft)
// Base un-optimized profiles by hour:
function getBaseHourlyProfile(hour, isWeekend) {
  if (isWeekend) {
    if (hour >= 0 && hour < 7) return 24.5;
    if (hour >= 7 && hour < 10) return 32.0;
    if (hour >= 10 && hour < 18) return 48.0;
    if (hour >= 18 && hour < 22) return 38.0;
    return 26.0;
  } else {
    // Weekday profile
    if (hour >= 0 && hour < 6) return 28.5; // Unoccupied baseload (standby servers, safety lighting)
    if (hour >= 6 && hour < 8) return 55.0; // Morning ramp-up
    if (hour >= 8 && hour < 12) return 125.0; // Morning classes & lab sessions
    if (hour >= 12 && hour < 14) return 115.0; // Midday lunch slight dip
    if (hour >= 14 && hour < 18) return 138.0; // Afternoon peak labs, HVAC cooling load
    if (hour >= 18 && hour < 21) return 78.0; // Evening study sessions & night classes
    if (hour >= 21 && hour < 24) return 42.0; // Evening wind-down
    return 30.0;
  }
}

function getExpectedOccupancy(hour, isWeekend) {
  if (isWeekend) {
    if (hour >= 10 && hour < 17) return Math.round(15 + gaussianNoise(0, 3));
    if (hour >= 17 && hour < 21) return Math.round(8 + gaussianNoise(0, 2));
    return 0;
  } else {
    if (hour >= 0 && hour < 6) return 0;
    if (hour >= 6 && hour < 8) return Math.round(18 + gaussianNoise(0, 4));
    if (hour >= 8 && hour < 12) return Math.round(185 + gaussianNoise(0, 15));
    if (hour >= 12 && hour < 14) return Math.round(140 + gaussianNoise(0, 12));
    if (hour >= 14 && hour < 18) return Math.round(210 + gaussianNoise(0, 18));
    if (hour >= 18 && hour < 21) return Math.round(65 + gaussianNoise(0, 8));
    if (hour >= 21 && hour < 24) return Math.round(12 + gaussianNoise(0, 3));
    return 0;
  }
}

function getOutdoorTemp(hour, dayIndex) {
  // Typical October autumn day diurnal curve: low ~12C at 05:00, high ~22C at 15:00
  const dailyMean = 16.5 + Math.sin(dayIndex) * 1.5;
  const diurnal = 5.0 * Math.sin(((hour - 9) / 24) * 2 * Math.PI);
  return Number((dailyMean + diurnal + gaussianNoise(0, 0.4)).toFixed(1));
}

const records = [];
const startDate = new Date(Date.UTC(2026, 9, 1, 0, 0, 0)); // Oct 1, 2026 UTC

for (let i = 0; i < 336; i++) {
  const currentTimestamp = new Date(startDate.getTime() + i * 3600 * 1000);
  const isoTime = currentTimestamp.toISOString().replace('.000', '');
  const dayIndex = Math.floor(i / 24); // 0 to 13
  const hour = currentTimestamp.getUTCHours();
  const dayOfWeek = currentTimestamp.getUTCDay(); // 0 is Sunday, 4 is Thursday (Oct 1)
  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
  const isWeekTwo = (dayIndex >= 7); // Interventions deployed in Week 2

  const outdoorTemp = getOutdoorTemp(hour, dayIndex);
  let occupancy = Math.max(0, getExpectedOccupancy(hour, isWeekend));

  // Baseload baseline calculation
  const baseProfile = getBaseHourlyProfile(hour, isWeekend);
  // Weather sensitivity factor for HVAC
  const tempDelta = Math.max(0, outdoorTemp - 18.0);
  const weatherLoad = tempDelta * 2.2;
  const rawBaseline = baseProfile + weatherLoad;
  const baseline_kwh = Number((rawBaseline + gaussianNoise(0, 1.2)).toFixed(2));

  let actual_kwh = baseline_kwh;
  let expected_kwh = baseline_kwh;
  let anomaly_flag = false;
  let anomaly_type = "NONE";
  let subsystem = "MIXED";
  let intervention_active = isWeekTwo ? "ALL_INTERVENTIONS" : "BASELINE_NONE";
  let evidence = "Normal building operations within nominal tolerance bounds.";

  // WEEK 1: Baseline & Anomalies
  if (!isWeekTwo) {
    // ANOMALY 1: HVAC operating outside scheduled hours
    // Oct 2, 23:00 to Oct 3, 05:00 (i = 47 to 53)
    if (i >= 47 && i <= 53) {
      anomaly_flag = true;
      anomaly_type = "HVAC_OFF_HOURS_OVERRUN";
      subsystem = "HVAC";
      const hvacExcess = 62.5 + gaussianNoise(0, 2.0);
      actual_kwh = Number((baseline_kwh + hvacExcess).toFixed(2));
      occupancy = 0;
      evidence = `Observed: AHU-1 fan at 100%, CHW pump delta-T 5.8C, occupancy 0, TH-101 OVERRIDE_ACTIVE=TRUE (18.0C). Hypothesis: manual off-hours override (correlation noted, physical root cause unconfirmed). [Ref: EVID-ANOM-01; Simulated Demo Data]`;
    }
    // ANOMALY 2: Lighting left on in unoccupied area
    // Oct 4, 01:00 to Oct 4, 07:00 (i = 73 to 79, Sunday overnight)
    else if (i >= 73 && i <= 79) {
      anomaly_flag = true;
      anomaly_type = "UNOCCUPIED_LIGHTING_OVERNIGHT";
      subsystem = "LIGHTING";
      const lightingExcess = 22.8 + gaussianNoise(0, 1.1);
      actual_kwh = Number((baseline_kwh + lightingExcess).toFixed(2));
      occupancy = 0;
      evidence = `Observed: Lighting sub-meter draw steady at 22.8 kW, PIR occupancy 0, facility locked/armed, LCP-03 relays CLOSED_MANUAL. Hypothesis: custodial override bypass (correlation noted, relay weld unconfirmed). [Ref: EVID-ANOM-02; Simulated Demo Data]`;
    }
    // ANOMALY 3: Unused equipment remaining active after hours
    // Oct 5, 20:00 to Oct 6, 04:00 (i = 116 to 124, Monday night into Tuesday morning)
    else if (i >= 116 && i <= 124) {
      anomaly_flag = true;
      anomaly_type = "AFTER_HOURS_EQUIPMENT_DRAIN";
      subsystem = "PLUG_LOAD";
      const plugExcess = 28.4 + gaussianNoise(0, 1.3);
      actual_kwh = Number((baseline_kwh + plugExcess).toFixed(2));
      if (hour >= 21) occupancy = 0;
      evidence = `Observed: Lab 202 sub-panel drawing 28.5 kW, 0 AD sessions after 19:45, 40 Ethernet links up @ 1Gbps, 3 3D beds @ 60C. Hypothesis: workstations idle with sleep disabled (correlation noted, batch render unverified). [Ref: EVID-ANOM-03; Simulated Demo Data]`;
    } else {
      // Normal variation
      actual_kwh = Number(Math.max(10, baseline_kwh + gaussianNoise(0, 0.8)).toFixed(2));
      expected_kwh = baseline_kwh;
      if (occupancy === 0) {
        subsystem = "BASELOAD";
        evidence = "Building unoccupied; baseline standby loads (network, server closet, security lighting) operating nominally.";
      } else if (hour >= 8 && hour < 18) {
        subsystem = "MIXED";
        evidence = `Standard operational hours; occupancy count ${occupancy}; HVAC, lighting, and plug loads running on normal automated day schedules.`;
      } else {
        subsystem = "MIXED";
        evidence = `Evening ramp-down period; occupancy count ${occupancy}; partial zone scheduling active.`;
      }
    }
  } 
  // WEEK 2: Interventions Deployed
  else {
    // Interventions:
    // 1. HVAC Scheduling: automated setback during unoccupied hours (21:00 to 06:00 saves ~18 kWh/hr; day economizer saves ~6 kWh/hr)
    // 2. Lighting Optimization: automated daylight harvesting & occupancy timeout sweeps (saves ~11 kWh/hr night, ~7 kWh/hr day)
    // 3. Unused Equipment Shutdown: forced workstation sleep & smart strip shutdown (saves ~14 kWh/hr night)

    let hvacSavingsPred = 0;
    let lightSavingsPred = 0;
    let plugSavingsPred = 0;

    let hvacSavingsActual = 0;
    let lightSavingsActual = 0;
    let plugSavingsActual = 0;

    if (hour >= 21 || hour < 6) {
      // Unoccupied night hours
      hvacSavingsPred = 17.5;
      hvacSavingsActual = 17.2 + gaussianNoise(0, 0.6);

      lightSavingsPred = 10.5;
      lightSavingsActual = 10.2 + gaussianNoise(0, 0.4);

      plugSavingsPred = 13.5;
      plugSavingsActual = 13.1 + gaussianNoise(0, 0.5);

      evidence = `Interventions active: HVAC nighttime setback (temperature reset to 24°C cooling/16°C heating, AHU fan speed 25%), automated lighting sweep (0 off-hours illuminance), and centralized workstation sleep enforcement.`;
    } else if (hour >= 6 && hour < 9) {
      // Morning ramp
      hvacSavingsPred = 8.0;
      hvacSavingsActual = 7.7 + gaussianNoise(0, 0.5);

      lightSavingsPred = 5.0;
      lightSavingsActual = 4.8 + gaussianNoise(0, 0.3);

      plugSavingsPred = 4.0;
      plugSavingsActual = 3.9 + gaussianNoise(0, 0.3);

      evidence = `Interventions active: HVAC staged morning ramp-up avoiding coincident peak, daylight harvesting sensors active on East perimeter.`;
    } else if (hour >= 9 && hour < 18) {
      // Peak day hours
      hvacSavingsPred = 12.0;
      hvacSavingsActual = 11.5 + gaussianNoise(0, 0.8);

      lightSavingsPred = 7.5;
      lightSavingsActual = 7.2 + gaussianNoise(0, 0.4);

      plugSavingsPred = 5.0;
      plugSavingsActual = 4.9 + gaussianNoise(0, 0.4);

      evidence = `Interventions active: Optimal HVAC chilled water reset, active daylight dimming in classrooms, and automated sleep timer for idle lab terminals.`;
    } else {
      // Evening 18 to 21
      hvacSavingsPred = 12.0;
      hvacSavingsActual = 11.8 + gaussianNoise(0, 0.6);

      lightSavingsPred = 8.0;
      lightSavingsActual = 7.9 + gaussianNoise(0, 0.4);

      plugSavingsPred = 9.0;
      plugSavingsActual = 8.7 + gaussianNoise(0, 0.4);

      evidence = `Interventions active: Zonal occupancy setback; unreserved classrooms switched to eco-mode; smart plug strips powered down at 20:00.`;
    }

    const totalPredictedReduction = hvacSavingsPred + lightSavingsPred + plugSavingsPred;
    const totalObservedReduction = Math.max(0, hvacSavingsActual + lightSavingsActual + plugSavingsActual);

    expected_kwh = Number(Math.max(12, baseline_kwh - totalPredictedReduction).toFixed(2));
    actual_kwh = Number(Math.max(12, baseline_kwh - totalObservedReduction).toFixed(2));
    anomaly_flag = false;
    anomaly_type = "NONE";
    subsystem = "ALL_SYSTEMS_OPTIMIZED";
  }

  // Ensure non-negative and consistent
  actual_kwh = Math.max(0.01, actual_kwh);
  expected_kwh = Math.max(0.01, expected_kwh);
  baseline_kwh = Math.max(0.01, baseline_kwh);

  records.push({
    building_id: BUILDING_ID,
    timestamp: isoTime,
    kwh: actual_kwh,
    actual_kwh: actual_kwh,
    expected_kwh: expected_kwh,
    baseline_kwh: baseline_kwh,
    subsystem: subsystem,
    occupancy_count: occupancy,
    outdoor_temp_c: outdoorTemp,
    anomaly_flag: anomaly_flag,
    anomaly_type: anomaly_type,
    intervention_active: intervention_active,
    evidence: evidence
  });
}

// Generate CSV string
const headers = [
  "building_id",
  "timestamp",
  "kwh",
  "actual_kwh",
  "expected_kwh",
  "baseline_kwh",
  "subsystem",
  "occupancy_count",
  "outdoor_temp_c",
  "anomaly_flag",
  "anomaly_type",
  "intervention_active",
  "evidence"
];

function escapeCsv(val) {
  if (typeof val === 'string') {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
  }
  return val;
}

const csvRows = [headers.join(',')];
for (const r of records) {
  csvRows.push(headers.map(h => escapeCsv(r[h])).join(','));
}
const csvContent = csvRows.join('\n');

// Write CSV
fs.writeFileSync(path.join(DATA_DIR, 'synthetic_building_a_energy.csv'), csvContent, 'utf-8');

// Summary statistics for JSON output and verification
const week1Records = records.slice(0, 168);
const week2Records = records.slice(168, 336);

const sum = (arr, key) => arr.reduce((acc, curr) => acc + curr[key], 0);

const week1_actual = sum(week1Records, 'actual_kwh');
const week1_baseline = sum(week1Records, 'baseline_kwh');
const week2_actual = sum(week2Records, 'actual_kwh');
const week2_expected = sum(week2Records, 'expected_kwh');
const week2_baseline = sum(week2Records, 'baseline_kwh');

const actual_savings_week2 = week2_baseline - week2_actual;
const predicted_savings_week2 = week2_baseline - week2_expected;
const savings_pct_actual = (actual_savings_week2 / week2_baseline) * 100;
const savings_pct_predicted = (predicted_savings_week2 / week2_baseline) * 100;
const model_variance_kwh = actual_savings_week2 - predicted_savings_week2;
const model_variance_pct = (model_variance_kwh / predicted_savings_week2) * 100;

// Emissions & Cost assumptions:
// Grid emission factor: 0.385 kg CO2e / kWh (US campus average blend)
// Electricity tariff: $0.12 / kWh (Standard commercial institutional rate)
const carbon_saved_kg = actual_savings_week2 * 0.385;
const cost_saved_usd = actual_savings_week2 * 0.12;

const datasetJson = {
  metadata: {
    project: "ECOLOOP - Campus Energy Intelligence & Decarbonization",
    dataset_name: "Synthetic Campus Building Energy Dataset - Building A",
    dataset_version: "1.0.0",
    data_classification: "SYNTHETIC_DEMO_DATA",
    disclaimer: "NOTICE: All data points, measurements, equipment telemetry, and diagnostic logs in this dataset are 100% synthetically generated for hackathon prototyping and algorithmic demonstration purposes. No real campus or DSU facility measurements are represented.",
    facility_profile: {
      building_id: "BUILDING_A",
      building_name: "Science & Engineering Hall (Fictional)",
      use_type: "Classrooms, Academic Laboratories, Computer Labs, Faculty Offices",
      gross_floor_area_sqft: 45000,
      baseline_peak_occupancy: 240,
      primary_hvac_system: "VAV with central AHU-1 & chilled water loop",
      measurement_interval: "1 hour (60 minutes)",
      unit_of_energy: "kWh (kilowatt-hour)",
      total_records: records.length,
      time_coverage_utc: {
        start: records[0].timestamp,
        end: records[records.length - 1].timestamp,
        duration_days: 14
      }
    },
    shared_schema_fields: [
      "building_id",
      "timestamp",
      "kwh",
      "actual_kwh",
      "expected_kwh",
      "baseline_kwh",
      "evidence"
    ]
  },
  validation_and_kpis: {
    week1_pre_intervention: {
      timeframe: "2026-10-01T00:00:00Z to 2026-10-07T23:00:00Z",
      status: "Baseline Operations with 3 Detected Operational Anomalies",
      total_actual_kwh: Number(week1_actual.toFixed(2)),
      total_baseline_kwh: Number(week1_baseline.toFixed(2)),
      anomaly_waste_kwh: Number((week1_actual - week1_baseline).toFixed(2)),
      anomalies_detected: [
        {
          id: "ANOMALY-001",
          type: "HVAC_OFF_HOURS_OVERRUN",
          subsystem: "HVAC",
          time_range: "2026-10-02T23:00:00Z to 2026-10-03T05:00:00Z",
          duration_hours: 7,
          excess_kwh: 437.8,
          hypothesis: "Thermostat manual override left locked at 18.0°C in lecture hall 101, forcing AHU-1 and chilled water pumps to run at 100% full cooling load overnight despite 0 occupancy and mild outdoor temperature (13.5°C)."
        },
        {
          id: "ANOMALY-002",
          type: "UNOCCUPIED_LIGHTING_OVERNIGHT",
          subsystem: "LIGHTING",
          time_range: "2026-10-04T01:00:00Z to 2026-10-04T07:00:00Z",
          duration_hours: 7,
          excess_kwh: 159.2,
          hypothesis: "Atrium high-bay and 3rd-floor classroom lighting circuits remained 100% illuminated overnight on Sunday morning due to custodial override switch bypass while building was locked and unoccupied."
        },
        {
          id: "ANOMALY-003",
          type: "AFTER_HOURS_EQUIPMENT_DRAIN",
          subsystem: "PLUG_LOAD",
          time_range: "2026-10-05T20:00:00Z to 2026-10-06T04:00:00Z",
          duration_hours: 9,
          excess_kwh: 255.4,
          hypothesis: "40 GPU-enabled computer lab workstations in Room 202 remained powered in high-performance mode with operating system sleep disabled, along with 3 idle laser cutter fume extractors running after student hours."
        }
      ]
    },
    week2_post_intervention: {
      timeframe: "2026-10-08T00:00:00Z to 2026-10-14T23:00:00Z",
      status: "Optimized Operations under 3 Automated ECOLOOP Interventions",
      total_baseline_kwh: Number(week2_baseline.toFixed(2)),
      total_predicted_kwh: Number(week2_expected.toFixed(2)),
      total_actual_kwh: Number(week2_actual.toFixed(2)),
      savings: {
        predicted_savings_kwh: Number(predicted_savings_week2.toFixed(2)),
        predicted_savings_pct: Number(savings_pct_predicted.toFixed(2)),
        observed_savings_kwh: Number(actual_savings_week2.toFixed(2)),
        observed_savings_pct: Number(savings_pct_actual.toFixed(2)),
        model_variance_kwh: Number(model_variance_kwh.toFixed(2)),
        model_variance_pct: Number(model_variance_pct.toFixed(2)),
        estimated_carbon_avoided_kg_co2e: Number(carbon_saved_kg.toFixed(2)),
        estimated_cost_saved_usd: Number(cost_saved_usd.toFixed(2))
      }
    }
  },
  records: records
};

// Write full JSON
fs.writeFileSync(path.join(DATA_DIR, 'synthetic_building_a_energy.json'), JSON.stringify(datasetJson, null, 2), 'utf-8');

// Write Interventions and Savings JSON for direct use in dashboards & cards
const interventionsSummary = {
  project: "ECOLOOP",
  disclaimer: "SYNTHETIC DEMO DATA - Generated for Hackathon Prototype Demonstration",
  building_id: "BUILDING_A",
  interventions: [
    {
      id: "INT-HVAC-01",
      name: "Automated HVAC Setback & Schedule Optimization",
      category: "HVAC",
      description: "Automated BMS setback enforcing 24.0°C cooling / 16.0°C heating during unoccupied hours (21:00-06:00), dynamic static pressure reset, and locked digital thermostat setpoint ranges to eliminate unauthorized overrides.",
      baseline_weekly_subsystem_kwh: 5820.0,
      predicted_reduction_kwh: 2210.0,
      predicted_reduction_pct: 38.0,
      observed_reduction_kwh: 2168.4,
      observed_reduction_pct: 37.3,
      variance_pct: -1.9,
      avoided_emissions_kg_co2e: Number((2168.4 * 0.385).toFixed(1)),
      cost_savings_usd: Number((2168.4 * 0.12).toFixed(2))
    },
    {
      id: "INT-LIGHT-02",
      name: "Occupancy-Based Lighting Sweeps & Perimeter Daylight Harvesting",
      category: "LIGHTING",
      description: "Deployment of 15-minute PIR vacancy timeout logic, automated circuit sweep at 20:30, and photo-sensor daylight dimming for south/east perimeter classroom zones.",
      baseline_weekly_subsystem_kwh: 2940.0,
      predicted_reduction_kwh: 1350.0,
      predicted_reduction_pct: 45.9,
      observed_reduction_kwh: 1318.2,
      observed_reduction_pct: 44.8,
      variance_pct: -2.4,
      avoided_emissions_kg_co2e: Number((1318.2 * 0.385).toFixed(1)),
      cost_savings_usd: Number((1318.2 * 0.12).toFixed(2))
    },
    {
      id: "INT-PLUG-03",
      name: "Smart Plug-Load Management & Centralized Workstation Power Policies",
      category: "PLUG_LOAD",
      description: "Active Directory power policy enforcing S3 sleep mode after 15 minutes of inactivity in student computer labs, paired with smart scheduled relay power strips for lab benches and peripheral equipment shutoff at 20:00.",
      baseline_weekly_subsystem_kwh: 3180.0,
      predicted_reduction_kwh: 1520.0,
      predicted_reduction_pct: 47.8,
      observed_reduction_kwh: 1482.6,
      observed_reduction_pct: 46.6,
      variance_pct: -2.5,
      avoided_emissions_kg_co2e: Number((1482.6 * 0.385).toFixed(1)),
      cost_savings_usd: Number((1482.6 * 0.12).toFixed(2))
    }
  ],
  aggregate_comparison: {
    comparison_period: "Pre-Intervention Week (Oct 01 - Oct 07) vs Post-Intervention Week (Oct 08 - Oct 14)",
    baseline_energy_kwh: Number(week2_baseline.toFixed(2)),
    predicted_energy_kwh: Number(week2_expected.toFixed(2)),
    observed_energy_kwh: Number(week2_actual.toFixed(2)),
    total_predicted_savings_kwh: Number(predicted_savings_week2.toFixed(2)),
    total_observed_savings_kwh: Number(actual_savings_week2.toFixed(2)),
    overall_energy_reduction_pct: Number(savings_pct_actual.toFixed(2)),
    total_emissions_avoided_kg_co2e: Number(carbon_saved_kg.toFixed(2)),
    total_cost_saved_usd: Number(cost_saved_usd.toFixed(2))
  }
};

fs.writeFileSync(path.join(DATA_DIR, 'interventions_summary.json'), JSON.stringify(interventionsSummary, null, 2), 'utf-8');

console.log("Successfully generated:");
console.log("- data/synthetic_building_a_energy.csv (" + records.length + " rows)");
console.log("- data/synthetic_building_a_energy.json");
console.log("- data/interventions_summary.json");
console.log("Week 1 Actual kWh:", week1_actual.toFixed(2));
console.log("Week 2 Baseline kWh:", week2_baseline.toFixed(2));
console.log("Week 2 Actual kWh:", week2_actual.toFixed(2));
console.log("Week 2 Observed Savings:", actual_savings_week2.toFixed(2), "kWh (" + savings_pct_actual.toFixed(2) + "%)");
