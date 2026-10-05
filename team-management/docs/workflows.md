# Workflows

## 1. Campaign Execution Flow

```
Marketing Plan Created (Admin)
  ↓
Campaign Created (Admin/Manager)
  ↓
Budget Allocated (Admin)
  ↓
Milestones Defined (Manager)
  ↓
Tasks Created & Assigned (Manager)
  ↓
Member Works on Task → Update Checklist → Upload Bukti
  ↓
Manager Reviews → Approve/Request Revision
  ↓
Task Done → Campaign Progress Updated
```

## 2. Issue Reporting Flow

```
Member Menemukan Masalah
  ↓
Create Issue (kategori, dampak, deskripsi, bukti)
  ↓
Assign PIC & Target Resolution (Manager)
  ↓
PIC Investigates & Updates Status
  ↓
Resolution Implemented
  ↓
Manager Verifies & Close Issue (wajib resolution note)
```

## 3. Expense Approval Flow

```
Member Melakukan Pengeluaran
  ↓
Upload Nota/Invoice ke Draft Expense
  ↓
Fill Details (tanggal, campaign, kategori, nominal, tujuan)
  ↓
Submit for Review
  ↓
Manager Review (campaign terkait) → Comment jika perlu revisi
  ↓
Finance/Admin Final Approval
  ↓
  → Approved: masuk realisasi budget, status → Paid
  → Rejected: tidak kurangi budget, status → Rejected (wajib catatan)
```

## 4. Budget Monitoring Flow

```
Admin Set Budget per Plan & Campaign
  ↓
Manager Allocate ke Kategori
  ↓
Member Submit Expense → Approved Expense masuk Realisasi
  ↓
System Auto-calculate: Sisa = Budget - Realisasi
  ↓
Warning jika Realisasi > 80% Budget
  ↓
Alert jika Realisasi > Budget (over-budget)
```

## 5. Task Status Lifecycle

```
backlog → planned → in_progress → review → done
            ↓
          blocked (issue reported) → in_progress (issue resolved)
```

State transitions:
- `backlog → planned`: Manager set timeline & PIC
- `planned → in_progress`: Member starts work
- `in_progress → blocked`: Member reports blocker
- `blocked → in_progress`: Blocker resolved
- `in_progress → review`: Member marks complete + upload bukti
- `review → in_progress`: Manager requests revision
- `review → done`: Manager approves

## 6. Notification Triggers

- **Task assigned**: notify PIC
- **Task deadline < 24h**: notify PIC & Manager
- **Task overdue**: notify PIC & Manager
- **Task blocked**: notify Manager
- **Expense submitted**: notify Manager & Finance
- **Expense approved/rejected**: notify submitter
- **Issue created**: notify Manager & assigned PIC
- **Issue critical**: notify Admin
- **Budget > 80%**: notify Admin & Manager
- **Budget exceeded**: notify Admin

## 7. Recurring Task Flow

```
Manager Creates Recurring Task Template
  ↓
Set frequency (daily/weekly/monthly)
  ↓
System Auto-creates Task Instance on schedule
  ↓
Member completes instance
  ↓
Next instance auto-created per schedule
```

## 8. Audit Trail

Every sensitive action logged:
- Who (user_id)
- What (action type)
- When (timestamp)
- Where (resource type & id)
- Old value → New value (for updates)

Logged actions:
- Task status change
- Budget change
- Expense submit/approve/reject
- Issue create/resolve
- Member role change
- Data archive/restore
