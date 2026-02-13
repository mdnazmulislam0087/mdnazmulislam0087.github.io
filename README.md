# mdnazmulislam0087.github.io

Professional portfolio + dynamic blog platform for Md Nazmul Islam.

## What is implemented

- Premium responsive redesign across all pages
- Custom logo, favicon, and Open Graph social preview artwork
- Public dynamic blog (`blog.html` + `post.html`)
- Secure admin login (`admin-login.html`)
- Admin dashboard for blog management (`admin-dashboard.html`)
- Admin content manager for Home/About/Research/Contact/Blog page text
- Create, edit, delete, publish/unpublish posts
- Post date picker (published date shown publicly)
- Blog scope support in editor (`Personal` / `Technical`)
- Past Posts tab for editing existing posts quickly
- Image uploads for cover and inline blog images
- Multiple cover images per post with reorder (drag/drop)
- Post cover auto-slider on `post.html` when multiple covers are present
- Markdown-based authoring with safe rendering
- Live post preview in right-side editor panel
- Auto-generate short excerpt (first lines of content)
- Auto-generate tags from title/excerpt/content
- Supabase-backed authentication, database, and storage
- SEO setup: canonical tags, Open Graph/Twitter metadata, schema JSON-LD
- Search indexing assets: `robots.txt`, `sitemap.xml`, `manifest.webmanifest`
- Automated GitHub Pages deployment workflow (`.github/workflows/deploy-pages.yml`)
- Home page latest blog auto-carousel (up to 5 recent posts)
- Blog page filters: text search + scope + year + month

## Stack

- Static frontend: HTML, CSS, JavaScript modules
- Backend services: Supabase
  - Auth: admin login
  - Postgres: posts and admin access control
  - Storage: blog image uploads

## File map

- `index.html` - homepage with latest dynamic posts
- `about.html` - about page
- `research.html` - research page
- `contact.html` - contact page
- `blog.html` - dynamic blog listing
- `post.html` - dynamic single post view
- `admin-login.html` - admin authentication
- `admin-dashboard.html` - admin post editor/dashboard
- `styles.css` - full responsive design system
- `script.js` - shared navigation and page behavior
- `js/config.js` - local project config (edit this)
- `js/config.example.js` - config template
- `js/supabase-client.js` - Supabase client + shared utilities
- `js/home-latest.js` - latest posts on homepage
- `js/blog-list.js` - blog listing/search
- `js/post-detail.js` - single post rendering
- `js/page-content.js` - public page content loader from CMS blocks
- `js/site-content-defaults.js` - default editable page content blocks
- `js/admin-login.js` - admin sign in logic
- `js/admin-dashboard.js` - admin CRUD + uploads
- `db/supabase_schema.sql` - DB schema, RLS, and storage policies
- `db/site_content_migration.sql` - migration for site content CMS table
- `.github/workflows/deploy-pages.yml` - auto deploy to GitHub Pages
- `DEPLOYMENT.md` - production deployment and launch checklist
- `SEO-LAUNCH-CHECKLIST.md` - search engine and social launch checklist
- `scripts/set-production-domain.ps1` - one-command custom-domain URL switcher
- `CNAME.example` - custom domain template

## Setup (required)

1. Create a Supabase project.
2. In Supabase SQL Editor, run `db/supabase_schema.sql`.
   - If you configured Supabase before this CMS update, also run `db/site_content_migration.sql` once.
3. In Supabase Auth, create an admin user (email/password).
4. Add that user to `site_admins` table:
   - Example SQL:
     - `insert into public.site_admins (user_id) values ('YOUR_AUTH_USER_ID');`
5. Edit `js/config.js` with your Supabase values:
   - `supabaseUrl`
   - `supabaseAnonKey`
   - `imagesBucket` (default: `blog-images`)
6. Deploy as static hosting (GitHub Pages, Netlify, Vercel static, etc.) or run local server.

## Local preview

Use any static server from the project root. Example:

```powershell
# Python
python -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages deploy (quick)

1. Push this repository to GitHub.
2. In GitHub: `Settings` -> `Pages` -> set source to `GitHub Actions`.
3. Ensure workflow exists: `.github/workflows/deploy-pages.yml`.
4. Push to `main` branch (or workflow target branch).
5. Wait for Actions to finish, then open your Pages URL.
6. If using custom domain:
   - Copy `CNAME.example` to `CNAME` and set your domain.
   - Update DNS records at your domain provider.

## Admin workflow

1. Open `admin-login.html`
2. Log in with admin credentials
3. In dashboard:
   - Create/edit post fields
   - Upload cover image
   - Upload inline image and auto-insert markdown
   - Toggle publish status
4. Published posts automatically appear in `blog.html` and homepage latest section.
5. In **Website Content Manager** (same dashboard), edit page content blocks and save.

## Notes

- This site is designed mobile-first and works across desktop/mobile.
- Public users can read only published posts.
- Only users listed in `site_admins` can manage content and upload images.
- For full launch steps (Supabase auth URLs + GitHub Pages settings), see `DEPLOYMENT.md`.
- For post-launch indexing/visibility checks, follow `SEO-LAUNCH-CHECKLIST.md`.
