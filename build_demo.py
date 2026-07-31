"""Generate demo.html from saved site snapshot."""

import re
from pathlib import Path

SITE = Path(__file__).parent / "static" / "site_source.html"
OUT = Path(__file__).parent / "static" / "demo.html"
BASE = "https://www.latrattoria-da-massimo.de"
CDN = "https://site-assets.cdnmns.com/954c64bf5a12363b0e386b65ecbc58d9"

html = SITE.read_text(encoding="utf-8")

# Strip scripts and tracking
html = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.I)
html = re.sub(r"<noscript[\s\S]*?</noscript>", "", html, flags=re.I)

# Fix asset paths
html = html.replace('href="/assets/', f'href="{BASE}/assets/')
html = html.replace('src="/uploads/', f'src="{BASE}/uploads/')
html = html.replace("href='/uploads/", f"href='{BASE}/uploads/")
html = html.replace('href="/uploads/', f'href="{BASE}/uploads/')

# Replace grids / external css relative paths if any
html = html.replace(
    "https://site-assets.cdnmns.com/f0078924e99cca05eec44d977680f347",
    CDN,
)

# Simplify form (visual only)
html = html.replace('onsubmit="return _monoForm.submitForm(this);"', "")
html = re.sub(r'<div class="h-captcha"[\s\S]*?</div>', "", html)
html = re.sub(r'<div class="hcaptcha-badge[\s\S]*?</div>\s*</form>', "</form>", html)
html = re.sub(r'<div class=\'cookiebot-placeholder[\s\S]*?</div>\s*</div>\s*<div class="map-container"', '<div class="map-container"', html)

# Inject demo assets before </head>
head_extra = f"""
<link rel="stylesheet" href="{CDN}/css/grids.css?1783075167156">
<link rel="stylesheet" href="{CDN}/css/external-libs.css?1783075167156">
<link rel="stylesheet" href="/static/demo-overrides.css">
<title>Demo | La Trattoria Cafe – Ristorante – Bar</title>
"""
html = html.replace("</head>", head_extra + "</head>", 1)

# Inject chat widget before </body>
html = html.replace(
    "</body>",
    '  <script src="/embed.js?v=7" defer></script>\n</body>',
    1,
)

OUT.write_text(html, encoding="utf-8")
print(f"Wrote {OUT} ({len(html)} chars)")
