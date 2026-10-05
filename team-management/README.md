# Team Management System Setup

## Prerequisites
- Node.js 18+
- Supabase account
- Google Cloud Console account

## 1. Install Dependencies
```bash
npm install
```

## 2. Setup Environment Variables
Copy `.env.local.example` to `.env.local` and fill:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from Supabase Dashboard → Settings → API.

## 3. Setup Database
Follow instructions in `supabase/README.md`:
1. Run foundation migration
2. Run seed migration after first login

## 4. Configure Google OAuth
See `docs/google-oauth-setup.md` for detailed steps.

## 5. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

## 6. First Login
1. Click "Sign in with Google"
2. Use khazwelatala30@gmail.com
3. After redirect, you should see dashboard
4. Run seed migration to grant admin roles

## Project Structure
```
team-management/
├── app/                    # Next.js app router
│   ├── auth/              # Auth pages
│   ├── dashboard/         # Dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   └── ui/               # UI primitives
├── lib/                  # Utilities
│   └── supabase/         # Supabase clients
├── supabase/             # Database migrations
└── docs/                 # Documentation
```

## Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Troubleshooting

### Login redirect loops
- Check `.env.local` credentials
- Verify Google OAuth redirect URI matches Supabase callback URL

### Database permissions errors
- Verify RLS policies are enabled
- Check user is member of organization

### Migration fails
- Run migrations in order
- Check Supabase logs for SQL errors
