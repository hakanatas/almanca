#!/usr/bin/env python3
"""/v2/ sayfalarını kökteki index.html, admin.html ve duello.html'den üretir.

/almanca/      girişsiz sürüm (js/firebase-config.js boş kalır)
/almanca/v2/   okul hesabıyla giriş + çalışma kaydı (v2/firebase-config.js)

İki sürüm aynı css/, js/, audio/ dosyalarını kullanır; v2 sayfaları yalnızca
<base href="../"> ve kendi ayar dosyasıyla farklıdır. index.html veya admin.html
değişince bunu çalıştırın:   python3 tools/build_v2.py
"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTE = '<!-- tools/build_v2.py tarafından kökteki {name} dosyasından üretildi; elle düzenlemeyin. -->\n'

def build(name, extra=()):
    src = open(os.path.join(ROOT, name), encoding='utf-8').read()
    out = src
    charset = '<meta charset="utf-8">'
    assert charset in out, f'{name}: {charset} bulunamadı'
    # Bütün göreli yollar (css/, js/, audio/, manifest) kök klasöre çözülsün
    out = out.replace(charset, charset + '\n  <base href="../">', 1)
    old_cfg = '<script src="js/firebase-config.js"></script>'
    assert out.count(old_cfg) == 1, f'{name}: firebase-config betiği bulunamadı'
    out = out.replace(old_cfg, '<script src="v2/firebase-config.js"></script>')
    for a, b in extra:
        assert a in out, f'{name}: "{a}" bulunamadı'
        out = out.replace(a, b)
    out = out.replace('<!doctype html>\n', '<!doctype html>\n' + NOTE.format(name=name), 1)
    dest = os.path.join(ROOT, 'v2', name)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    changed = not os.path.exists(dest) or open(dest, encoding='utf-8').read() != out
    open(dest, 'w', encoding='utf-8').write(out)
    return changed

if __name__ == '__main__':
    check = '--check' in sys.argv
    extras = {
        'index.html': [('href="duello.html"', 'href="v2/duello.html"')],
        'admin.html': [('href="index.html">Oyuna dön', 'href="v2/">Oyuna dön')],
        'duello.html': [('href="./">', 'href="v2/">'), ('href="duello.html">Yeni düello', 'href="v2/duello.html">Yeni düello'),
                        ('href="v2/duello.html"><b>v2/duello.html</b>', 'href="v2/duello.html"><b>v2/duello.html</b>')],
    }
    changed = [n for n in ('index.html', 'admin.html', 'duello.html') if build(n, extras[n])]
    if check and changed:
        sys.exit('v2 sayfaları güncel değildi: ' + ', '.join(changed) + ' (tools/build_v2.py çalıştırıldı, değişiklikleri ekleyin)')
    print('v2/index.html, v2/admin.html ve v2/duello.html hazır.')
