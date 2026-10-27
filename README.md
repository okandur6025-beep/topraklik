# Topraklık — Toprağa dair ne varsa.

topraklik.com kaynak kodu.

- `site/` — ana site (Cloudflare Pages, proje: `topraklik`)
- `worker/` — topraklik.com önündeki Worker: haberler, kayan yazı, rehber/hibe/il/ürün sayfaları, site haritası, zamanlı görevler (D1 veritabanı)
- `icerik/` — rehber ve hibe içerik kaynakları
- `logo/` — logo dosyaları

`main` dalına yapılan her değişiklik GitHub Actions ile otomatik yayınlanır (`.github/workflows/deploy.yml`).
Gerekli GitHub secret: `CLOUDFLARE_API_TOKEN`.
Gizli anahtarlar (ADMIN_KEY, API token) bu depoya konmaz.
