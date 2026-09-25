# GREEN EDEN — GREENER
## Engineering README / Product Context

Greener is a farm monitoring and soil-condition monitoring system built under Green Eden.

## 1. System Overview

The system combines physical field hardware with cloud software:

- ESP32 controller
- SIM800L cellular modem
- Four-in-one soil probe
- Rechargeable battery
- Weatherproof enclosure
- Device ingestion API
- Database
- Rules/alert engine
- Authentication and role-based access control
- Web dashboard
- Notifications

High-level data flow:

SOIL PROBE → ESP32 → SIM800L / GPRS → SECURE INGESTION API → APPLICATION SERVER → DATABASE → RULES / ALERT ENGINE → GREENER WEB DASHBOARD → USERS + NOTIFICATIONS

The dashboard does not read the soil sensor directly. Field devices communicate with the cloud ingestion service, and the dashboard consumes normalized application data.

## 2. Current Development Stage

The Greener UI was initially generated with v0.

Antigravity is now responsible for taking the existing UI and implementing the actual application locally.

Preserve the existing visual design. Do not redesign the application from scratch.

Development should move from:

Existing v0 UI → real routes → real application state → database → API → authentication → RBAC → device ingestion → readings → rules engine → alerts → notifications.

Build incrementally. Do not connect physical ESP32 hardware as the first implementation step. First make the software work with simulated/test device data.

## 3. Product Modules

Primary modules:

- Overview
- Farms
- Farm Detail
- Devices
- Device Detail
- Readings
- Alerts
- Alert Detail
- Users
- Settings

There is also a global notification center in the top navigation.

## 4. Overview

Route: `/overview`

Purpose: give the user an immediate operational picture of farms, devices, readings and alerts.

Main areas:

### Summary
- Active devices
- Offline devices
- Open alerts
- Low-battery nodes

### Farm/device map
Device markers communicate:
- Normal
- Warning
- Critical
- Offline

### Latest readings
Show:
- Farm
- Plot
- Device
- Soil moisture
- Soil temperature
- pH
- EC
- Last update

### Moisture trend
Show a seven-day historical moisture trend.

### Recent alerts
Show recent alerts ordered by severity and time.

Dashboard statistics must eventually come from the backend/database. Do not permanently hard-code dashboard statistics.

## 5. Farms

Route: `/farms`

Purpose: manage farms and their plots.

Core relationship:

Organization → Farm → Plot → Device → Readings

Farm contains:
- id
- name
- location
- owner
- plots
- devices

Plot contains:
- id
- farm_id
- name
- crop
- soil profile
- planting date
- threshold configuration

Farm and Plot are separate entities.

## 6. Farm Detail

Route: `/farms/:farmId`

Include:

### Farm information
- Name
- Location
- Owner
- Plots

### Plot information
- Crop
- Soil profile
- Planting date
- Configured thresholds

### Device status
Show devices assigned to the farm/plot.

### Current sensor readings
- Soil moisture
- Soil temperature
- pH
- Electrical conductivity

### Historical charts
Allow:
- Date range selection
- Parameter selection
- Parameter comparison

### Alert history
Show alerts associated with the farm/plot.

### Export
Allow readings to be exported as CSV.

## 7. Devices

Route: `/devices`

Each Device represents a physical Greener field node.

Device information:
- device_id
- farm_id
- plot_id
- SIM information
- firmware
- battery
- signal
- status
- last_seen
- configuration

Example device: `SG-JOS-001`

Show:
- Status
- Battery
- Signal
- Firmware
- Last seen
- Farm
- Plot

## 8. Device Status Logic

Device status should eventually be derived from telemetry.

Conceptually:

latest accepted reading → last_seen → current time → configured offline threshold → ONLINE / OFFLINE

A device becomes offline when:

`current_time - last_accepted_reading > configured offline window`

The Device Offline alert is generated when no accepted record arrives within the configured offline window.

## 9. Readings

Route: `/readings`

Primary measurements:

- `moisture_pct`
- `soil_temp_c`
- `ph`
- `ec_us_cm`

