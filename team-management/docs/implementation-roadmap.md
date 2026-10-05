# Implementation Roadmap

## Fase 1: Foundation (Week 1)

### Setup Project
- [x] Buat folder `team-management/`
- [x] Tulis docs perencanaan
- [ ] Init Next.js 15 + TypeScript
- [ ] Install dependencies
- [ ] Setup Tailwind CSS + shadcn/ui
- [ ] Setup folder structure

### Supabase Setup
- [ ] Buat Supabase project
- [ ] Setup Google OAuth provider
- [ ] Generate types dari schema
- [ ] Setup environment variables

### Auth Flow
- [ ] Google Sign-In button
- [ ] Auth callback handler
- [ ] Session management
- [ ] Protected routes middleware
- [ ] Logout

### Database Foundation
- [ ] Migration: organizations, profiles, organization_members
- [ ] RLS policies untuk auth
- [ ] Seed admin user (khazwelatala30@gmail.com)
- [ ] Verify RLS works

### UI Shell
- [ ] App layout dengan sidebar
- [ ] Responsive navigation
- [ ] User menu + avatar
- [ ] Dashboard placeholder
- [ ] Modern design system (colors, typography, spacing)

**Deliverable Fase 1:** Login works, admin masuk dashboard kosong, sidebar navigation ready.

---

## Fase 2: Campaign Execution (Week 2)

### Marketing Plan & Campaign
- [ ] Migration: marketing_plans, campaigns, milestones
- [ ] RLS policies
- [ ] CRUD marketing plan (Admin only)
- [ ] CRUD campaign (Admin/Manager)
- [ ] Campaign list page
- [ ] Campaign detail page
- [ ] Milestone CRUD

### Task Management
- [ ] Migration: tasks, task_checklists, task_comments, task_attachments
- [ ] RLS policies
- [ ] Task CRUD
- [ ] Task board view (Kanban minimal)
- [ ] Task detail modal
- [ ] Checklist component
- [ ] Comment thread
- [ ] File upload (Supabase Storage)
- [ ] Assign task
- [ ] Update status
- [ ] Filter by status/assignee/priority

**Deliverable Fase 2:** Campaign dan task bisa dibuat, assigned, dan dikerjakan. Checklist bisa diupdate.

---

## Fase 3: Accountability (Week 3)

### Budget Management
- [ ] Migration: budgets
- [ ] RLS policies
- [ ] Set budget per plan/campaign
- [ ] Allocate budget per category
- [ ] Budget dashboard component
- [ ] Warning thresholds

### Expense Report
- [ ] Migration: expenses, expense_attachments
- [ ] RLS policies
- [ ] Create expense draft
- [ ] Upload receipt (private storage)
- [ ] Submit expense
- [ ] Review expense (Manager)
- [ ] Approve/Reject expense (Finance/Admin)
- [ ] Auto-update spent_amount di budgets
- [ ] Expense list with filters
- [ ] Expense detail modal

### Audit Log
- [ ] Migration: activity_logs
- [ ] RLS policies
- [ ] Log function (trigger atau app-level)
- [ ] Audit log viewer (Admin/Finance)

**Deliverable Fase 3:** Budget tracking live. Expense flow dari draft → submit → approve bekerja. Bukti nota tersimpan private.

---

## Fase 4: Monitoring (Week 4)

### Dashboard
- [ ] Campaign summary cards
- [ ] Task metrics (done/late/blocked)
- [ ] Budget vs actual chart
- [ ] Pending approvals list
- [ ] Recent activity feed

### Issue Management
- [ ] Migration: issues
- [ ] RLS policies
- [ ] Create issue
- [ ] Assign & set severity
- [ ] Update status
- [ ] Close issue (wajib resolution note)
- [ ] Issue list & filters

### KPI Tracking
- [ ] Migration: campaign_kpis
- [ ] RLS policies
- [ ] Add KPI untuk campaign
- [ ] Update actual values
- [ ] KPI chart

### Reports
- [ ] Budget vs actual report
- [ ] Expense by campaign
- [ ] Expense by category
- [ ] Task completion rate
- [ ] CSV export

**Deliverable Fase 4:** Dashboard informatif. Issue bisa dilaporkan. KPI tracked. Report bisa di-export.

---

## Fase 5: Automation & Polish (Week 5+)

### Notifications
- [ ] Migration: notifications
- [ ] RLS policies
- [ ] Notification bell icon + unread count
- [ ] Notification panel
- [ ] Mark as read
- [ ] Auto-generate notifications:
  - Task assigned
  - Task deadline < 24h
  - Task overdue
  - Expense submitted
  - Expense approved/rejected
  - Issue created (critical)
  - Budget warning (>80%)

### Recurring Tasks
- [ ] Add recurrence config to tasks
- [ ] Cron job untuk auto-create task instances
- [ ] Manage recurring templates

### Polish
- [ ] Loading states
- [ ] Error boundaries
- [ ] Toast notifications
- [ ] Empty states
- [ ] Mobile optimization
- [ ] Dark mode (optional)
- [ ] Keyboard shortcuts (optional)
- [ ] Search global (optional)

### Testing & Deploy
- [ ] Unit tests critical flows
- [ ] E2E test auth + expense approval
- [ ] Deploy ke Vercel
- [ ] Setup domain
- [ ] Monitoring & error tracking

**Deliverable Fase 5:** System production-ready. Notifikasi aktif. Recurring tasks works. UX polish.

---

## Tech Stack Final

**Frontend:**
- Next.js 15 + App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts
- Zod validation
- React Hook Form

**Backend:**
- Supabase Auth (Google OAuth)
- Supabase PostgreSQL
- Supabase Storage
- Supabase Realtime (untuk notifications)
- Row Level Security

**DevOps:**
- Vercel deployment
- GitHub Actions (optional CI)

**Design:**
- Lucide icons
- Inter font
- Modern color palette: emerald primary, slate neutral
- Fluid spacing, rounded corners
- Subtle shadows & animations
