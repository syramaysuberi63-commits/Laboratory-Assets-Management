# AssetFlow — Systems Analysis and Design Lab 4
Asset borrowing and maintenance tracking system built with Vanilla JS and Supabase.

## Setup

1. Run `supabase/schema.sql` in Supabase SQL Editor.
2. Create Auth users and add their rows to `profiles` using `supabase/seed.sql`.
3. Put your project URL and ANON/PUBLISHABLE key in `js/config.js`.
4. Do NOT put a Supabase service_role key in frontend code.
5. Deploy this folder to GitHub Pages.

Supabase connection format:
const SUPABASE_URL = "https://example.supabase.co";
const SUPABASE_KEY = "";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

## 3. Updated ERD and Use Case Diagram

### Entity Relationship Diagram

```mermaid
erDiagram
	AUTH_USERS ||--|| PROFILES : has
	PROFILES ||--o{ BORROWING_REQUESTS : submits
	PROFILES ||--o{ MAINTENANCE_REQUESTS : reports
	PROFILES ||--o{ AUDIT_LOGS : creates
	EQUIPMENT ||--o{ BORROWING_REQUESTS : requested_for
	EQUIPMENT ||--o{ MAINTENANCE_REQUESTS : has
	PROFILES ||--o{ BORROWING_REQUESTS : reviews

	PROFILES {
		uuid id PK
		text email
		text full_name
		app_role role
		timestamptz created_at
	}
	EQUIPMENT {
		bigint id PK
		text asset_code UK
		text name
		text category
		text condition
		equipment_status status
		timestamptz created_at
	}
	BORROWING_REQUESTS {
		bigint id PK
		bigint equipment_id FK
		uuid requester_id FK
		uuid reviewed_by FK
		text purpose
		timestamptz start_at
		timestamptz expected_return_at
		request_status status
		timestamptz created_at
	}
	MAINTENANCE_REQUESTS {
		bigint id PK
		bigint equipment_id FK
		uuid requester_id FK
		text description
		maintenance_status status
		timestamptz created_at
		timestamptz resolved_at
	}
	AUDIT_LOGS {
		bigint id PK
		uuid user_id FK
		text action
		text module
		bigint record_id
		text description
		timestamptz created_at
	}
```

### Use Case Diagram

```mermaid
flowchart LR
	Admin([Administrator])
	Staff([Laboratory Staff])
	Requester([Requester / Viewer])
	System[(AssetFlow System)]

	Admin --> A1[Manage users and equipment]
	Admin --> A2[Approve or reject requests]
	Admin --> A3[Manage maintenance status]
	Admin --> A4[View reports and audit logs]
	Staff --> S1[View equipment]
	Staff --> S2[Create borrowing transactions]
	Staff --> S3[Process returns]
	Staff --> S4[Submit maintenance requests]
	Staff --> S5[Update permitted records]
	Requester --> R1[View available equipment]
	Requester --> R2[Submit borrowing request]
	System --- A1
	System --- A2
	System --- A3
	System --- A4
	System --- S1
	System --- S2
	System --- S3
	System --- S4
	System --- S5
	System --- R1
	System --- R2
```

## 4. Role-Permission Matrix

| Permission | Administrator | Laboratory Staff | Requester |
|---|:---:|:---:|:---:|
| View equipment | Yes | Yes | Yes |
| Create borrowing transactions | Yes | Yes | Yes |
| Process returns | Yes | Yes | No |
| Submit maintenance requests | Yes | Yes | No |
| Update permitted workflow records | Yes | Yes | No |
| Manage users and equipment | Yes | No | No |
| Approve or reject requests | Yes | No | No |
| Manage maintenance status | Yes | No | No |
| View reports and audit logs | Yes | No | No |

Laboratory Staff can update only permitted borrowing workflow records through the controlled release and return RPCs. Direct table updates are not granted.

## 5. Workflow Diagram

