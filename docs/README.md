# Lab 4 requirement coverage
Based on the uploaded Laboratory 4 Section A handout: roles, Pending/Approved/Rejected/Released/Returned/Overdue/Closed workflow, BR-A4-01..10, audit_logs, adaptive navigation, and TC-A4-01..10.

## Updated ERD

The official ERD for this project is the Supabase-generated database diagram shown in the submitted screenshot. It contains the following tables: `profiles`, `equipment`, `borrowing_requests`, `maintenance_requests`, and `audit_logs`. The `profiles.id` field references `auth.users.id`.

### ERD Relationship Reference

| Relationship | Description |
|---|---|
| `auth.users.id` → `profiles.id` | Each authenticated user has one application profile. |
| `profiles.id` → `borrowing_requests.requester_id` | A profile can create borrowing requests. |
| `profiles.id` → `borrowing_requests.reviewed_by` | An administrator can review borrowing requests. |
| `profiles.id` → `maintenance_requests.requester_id` | A profile can submit maintenance requests. |
| `profiles.id` → `audit_logs.user_id` | Actions are recorded against the user who performed them. |
| `equipment.id` → `borrowing_requests.equipment_id` | Each borrowing request is for one equipment item. |
| `equipment.id` → `maintenance_requests.equipment_id` | Each maintenance request belongs to one equipment item. |

> **Submitted ERD image:** The ERD image below is the visual documentation of the Supabase schema shown in the submitted database diagram.

![Updated AssetFlow ERD](erd.svg)

The Mermaid diagram below is the readable documentation version of the same schema.

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
	}
	BORROWING_REQUESTS {
		bigint id PK
		bigint equipment_id FK
		uuid requester_id FK
		uuid reviewed_by FK
		text purpose
		request_status status
		timestamptz start_at
		timestamptz expected_return_at
	}
	MAINTENANCE_REQUESTS {
		bigint id PK
		bigint equipment_id FK
		uuid requester_id FK
		text description
		maintenance_status status
	}
	AUDIT_LOGS {
		bigint id PK
		uuid user_id FK
		text action
		text module
		bigint record_id
		text description
	}
```

# Use Case Diagram

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
	Requester --> R1[View equipment]
	Requester --> R2[Create borrowing transaction]
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

# Role matrix
| Function | Admin | Laboratory Staff | Requester |
|---|---|---|---|
| Manage users/equipment | ✓ | — | — |
| View equipment | ✓ | ✓ | ✓ |
| Create borrowing transactions | ✓ | ✓ | ✓ |
| Approve/reject requests | ✓ | — | — |
| Process returns | ✓ | ✓ | — |
| Submit maintenance requests | ✓ | ✓ | — |
| Update permitted workflow records | ✓ | ✓ | — |
| Manage maintenance status | ✓ | — | — |
| View reports/audit logs | ✓ | — | — |

# Workflow
Pending → Approved/Rejected → Released → Returned → Closed; Overdue may occur after release.
