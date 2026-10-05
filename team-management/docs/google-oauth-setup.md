# Google OAuth Setup Guide

## Prerequisites
- Google Cloud Platform account
- Supabase project created

## Step-by-Step

### 1. Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Click project dropdown (top left) → New Project
3. Project name: `MISVIT Team Management`
4. Click Create

### 2. Configure OAuth Consent Screen
1. Menu ☰ → APIs & Services → OAuth consent screen
2. User Type: **External** → Create
3. Fill required fields:
   - App name: `MISVIT Team Management`
   - User support email: `khazwelatala30@gmail.com`
   - Developer contact email: `khazwelatala30@gmail.com`
4. Scopes: default (`email`, `profile`, `openid`) is enough
5. Test users: Add `khazwelatala30@gmail.com` (REQUIRED for External apps)
6. Save and Continue

### 3. Get Supabase Callback URL
1. Open Supabase Dashboard → Settings → API
2. Copy your **Project URL**, example: `https://abcdefghijklmnop.supabase.co`
3. Your callback URL: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`

### 4. Create OAuth 2.0 Client ID
1. Menu ☰ → APIs & Services → Credentials
2. "+ CREATE CREDENTIALS" → OAuth 2.0 Client ID
3. Application type: **Web application**
4. Name: `MISVIT Team Web`
5. Authorized redirect URIs: paste callback URL dari step 3
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```
6. Click Create
7. **Copy** Client ID and Client secret (popup muncul)

### 5. Configure Supabase
1. Supabase Dashboard → Authentication → Providers
2. Find **Google** → Enable
3. Paste:
   - Client ID (from step 4)
   - Client Secret (from step 4)
4. Click Save

### 6. Test Login
1. Start dev server: `npm run dev`
2. Go to http://localhost:3000
3. Click "Sign in with Google"
4. Choose khazwelatala30@gmail.com
5. Should redirect to dashboard

## Production Deployment

When deploying to production domain:
1. Go back to Google Cloud Console → Credentials
2. Edit OAuth 2.0 Client ID
3. Add production redirect URI:
   ```
   https://your-domain.com/api/auth/callback
   ```
   Keep the Supabase callback URI too.

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Callback URL di Google Cloud tidak match dengan Supabase
- Verify: https://your-project.supabase.co/auth/v1/callback

### "Access blocked: This app's request is invalid"
- Belum tambah test users di OAuth consent screen
- Tambahkan khazwelatala30@gmail.com ke test users

### Login loop atau tidak redirect
- Check `.env.local` credentials benar
- Verify callback route exists: `app/api/auth/callback/route.ts`
