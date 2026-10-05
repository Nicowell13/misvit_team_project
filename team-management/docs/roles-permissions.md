# Roles & Permissions

## Role

### Admin/Owner
- Kelola anggota dan role
- Buat marketing plan
- Tetapkan budget
- Setujui pengeluaran
- Lihat semua laporan
- Tutup periode laporan
- Export data
- Manage organization settings

### Marketing Manager
- Pecah plan jadi campaign dan task
- Assign PIC, deadline, prioritas, budget
- Review task
- Verifikasi issue
- Review laporan pengeluaran (untuk campaign dia kelola)
- Lihat dashboard campaign dia kelola

### Team Member
- Lihat task assigned ke dia
- Update checklist dan progres
- Upload bukti kerja
- Laporkan issue
- Ajukan pengeluaran
- Upload nota/invoice
- Comment di task dia terlibat

### Finance/Reviewer
- Review semua pengeluaran
- Validasi bukti
- Approve/reject laporan
- Export laporan pertanggungjawaban
- Lihat semua budget & realisasi

## Permission Matrix

| Action | Admin | Manager | Member | Finance |
|--------|-------|---------|--------|---------|
| Manage members | ✓ | | | |
| Create marketing plan | ✓ | | | |
| Create campaign | ✓ | ✓ | | |
| Create task | ✓ | ✓ | | |
| Assign task | ✓ | ✓ | | |
| Update own task | ✓ | ✓ | ✓ | |
| Complete task | ✓ | ✓ | ✓ | |
| Report issue | ✓ | ✓ | ✓ | |
| Resolve issue | ✓ | ✓ | | |
| Set budget | ✓ | | | |
| Submit expense | ✓ | ✓ | ✓ | |
| Review expense (own campaign) | ✓ | ✓ | | |
| Approve expense | ✓ | | | ✓ |
| View all expenses | ✓ | | | ✓ |
| View own expenses | ✓ | ✓ | ✓ | ✓ |
| Export reports | ✓ | ✓ | | ✓ |
| View audit log | ✓ | | | ✓ |

## Notes
- Satu user bisa punya lebih dari satu role
- Role diatur per organization
- Default new member: Team Member
- Admin dapat delegate Manager role per campaign
- Finance role bisa standalone atau tambahan untuk Admin