Device telemetry also includes:
- `battery_v`
- `signal_dbm`
- `firmware`

Each reading contains:
- `device_id`
- `sequence`
- `measured_at`
- `status_flags`

Example:

```json
{
  "device_id": "SG-JOS-001",
  "sequence": 1842,
  "measured_at": "2026-09-12T12:00:00Z",
  "moisture_pct": 31.4,
  "soil_temp_c": 24.8,
  "ph": 6.3,
  "ec_us_cm": 840,
  "battery_v": 3.92,
  "signal_dbm": -83,
  "firmware": "1.0.0",
  "status_flags": []
}
```

## 10. Reading Time vs Server Time

`measured_at` represents when the device actually measured the soil.

The server may receive the reading later.

Therefore:

`measured_at != received_at`

Both timestamps should eventually be stored.

Example:

Device measures at 12:00.
Network unavailable.
Device reconnects at 12:20.
Server receives at 12:21.

The measurement still belongs to 12:00.

Historical charts must use the original measurement timestamp.

## 11. Sequence Numbers

Every device reading has a sequence number.

Example:

1841 → 1842 → 1843 → 1844

Sequence numbers help with:
- ordering
- duplicate detection
- synchronization
- offline buffering

The server must not insert the same device sequence twice.

## 12. Alert Engine

Alerts are generated by the rules engine, not directly by frontend components.

Supported alert types:

- `LOW_SOIL_MOISTURE`
- `HIGH_SOIL_TEMPERATURE`
- `PH_OUT_OF_RANGE`
- `HIGH_EC`
- `LOW_BATTERY`
- `DEVICE_OFFLINE`
- `SENSOR_FAULT`

The alert engine evaluates incoming readings and device state.

## 13. Configurable Thresholds

Do not hard-code universal agricultural thresholds.

Avoid:

```javascript
if (ph < 5) {
  createAlert();
}
```

Instead:

Farm → Plot → Crop Profile → Configured Thresholds → Rules Engine → Alert

Threshold configuration should support:
- moisture minimum
- moisture maximum where applicable
- soil temperature maximum
- pH minimum
- pH maximum
- EC maximum
- persistence duration
- severity

Thresholds depend on the farm, crop profile and field conditions.

## 14. Alert Persistence

Do not create an alert immediately every time one reading crosses a threshold.

Intended logic:

Reading → Evaluate threshold → Condition violated? → Has it persisted long enough? → Yes → Create alert

The persistence period prevents nuisance alarms.

## 15. Alert Lifecycle

Alerts use:

`OPEN → ACKNOWLEDGED → RESOLVED`

### OPEN
The condition has triggered an alert.

### ACKNOWLEDGED
An authorized user has seen the alert and recorded a response/planned action.

### RESOLVED
The condition has recovered or an authorized user has resolved it with a note.

Keep the complete history. Do not simply overwrite the status without recording state changes.

## 16. Alert Recovery

Example:

Configured moisture threshold = 25%

Reading = 21%
→ condition persists
→ OPEN alert

Later:

Reading = 27%
→ condition recovered
→ alert can be resolved automatically

Where appropriate, distinguish:

`resolved_by = system`

from:

`resolved_by = user`

## 17. Notifications

Notifications are different from Alerts.

### Alert
A persistent operational record.

### Notification
A lightweight event telling the user that something happened.

Example alert:

Low Soil Moisture  
Green Eden Farm / Plot A1  
Status: OPEN

Example notification:

Low soil moisture detected  
Green Eden Farm · Plot A1  
12 minutes ago

Notification types may include:
- Low soil moisture
- High soil temperature
- pH outside configured range
- High EC
- Low battery
- Device offline
- Sensor fault
- Alert acknowledged
- Alert resolved

The global notification bell in the top navigation should show recent notifications.

Clicking a notification should navigate to the relevant alert, device or farm.

## 18. Users and RBAC

Users belong to an organization.

Roles:
- Administrator
- Farm Manager
- Agronomist
- Technician
- Viewer

### Administrator
Can manage:
- Organizations
- Users
- Farms
- Devices
- System settings

