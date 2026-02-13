# SEO Launch Checklist

Use this checklist on launch day and after every major site update.

## A) Technical indexing checks

1. Verify site is accessible over HTTPS without mixed-content errors.
2. Verify `robots.txt` is reachable:
   - `https://YOUR_DOMAIN/robots.txt`
3. Verify `sitemap.xml` is reachable:
   - `https://YOUR_DOMAIN/sitemap.xml`
4. Confirm canonical tags point to the production domain on all public pages.
5. Confirm admin pages are `noindex,nofollow`.

## B) Search Console setup (Google)

1. Open Google Search Console.
2. Add property using `Domain` (recommended) or URL-prefix.
3. Complete DNS verification.
4. Submit sitemap URL:
   - `https://YOUR_DOMAIN/sitemap.xml`
5. Request indexing for:
   - `/`
   - `/about.html`
   - `/research.html`
   - `/blog.html`
   - `/contact.html`

## C) Bing Webmaster setup

1. Open Bing Webmaster Tools.
2. Import from Google Search Console or verify domain directly.
3. Submit sitemap URL:
   - `https://YOUR_DOMAIN/sitemap.xml`

## D) Social preview validation

1. Test homepage URL in Open Graph debugger tools.
2. Confirm title, description, and preview image render correctly.
3. Test at least one post URL (`post.html?slug=...`) and verify dynamic meta values.

## E) Performance and quality baseline

1. Run Lighthouse on mobile and desktop.
2. Target at least 90 in Performance, Accessibility, Best Practices, and SEO.
3. Check Core Web Vitals in Search Console after data appears.

## F) Ongoing monthly maintenance

1. Publish at least one high-quality blog post.
2. Check for crawl/indexing issues in Search Console.
3. Re-test one random public page for canonical and metadata correctness.
4. Update sitemap `lastmod` when major static page changes are made.