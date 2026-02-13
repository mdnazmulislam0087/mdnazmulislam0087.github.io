param(
  [Parameter(Mandatory = $true)]
  [string]$Domain,

  [string]$OldOrigin = "https://mdnazmulislam0087.github.io"
)

$normalized = $Domain.Trim().ToLowerInvariant()
$normalized = $normalized -replace '^https?://', ''
$normalized = $normalized.TrimEnd('/')

if (-not $normalized) {
  throw "Domain cannot be empty. Example: yourdomain.com"
}

$newOrigin = "https://$normalized"
Write-Output "Updating site origin: $OldOrigin -> $newOrigin"

$targets = @(
  "index.html",
  "about.html",
  "research.html",
  "blog.html",
  "post.html",
  "contact.html",
  "admin-login.html",
  "admin-dashboard.html",
  "robots.txt",
  "sitemap.xml",
  "js/post-detail.js",
  "DEPLOYMENT.md",
  "README.md"
)

$updated = @()
foreach ($path in $targets) {
  if (-not (Test-Path $path)) {
    continue
  }

  $content = Get-Content -Path $path -Raw
  $newContent = $content.Replace($OldOrigin, $newOrigin)

  if ($path -eq "sitemap.xml") {
    $today = Get-Date -Format "yyyy-MM-dd"
    $newContent = [regex]::Replace(
      $newContent,
      '<lastmod>\d{4}-\d{2}-\d{2}</lastmod>',
      "<lastmod>$today</lastmod>"
    )
  }

  if ($newContent -ne $content) {
    Set-Content -Path $path -Value $newContent
    $updated += $path
  }
}

Set-Content -Path "CNAME" -Value $normalized

Write-Output ""
Write-Output "Created/updated CNAME with: $normalized"
Write-Output "Updated files:"
if ($updated.Count -eq 0) {
  Write-Output "- (no text replacements were needed)"
} else {
  $updated | ForEach-Object { Write-Output "- $_" }
}

Write-Output ""
Write-Output "Next steps:"
Write-Output "1) Commit and push these changes."
Write-Output "2) In GitHub Pages, ensure custom domain is set to $normalized."
Write-Output "3) Re-submit sitemap: $newOrigin/sitemap.xml"