### Farm Manager
Can:
- View assigned farms
- Change plot thresholds
- Manage alerts

### Agronomist
Can:
- View readings
- View trends
- View alerts
- Add agronomic notes

### Technician
Can:
- Provision devices
- View diagnostics
- Update configuration

### Viewer
Can:
- Read dashboards
- Read reports
- Cannot change settings

RBAC must eventually be enforced in the backend, not only by hiding frontend buttons.

## 19. Settings

Settings are functional system configuration.

### Thresholds
- Moisture
- Temperature
- pH
- EC
- Persistence

### Device configuration
- Measurement interval
- Upload interval
- Offline window
- Retry count
- Time synchronization

### Notifications
Which events generate dashboard notifications.

Settings should influence actual backend behavior once the backend is implemented.

## 20. Database Model

Core entities:

- Organization
- User
- Farm
- Plot
- Device
- Reading
- Alert
- Configuration
- AuditLog

Relationship:

Organization
├── Users
└── Farms
    └── Plots
        └── Devices
            └── Readings
                └── Alerts

Configuration should support the relevant organization/farm/plot/device settings.

## 21. Audit Log

Important actions should eventually create audit records.

Examples:
- User logged in
- User invited another user
- User changed threshold
- User acknowledged alert
- User resolved alert
- Admin changed device configuration
- Device provisioned
- Device revoked

Audit logs should retain:
- who performed the action
- what happened
- when it happened
- relevant entity/context

## 22. Device Ingestion API

Eventually the ESP32 will communicate with the backend.

Conceptually:

`POST /api/device/readings`

Payload:

```json
{
  "device_id": "SG-JOS-001",
  "sequence": 1842,
  "measured_at": "2026-09-12T12:00:00Z",
  "moisture_pct": 31.4,
  "soil_temp_c": 24.8,
  "ph": 6.3,
  "ec_us_cm": 840,
  "battery_v": 3.92,
  "signal_dbm": -83,
  "firmware": "1.0.0",
  "status_flags": []
}
```

Backend flow:

authenticate device
→ validate payload
→ validate measurements
→ check sequence/duplicates
→ store reading
→ update device state
→ evaluate alert rules
→ create/update alerts
→ create notifications where configured
→ return acknowledgement

## 23. Sensor Validation

Do not blindly trust every sensor value.

Validation should detect:
- Impossible values
- Missing values
- Sudden unexplained changes
- Disconnected probe

Invalid values should become diagnostic information.

They should not automatically replace the last trusted dashboard reading.

The last-known-good reading should remain available when a new value is invalid.

## 24. Offline Device Logic

### Device side

Eventually:

READ → VALIDATE → QUEUE LOCALLY → WAIT WHEN NETWORK UNAVAILABLE

When connectivity returns:

OLDEST QUEUED RECORD → UPLOAD → SERVER ACK → REMOVE FROM QUEUE → NEXT RECORD

Queued records must retain their original measurement timestamps.

### Cloud side

Backend determines whether a device has stopped reporting:

NOW - LAST_ACCEPTED_READING
→ configured offline window
→ DEVICE OFFLINE

## 25. Security

Production architecture should include:

- Authentication
- Role-based access control
- Strong password hashing
- Session expiry
- Account lockout
- HTTPS
- Device authentication
- Device secret rotation
- Device revocation
- Audit logging

For local development, structure the application so these can be implemented properly. Frontend-only controls are not security.

## 26. Simulated Device System

Before physical hardware is connected, build a device simulator.

Example devices:
- SG-JOS-001
- SG-JOS-002
- SG-JOS-003

The simulator should generate:
- `moisture_pct`
- `soil_temp_c`
- `ph`
- `ec_us_cm`
- `battery_v`
- `signal_dbm`

and send them through the same ingestion API that the actual ESP32 will eventually use.

Target flow:

SIMULATED DEVICE
→ REAL API
→ REAL DATABASE
→ REAL RULES ENGINE
→ REAL ALERTS
→ REAL DASHBOARD

