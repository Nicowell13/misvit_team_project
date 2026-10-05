# Product Requirements — Team Management System

## Tujuan
Sistem koordinasi dan pertanggungjawaban tim marketing MISVIT untuk checklist, issue reporting, budget tracking, dan laporan pengeluaran.

## Pengguna
1. **Admin/Owner** — kelola anggota, plan, budget, setujui pengeluaran
2. **Marketing Manager** — pecah plan, assign task, review
3. **Team Member** — kerjakan task, laporkan issue, ajukan pengeluaran
4. **Finance/Reviewer** — review pengeluaran, validasi bukti

## Modul MVP

### 1. Dashboard
- Campaign aktif
- Task: selesai, terlambat, diblokir
- Budget: rencana vs realisasi
- Pengeluaran menunggu persetujuan
- Issue terbuka
- Aktivitas terbaru

### 2. Marketing Plan & Campaign
Struktur: Plan → Campaign → Milestone → Task → Checklist

Campaign:
- Nama, tujuan, kanal
- PIC, timeline, KPI
- Budget, status
- Lampiran

### 3. Task & Checklist
- Judul, deskripsi, PIC, reviewer
- Deadline, prioritas, checklist
- Status: backlog | planned | in_progress | blocked | review | done
- Komentar, bukti, riwayat

### 4. Issue Reporting
- Kategori: teknis, operasional, vendor, budget, konten, marketplace
- Dampak, campaign terkait
- Deskripsi, bukti, PIC, target penyelesaian
- Status, resolution note

### 5. Budget Management
- Budget per plan
- Alokasi per campaign dan kategori
- Realisasi, sisa, variance
- Warning threshold

Kategori: Ads, KOL, Produksi konten, Marketplace promo, Event, Cetak, Transportasi, Vendor, Lainnya

### 6. Expense Report
Alur: Draft → Submitted → Reviewed → Approved/Rejected → Paid

Data:
- Tanggal, campaign, kategori, nominal
- Vendor, tujuan, metode pembayaran
- Bukti nota/invoice
- Pengaju, reviewer, catatan

Kontrol:
- Bukti wajib sebelum submit
- Pengaju tidak boleh approve sendiri
- Revisi tidak hapus histori
- File privat

### 7. Reports
- Budget vs actual
- Pengeluaran per campaign/kategori
- Task completion rate
- On-time rate
- Issue resolution time
- KPI campaign
- CSV export

### 8. Notification
- Task deadline/terlambat
- Expense perlu review/ditolak
- Issue kritis

### 9. Audit Log
- Perubahan task, status, budget
- Pengajuan dan persetujuan
- Penghapusan/arsip
- Timestamp dan actor

## Tambahan MVP
- Comments & mentions
- Activity timeline
- Attachments
- Approval workflow
- Recurring tasks
- Archive (no hard delete)
- Filter & search
- Mobile-responsive

## Out of Scope MVP
- Payroll, absensi, chat real-time
- Video meeting, Gantt kompleks
- AI recommendation, Python analytics
- WhatsApp integration, akuntansi penuh
- Native mobile app

## Aturan Bisnis
1. Data terikat ke organisasi
2. User hanya lihat organisasi dia member
3. Expense wajib terkait campaign & kategori
4. Pengaju tidak approve sendiri
5. Approved expense masuk realisasi
6. Rejected expense tidak kurangi budget
7. Perubahan nominal setelah approval perlu revisi baru
8. Task done perlu bukti/catatan
9. Data keuangan tidak dihapus permanen
10. Tindakan sensitif masuk audit log

## Stack
- Next.js + TypeScript
- Supabase Auth, PostgreSQL, Storage, RLS
- Recharts
- Tailwind CSS
- Zod
- Google Sign-In (khazwelatala30@gmail.com sebagai admin)

## Tahapan
1. Foundation — Auth, org, role, RLS
2. Campaign execution — Plan, campaign, task, checklist
3. Accountability — Budget, expense, approval, audit
4. Monitoring — Dashboard, KPI, chart, export
5. Automation — Notification, recurring, reminder
