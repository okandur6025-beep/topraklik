"""Ürün rehberlerini derler: icerik/urunler/*.py -> worker/urunler.json
Kullanım: python3 icerik/urunler/build.py
"""
import importlib, json, pathlib, sys
HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
from _ortak import iller, IL_AD, BOLGELER, K

GRUPLAR = ["tahillar", "baklagiller", "yagli", "endustri", "yem", "sebzeler", "meyveler", "sertkabuk", "tibbi", "yeni"]
BOLGE_SIRA = list(BOLGELER)

def trlower(t):
    return t.replace("I", "ı").replace("İ", "i").lower()

def derle(u, kat):
    p = dict(u)
    p["kat"] = kat
    p["yaygin"] = iller(u.get("yaygin", ""))
    p["uygun"] = [i for i in iller(u.get("uygun", "")) if i not in p["yaygin"]]
    b = u.get("bolge", {})
    for k in b: assert k in BOLGELER, (u["slug"], k)
    p["bolge"] = [[k, b[k]] for k in BOLGE_SIRA if k in b]
    p["kaynak"] = [list(K[x]) if isinstance(x, str) else list(x) for x in u.get("kaynak", ["tuik", "bakanlik"])]
    z = u.get("kazanc")
    if z:
        for f in ("verim", "fiyat", "maliyet"):
            assert f in z, (u["slug"], f)
        if z.get("fiyat_k"):
            z["fiyat_kaynak"] = list(K[z.pop("fiyat_k")])
    ad = u["ad"]
    sss = [{"q": q, "a": a} for q, a in u.get("sss", [])]
    ilad = lambda xs: ", ".join(IL_AD[x] for x in xs[:8])
    if u.get("ekim"):
        sss.insert(0, {"q": f"{ad} ne zaman ekilir?", "a": u["ekim"]})
    if p["yaygin"]:
        sss.insert(1, {"q": f"{ad} hangi illerde yetişir?", "a": f"En çok {ilad(p['yaygin'])} illerinde üretilir." + (f" Uygun koşullarda {ilad(p['uygun'])} gibi illerde de yetiştirilebilir." if p["uygun"] else "")})
    if z:
        m = [k for k in z["verim"] if k != "aralik"][0]
        v = z["verim"][m]; c = z["maliyet"][m] if isinstance(z["maliyet"], dict) else z["maliyet"]
        net = v * z["fiyat"] - c + z.get("destek", 0)
        tr = lambda n: f"{round(n):,}".replace(",", ".")
        sss.append({"q": f"1 dönüm {trlower(ad)} ne kadar kazandırır?",
                    "a": f"Topraklık'ın Ekim 2026 tahminine göre dekarda yaklaşık {tr(v)} {z.get('birim','kg')} ürün ve {str(z['fiyat']).replace('.', ',')} TL/{z.get('birim','kg')} fiyatla brüt gelir {tr(v*z['fiyat'])} TL, masraf {tr(c)} TL" + (f", destek {tr(z['destek'])} TL" if z.get("destek") else "") + f"; tahmini net {tr(net)} TL olur (arazi kirası hariç). Verim ve fiyat bölgeye göre değişir; sayfadaki hesaplayıcıyla kendi rakamlarınızı girin."
                    + (f" {z['ilk']}." if z.get("ilk") else "")})
    p["sss"] = sss
    return p

def main():
    out, seen = [], set()
    for g in GRUPLAR:
        f = HERE / f"{g}.py"
        if not f.exists():
            continue
        m = importlib.import_module(g)
        for u in m.URUNLER:
            assert u["slug"] not in seen, u["slug"]
            seen.add(u["slug"])
            out.append(derle(u, m.KAT))
    dst = HERE.parent.parent / "worker" / "urunler.json"
    dst.write_text(json.dumps({"iller": IL_AD, "urunler": out}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(out)} ürün -> {dst} ({dst.stat().st_size // 1024} KB)")

if __name__ == "__main__":
    main()
