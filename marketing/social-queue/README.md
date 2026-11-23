# FRAIMOUS social queue (local)

Content factory: **write → keyword → queue → export packs**.  
You approve and post. Nothing auto-publishes.

Active slate: **Snow Société** (from `artwork.csv` + local package).

## Quick start

```bash
cd "/Users/shea/her-os/30 Portfolio/FRAMEOUS"

python3 library/_tools/social_queue.py seed-snow-societe
python3 library/_tools/social_queue.py next --n 6
```

Packs:

```
marketing/social-queue/packs/snow-societe/
  batch.json
  tiktok/manifest.json + manifest.csv
  instagram/manifest.json + manifest.csv
  pinterest/manifest.json + manifest.csv
```

Assets live in `library/web/collections/snow-societe/{slug}/`.

## Ship one post

1. `next` → pick a row (e.g. Snow Polo)
2. Open the channel `manifest.csv`
3. Upload the file at `asset.path` (relative to FRAMEOUS root)
4. Paste caption / cover_text / alt_text / hashtags
5. You hit post or save draft

## Commands

| Command | What |
|---------|------|
| `seed-snow-societe` | Load PACKAGE.json → queue + packs |
| `status` | Counts |
| `next [--n 5]` | Priority list |
| `packs [--batch snow-societe]` | Rebuild manifests |
| `export-csv` | Optional Airtable-ready CSVs |
| `scan <dir>` | Generic editorial folder scan |

## Source

- Catalog index: `library/web/collections/snow-societe/PACKAGE.json`
- Inventory source: `~/Downloads/artwork.csv` (Snow Société rows)
- Preview assets copied from iCloud Snow Societe Artwork + Room Mocks packages
