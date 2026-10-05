# Database Setup Instructions

## Run migrations in Supabase Dashboard

1. Buka Supabase Dashboard → SQL Editor
2. Jalankan migration file satu per satu secara berurutan:

### Migration 1: Foundation
Copy isi `supabase/migrations/20261005000001_init_foundation.sql`, paste di SQL Editor, Run.

**Isi:**
- Table: `profiles`, `organizations`, `organization_members`
- RLS policies
- Indexes
- Trigger untuk auto-create profile saat user signup

### Migration 2: Seed Admin
Copy isi `supabase/migrations/20261005000002_seed_admin.sql`, paste di SQL Editor, Run.

**Isi:**
- Buat organization "MISVIT Marketing Team"
- Tambahkan khazwelatala30@gmail.com sebagai admin/manager/finance

**Note:** Migration ini baru jalan setelah khazwelatala30@gmail.com login pertama kali (karena butuh profile tercipta dulu dari trigger).

## Verification

Cek apakah table sudah terbuat:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'organizations', 'organization_members');
```

Cek RLS enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'organizations', 'organization_members');
```

## Next Steps
1. Run migration 1
2. Test login dengan khazwelatala30@gmail.com
3. Run migration 2 (seed admin & org)
4. Verify admin user dapat akses dashboard
