/* SEO ajanının taslak ve raporlarını tek dosyada derler: worker/ajan.json
   Kullanım: node icerik/ajan/derle.mjs  (CI yayından önce de çalıştırır) */
import fs from "fs";
import path from "path";
const kok = path.dirname(new URL(import.meta.url).pathname);
const oku = (klasor) => (fs.existsSync(path.join(kok, klasor)) ? fs.readdirSync(path.join(kok, klasor)).filter((f) => f.endsWith(".json")).sort() : []).map((f) => {
  try { return { dosya: f, ...JSON.parse(fs.readFileSync(path.join(kok, klasor, f), "utf8")) }; } catch (e) { console.error("Bozuk JSON atlandı:", klasor, f, e.message); return null; }
}).filter(Boolean);
const hatalar = [];
const taslaklar = oku("taslaklar").filter((t) => {
  const eksik = ["slug", "title", "desc", "h1", "cevap", "bolumler", "sss", "kaynak"].filter((k) => !t[k] || (Array.isArray(t[k]) && !t[k].length));
  if (!/^[a-z0-9-]{3,80}$/.test(t.slug || "")) eksik.push("slug biçimi");
  if (eksik.length) { hatalar.push(`${t.dosya}: eksik ${eksik.join(", ")}`); return false; }
  return true;
});
const raporlar = oku("raporlar").filter((r) => r.tarih).sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 12);
fs.writeFileSync(path.join(kok, "../../worker/ajan.json"), JSON.stringify({ taslaklar, raporlar }, null, 1));
console.log(`taslak ${taslaklar.length}, rapor ${raporlar.length}${hatalar.length ? "\nATLANAN:\n" + hatalar.join("\n") : ""}`);
