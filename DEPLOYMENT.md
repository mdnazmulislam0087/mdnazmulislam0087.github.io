# Deployment Guide

This project deploys as a static website and uses Supabase for dynamic blog/admin data.

## 1) Prepare Supabase

1. Create a Supabase project.
2. Run `db/supabase_schema.sql` in SQL Editor.
   - If your project was initialized before page-CMS support, also run `db/site_content_migration.sql` once.
3. In Authentication, create your admin user (email/password).
4. Insert that user into `site_admins` table:

```sql
insert into public.site_admins (user_id) values ('YOUR_AUTH_USER_ID');
```

5. In Supabase Authentication URL settings, add:
- Site URL: `https://mdnazmulislam0087.github.io`
- Additional Redirect URLs:
  - `https://mdnazmulislam0087.github.io/admin-login.html`
  - `https://mdnazmulislam0087.github.io/admin-dashboard.html`
  - `http://localhost:8080/admin-login.html` (for local testing)
  - `http://localhost:8080/admin-dashboard.html` (for local testing)

## 2) Configure frontend

Edit `js/config.js`:

- `supabaseUrl`: your Supabase project URL
- `supabaseAnonKey`: your Supabase anon key
- `imagesBucket`: keep `blog-images` unless you changed SQL

## 3) Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Ensure default branch is `main` or `master`.
3. In repository settings, open `Pages` and set `Source` to `GitHub Actions`.
4. Push to branch; workflow `.github/workflows/deploy-pages.yml` will publish automatically.

## 4) Post-deploy verification

1. Open home page and verify design + navigation.
2. Open `admin-login.html` and sign in.
3. Create a post with cover image and inline image.
4. Publish the post and verify it appears in:
- `blog.html`
- `post.html?slug=...`
- Home latest posts section
5. In Admin Dashboard, open **Website Content Manager**, initialize defaults, edit at least one content block, then refresh public pages to verify the update.

## 5) SEO assets included

- `robots.txt`
- `sitemap.xml`
- `manifest.webmanifest`
- Open Graph/Twitter metadata in all pages
- Structured data on home and blog/post pages

## 6) Optional custom domain

If you move from GitHub subdomain to custom domain:

1. Run the domain switch script from project root:

```powershell
.\scripts\set-production-domain.ps1 -Domain "yourdomain.com"
```

2. Commit and push the generated `CNAME` and updated SEO files.
3. In GitHub repository settings > Pages, set custom domain to `yourdomain.com`.
4. In Supabase Auth URL settings, replace old GitHub Pages URLs with your custom domain URLs.
5. Re-submit sitemap in search consoles:
   - `https://yourdomain.com/sitemap.xml`

## 7) SEO submission checklist

Follow `SEO-LAUNCH-CHECKLIST.md` after first deploy and after every major update.
