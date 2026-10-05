-- Seed 27 RAB items, total Rp305.000.000. Safe to rerun.
DO $$ DECLARE org_id UUID; campaign_id UUID; admin_id UUID; BEGIN
 SELECT id INTO admin_id FROM public.profiles WHERE email='khazwelatala30@gmail.com';
 IF admin_id IS NULL THEN RAISE EXCEPTION 'Admin profile belum tersedia'; END IF;
 SELECT id INTO org_id FROM public.organizations WHERE slug='misvit-marketing';
 IF org_id IS NULL THEN RAISE EXCEPTION 'Organization MISVIT belum tersedia'; END IF;
 INSERT INTO public.campaigns(organization_id,name,objective,status,created_by)
 SELECT org_id,'MISVIT Pra-Akselerasi 2026','Scale-up produksi, pemasaran, branding, promosi, legalitas, dan pengembangan SDM.','active',admin_id
 WHERE NOT EXISTS(SELECT 1 FROM public.campaigns WHERE organization_id=org_id AND name='MISVIT Pra-Akselerasi 2026');
 SELECT id INTO campaign_id FROM public.campaigns WHERE organization_id=org_id AND name='MISVIT Pra-Akselerasi 2026' ORDER BY created_at LIMIT 1;
 DELETE FROM public.budget_items WHERE organization_id=org_id AND source='rab_seed_2026';
 INSERT INTO public.budget_items(organization_id,campaign_id,category,item,unit,volume,unit_price,allocated_amount,source) VALUES
    (org_id,campaign_id,'Pengurusan Izin','Biaya pendaftaran sertifikasi halal','produk',1.0,5000000,5000000,'rab_seed_2026'),
    (org_id,campaign_id,'produksi','Biaya maklon Misvit phase pertama','pcs',2850.0,18000,51300000,'rab_seed_2026'),
    (org_id,campaign_id,'produksi','Biaya maklon Misvit phase kedua','pcs',2850.0,18000,51300000,'rab_seed_2026'),
    (org_id,campaign_id,'produksi','Biaya maklon Misvit phase ketiga','psc',2850.0,18000,51300000,'rab_seed_2026'),
    (org_id,campaign_id,'pemasaran','Sewa Mobil','kali',6.0,988000,5928000,'rab_seed_2026'),
    (org_id,campaign_id,'pemasaran','Uang saku perjalanan dinas','OH',12.0,350000,4200000,'rab_seed_2026'),
    (org_id,campaign_id,'pemasaran','Konsumsi perjalanan dinas','OH',12.0,150000,1800000,'rab_seed_2026'),
    (org_id,campaign_id,'pemasaran','Sewa Mobil','kali',2.0,1017000,2034000,'rab_seed_2026'),
    (org_id,campaign_id,'pemasaran','Uang saku perjalanan dinas','OH',4.0,350000,1400000,'rab_seed_2026'),
    (org_id,campaign_id,'pemasaran','Konsumsi perjalanan dinas','OH',4.0,150000,600000,'rab_seed_2026'),
    (org_id,campaign_id,'pemasaran','Snack Konsumsi','OK',50.0,25000,1250000,'rab_seed_2026'),
    (org_id,campaign_id,'pemasaran','Konsumsi','OK',50.0,50000,2500000,'rab_seed_2026'),
    (org_id,campaign_id,'pemasaran','Honor Narasumber (4 orang)','OJ',8,1000000,8000000,'rab_seed_2026'),
    (org_id,campaign_id,'pemasaran','ATK','paket',1.0,78000,78000,'rab_seed_2026'),
    (org_id,campaign_id,'penguatan branding','Biaya influencer','orang',5.0,5000000,25000000,'rab_seed_2026'),
    (org_id,campaign_id,'penguatan branding','Biaya cetak banner','pcs',15.0,110000,1650000,'rab_seed_2026'),
    (org_id,campaign_id,'penguatan branding','Biaya cetak brosur','pcs',3700.0,1800,6660000,'rab_seed_2026'),
    (org_id,campaign_id,'penguatan branding','Biaya KOL','orang',10.0,3000000,30000000,'rab_seed_2026'),
    (org_id,campaign_id,'promosi','Biaya iklan meta','hari',50.0,250000,12500000,'rab_seed_2026'),
    (org_id,campaign_id,'promosi','Biaya iklan tiktok','hari',50.0,250000,12500000,'rab_seed_2026'),
    (org_id,campaign_id,'promosi','Biaya iklan shopee','hari',50.0,300000,15000000,'rab_seed_2026'),
    (org_id,campaign_id,'pengembangan sdm','Konten kreator','orang',1.0,3000000,3000000,'rab_seed_2026'),
    (org_id,campaign_id,'pengembangan sdm','Editor video','orang',1.0,3000000,3000000,'rab_seed_2026'),
    (org_id,campaign_id,'pengembangan sdm','Admin media sosial','orang',1.0,3000000,3000000,'rab_seed_2026'),
    (org_id,campaign_id,'pengembangan sdm','Host live','orang',1.0,3000000,3000000,'rab_seed_2026'),
    (org_id,campaign_id,'pengembangan sdm','Packing','orang',1.0,1500000,1500000,'rab_seed_2026'),
    (org_id,campaign_id,'pengembangan sdm','Kurir','orang',1.0,1500000,1500000,'rab_seed_2026');
END $$;