When the ESP32 is ready, the simulator can be replaced by the physical device.

## 27. Frontend Architecture

The frontend should become a consumer of backend state.

Avoid:

React component → hardcoded mock array

Prefer:

React UI → API/service layer → backend → database

Examples:

Overview → dashboard summary API → database

Readings → readings API → database

Alerts → alerts API → database

Devices → devices API → database

The frontend should not contain core business rules.

## 28. Business Logic Must Not Live in React Components

Avoid:

```tsx
if (reading.moisture < 20) {
  createAlert();
}
```

inside a dashboard component.

Instead:

Rules Engine
→ evaluateReading()
→ Alert Service
→ Database

React should display the result produced by the backend/application services.

## 29. Recommended Implementation Order

### PHASE 1 — FOUNDATION
- Inspect existing v0 code
- Identify current framework
- Identify routes/components
- Choose application architecture
- Set up environment/configuration
- Database schema
- Authentication
- RBAC

### PHASE 2 — CORE ENTITIES
- Organizations
- Farms
- Plots
- Devices

### PHASE 3 — READINGS
- Reading database model
- Reading API
- Device ingestion endpoint
- Simulated device data
- Historical readings
- Reading queries/filtering

### PHASE 4 — RULES
- Threshold configuration
- Reading validation
- Persistence logic
- Rules engine
- Alert creation
- Alert lifecycle
- Alert recovery

### PHASE 5 — NOTIFICATIONS
- Notification model
- Notification service
- Notification center
- Read/unread state
- Alert-to-notification flow
- Audit logs

### PHASE 6 — HARDWARE
- ESP32
- SIM800L
- Actual soil probe
- Device authentication
- Real device ingestion
- Offline buffering
- Retry behavior
- Configuration synchronization

## 30. Important Things Not To Do

Do not:
- Redesign the existing UI
- Replace the existing Greener visual language
- Invent agricultural metrics
- Invent farm-health scores
- Hard-code universal soil thresholds
- Put alert logic inside React components
- Permanently rely on mock frontend arrays
- Make the dashboard communicate directly with hardware
- Assume every device is always online
- Discard delayed/offline readings
- Overwrite historical readings
- Silently replace invalid readings
- Use color alone to communicate severity
- Create fake backend success states
- Label soil as “toxic”, “dangerous”, “bad”, etc. based only on these measurements

Greener should describe measured conditions precisely.

Agronomic recommendations should be tied to defined crop profiles and confirmed field practice.

## 31. Complete System

GREEN EDEN
└── GREENER
    │
    ├── HARDWARE
    │   ├── ESP32
    │   ├── SIM800L
    │   ├── Soil Probe
    │   ├── Battery
    │   └── Enclosure
    │
    └── SOFTWARE
        ├── Web Dashboard
        ├── Authentication
        ├── RBAC
        ├── Organizations
        ├── Farms
        ├── Plots
        ├── Devices
        ├── Readings
        ├── Rules Engine
        ├── Alerts
        ├── Notifications
        ├── Settings
        └── Audit Logs

Core data flow:

SOIL PROBE
→ ESP32
→ SIM800L
→ INGESTION API
→ DATABASE
→ RULES ENGINE
→ ALERTS
→ NOTIFICATIONS
→ DASHBOARD

## 32. Core System Loop

The core Greener loop is:

SENSE
→ VALIDATE
→ STORE
→ ANALYZE
→ ALERT
→ NOTIFY
→ ACT
→ RECORD HISTORY

This should guide the architecture.

The dashboard is the operational interface, but the real system is the complete pipeline from field measurement to stored data, rule evaluation, alerting, notification and historical record.

## 33. Engineering Principle

Build Greener so that the UI is not the system.

The UI is a client of the system.

The real system consists of:

- Trusted data ingestion
- Persistent historical readings
- Device state
- Configurable thresholds
- Rules evaluation
- Alert lifecycle
- Notifications
- Role-based permissions
- Audit history
- Reliable synchronization

The architecture should allow simulated devices today and physical ESP32 devices later without redesigning the backend.
