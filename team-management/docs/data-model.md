# Data Model

## Core Entities

### organizations
```sql
id: uuid PK
name: text NOT NULL
slug: text UNIQUE
created_at: timestamptz
created_by: uuid FK → profiles
```

### profiles
```sql
id: uuid PK (matches auth.users)
email: text UNIQUE NOT NULL
full_name: text
avatar_url: text
created_at: timestamptz
```

### organization_members
```sql
id: uuid PK
organization_id: uuid FK → organizations
user_id: uuid FK → profiles
roles: text[] (admin, manager, member, finance)
joined_at: timestamptz
invited_by: uuid FK → profiles
UNIQUE(organization_id, user_id)
```

## Campaign Structure

### marketing_plans
```sql
id: uuid PK
organization_id: uuid FK → organizations
name: text NOT NULL
description: text
start_date: date
end_date: date
total_budget: bigint (rupiah in cents for precision)
status: text (draft, active, completed, archived)
created_by: uuid FK → profiles
created_at: timestamptz
```

### campaigns
```sql
id: uuid PK
organization_id: uuid FK → organizations
plan_id: uuid FK → marketing_plans
name: text NOT NULL
objective: text
channel: text (website, shopee, tokopedia, tiktok, instagram, b2b, offline)
pic_id: uuid FK → profiles
start_date: date
end_date: date
allocated_budget: bigint
status: text (planned, active, paused, completed, cancelled)
created_by: uuid FK → profiles
created_at: timestamptz
```

### milestones
```sql
id: uuid PK
campaign_id: uuid FK → campaigns
name: text NOT NULL
description: text
due_date: date
status: text (pending, in_progress, completed)
order_index: int
created_at: timestamptz
```

### tasks
```sql
id: uuid PK
organization_id: uuid FK → organizations
campaign_id: uuid FK → campaigns
milestone_id: uuid FK → milestones (nullable)
title: text NOT NULL
description: text
assignee_id: uuid FK → profiles
reviewer_id: uuid FK → profiles
due_date: date
priority: text (low, medium, high, urgent)
status: text (backlog, planned, in_progress, blocked, review, done)
completed_at: timestamptz
created_by: uuid FK → profiles
created_at: timestamptz
updated_at: timestamptz
```

### task_checklists
```sql
id: uuid PK
task_id: uuid FK → tasks
title: text NOT NULL
completed: boolean DEFAULT false
completed_at: timestamptz
completed_by: uuid FK → profiles
order_index: int
```

### task_comments
```sql
id: uuid PK
task_id: uuid FK → tasks
user_id: uuid FK → profiles
content: text NOT NULL
mentions: uuid[] (mentioned user ids)
created_at: timestamptz
```

### task_attachments
```sql
id: uuid PK
task_id: uuid FK → tasks
file_name: text NOT NULL
file_path: text NOT NULL (Supabase Storage path)
file_type: text
file_size: bigint
uploaded_by: uuid FK → profiles
uploaded_at: timestamptz
```

## Issue Management

### issues
```sql
id: uuid PK
organization_id: uuid FK → organizations
campaign_id: uuid FK → campaigns (nullable)
task_id: uuid FK → tasks (nullable)
title: text NOT NULL
description: text
category: text (technical, operational, vendor, budget, content, marketplace)
severity: text (low, medium, high, critical)
status: text (open, investigating, resolved, closed)
reported_by: uuid FK → profiles
assigned_to: uuid FK → profiles
target_resolution_date: date
resolved_at: timestamptz
resolution_note: text
created_at: timestamptz
```

## Budget & Expenses

### budgets
```sql
id: uuid PK
organization_id: uuid FK → organizations
plan_id: uuid FK → marketing_plans
campaign_id: uuid FK → campaigns (nullable)
category: text (ads, kol, content_production, marketplace_promo, event, print, transport, vendor, other)
allocated_amount: bigint NOT NULL
spent_amount: bigint DEFAULT 0 (auto-calculated from approved expenses)
remaining_amount: bigint GENERATED (allocated_amount - spent_amount)
created_at: timestamptz
updated_at: timestamptz
```

### expenses
```sql
id: uuid PK
organization_id: uuid FK → organizations
campaign_id: uuid FK → campaigns
budget_category: text NOT NULL
transaction_date: date NOT NULL
amount: bigint NOT NULL (rupiah, no floating point)
vendor: text
purpose: text NOT NULL
payment_method: text (cash, transfer, card, reimbursement)
status: text (draft, submitted, reviewed, approved, rejected, paid)
submitted_by: uuid FK → profiles
reviewed_by: uuid FK → profiles
approved_by: uuid FK → profiles
review_note: text
submitted_at: timestamptz
reviewed_at: timestamptz
approved_at: timestamptz
created_at: timestamptz
updated_at: timestamptz
```

### expense_attachments
```sql
id: uuid PK
expense_id: uuid FK → expenses
file_name: text NOT NULL
file_path: text NOT NULL (Supabase Storage private path)
file_type: text
file_size: bigint
uploaded_by: uuid FK → profiles
uploaded_at: timestamptz
```

## KPI & Reports

### campaign_kpis
```sql
id: uuid PK
campaign_id: uuid FK → campaigns
metric_name: text NOT NULL (impressions, clicks, conversions, sales, etc)
target_value: numeric
actual_value: numeric
unit: text
measured_at: date
notes: text
created_at: timestamptz
```

## Notifications

### notifications
```sql
id: uuid PK
organization_id: uuid FK → organizations
user_id: uuid FK → profiles
type: text (task_assigned, task_deadline, task_overdue, expense_review, expense_approved, issue_created, budget_warning)
title: text NOT NULL
message: text
link: text
read: boolean DEFAULT false
created_at: timestamptz
```

## Audit

### activity_logs
```sql
id: uuid PK
organization_id: uuid FK → organizations
user_id: uuid FK → profiles
action: text NOT NULL (create, update, delete, approve, reject, archive)
resource_type: text NOT NULL (task, expense, budget, campaign, etc)
resource_id: uuid
old_value: jsonb
new_value: jsonb
created_at: timestamptz
```

## Storage Buckets

- `task-attachments` — public read untuk org members
- `expense-receipts` — private, hanya submitter, reviewer, approver, finance, admin
- `avatars` — public read

## Indexes

```sql
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX idx_tasks_campaign ON tasks(campaign_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_expenses_campaign ON expenses(campaign_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_issues_campaign ON issues(campaign_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read);
CREATE INDEX idx_activity_logs_org_time ON activity_logs(organization_id, created_at DESC);
```

## Row Level Security (RLS)

Semua tabel enforce RLS.

Policy umum:
- User hanya lihat data organisasi tempat dia member
- Admin lihat semua
- Manager lihat campaign dia kelola + task di bawahnya
- Member lihat task assigned ke dia + campaign terkait
- Finance lihat semua expense & budget

Detail policy per tabel di implementation fase berikutnya.