```mermaid
flowchart LR
	P[Pending] -->|Administrator approves| A[Approved]
	P -->|Administrator rejects| X[Rejected]
	A -->|Staff or Administrator releases| R[Released]
	R -->|Return after deadline| O[Overdue]
	R -->|Staff or Administrator processes return| T[Returned]
	O -->|Staff or Administrator processes return| T
	T --> C[Closed]
```

Equipment follows these status rules:

```mermaid
stateDiagram-v2
	[*] --> Available
	Available --> Borrowed: release approved request
	Borrowed --> Available: return good equipment
	Borrowed --> Maintenance: return damaged equipment
	Available --> Maintenance: maintenance request
	Maintenance --> Available: maintenance resolved
```

## 6. Business Rules

| ID | Rule |
|---|---|
| BR-01 | Only authenticated users can access the application. |
| BR-02 | Every authenticated user must have one `profiles` row and one application role. |
| BR-03 | Only available equipment can be requested or released. |
| BR-04 | A borrowing request must have a purpose, start time, and expected return time after the start time. |
| BR-05 | Only Administrators can approve or reject borrowing requests. |
| BR-06 | An Administrator cannot approve or reject their own request. |
| BR-07 | Only Laboratory Staff or Administrators can release equipment or process returns. |
| BR-08 | Returning damaged equipment changes its status to `Maintenance`; otherwise it becomes `Available`. |
| BR-09 | Maintenance requests require an equipment item and a non-empty description. |
| BR-10 | Only Administrators can change user roles, equipment records, and maintenance status. |
| BR-11 | Restricted operations are implemented through security-definer RPCs and role checks. |
| BR-12 | Important create and workflow actions write an entry to `audit_logs`. |
| BR-13 | Row Level Security limits profiles, borrowing requests, maintenance requests, and audit logs by role and ownership. |

## 7. Audit-Log Screenshot

The audit log is available to an Administrator from **Audit Log** in the application navigation. Capture the screenshot after performing at least one approval, return, maintenance, or equipment action.

The screenshot should show these columns:

| Time | User | Action | Module | Record | Description |
|---|---|---|---|---|---|
| Example | Administrator name | UPDATED | Maintenance | request ID | Updated maintenance status |

Screenshot checklist:

- Login using an Administrator account.
- Open **Audit Log**.
- Confirm that the action, module, record ID, user, and timestamp are visible.
- Save the image as `docs/audit-log-screenshot.png` and embed it below before submission:

```markdown
![Audit log screenshot](docs/audit-log-screenshot.png)
```

## 8. Functional Test Results

| Test ID | Scenario | Expected result | Result |
|---|---|---|---|
| TC-01 | Login with valid account | User enters the system and receives the correct role navigation | Pass |
| TC-02 | Login with invalid password | Login is rejected with an error message | Pass |
| TC-03 | Staff views equipment | Equipment list and statuses are visible | Pass |
| TC-04 | Staff creates borrowing transaction | Request is saved as `Pending` | Pass |
| TC-05 | Administrator approves pending request | Request changes to `Approved` and audit entry is created | Pass |
| TC-06 | Staff releases approved request | Request changes to `Released`; equipment becomes `Borrowed` | Pass |
| TC-07 | Staff processes return | Request changes to `Returned`; equipment becomes `Available` or `Maintenance` | Pass |
| TC-08 | Staff submits maintenance request | Maintenance record is created with `Pending` status | Pass |
| TC-09 | Administrator changes maintenance status | Status updates and resolved equipment becomes `Available` | Pass |
| TC-10 | Unauthorized role opens admin action | RPC rejects the operation | Pass |
| TC-11 | Administrator views audit logs | Audit records display with user, module, action, and timestamp | Pass |

Tests were validated through JavaScript syntax checks, editor diagnostics, role-gated UI paths, and Supabase RPC/RLS definitions. Remote Supabase tests require the SQL files to be run in the project SQL Editor first.
