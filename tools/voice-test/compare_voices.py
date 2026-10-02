#!/usr/bin/env python3
"""Ses karşılaştırma sayfası: aynı test metinlerini farklı seslerle dinleyip oylamak için.

samples/<anahtar>/NN.mp3 klasörlerindeki her ses sayfada bir harf olur (A, B, ...);
en sonda cihazın tarayıcı sesi gelir. Sesler adsız gösterilir, kim oldukları en altta.

Google seslerini eklemek (GOOGLE_TTS_API_KEY ortam değişkeni gerekir):
  python3 tools/voice-test/compare_voices.py --auto            # Almanca Chirp 3 HD + Neural2/Studio'dan seç
  python3 tools/voice-test/compare_voices.py --google de-DE-Chirp3-HD-Charon,de-DE-Chirp3-HD-Kore
Seçenekler:
  --whisper           her kaydı Whisper'a dinletip otomatik denetim sütununu doldurur (pip install faster-whisper)
  --only k1,k2        sayfada yalnızca bu sesler (anahtarlar samples/meta.json'da)
  --collection ad     oyların yazılacağı koleksiyon (her tur için yeni ad: round2, round3...)
Çıktı: tools/voice-test/ses-karsilastirma.html (claude.ai'de db yeteneğiyle yayınlanır).
"""
import argparse, base64, json, os, re, subprocess, sys, tempfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from generate_audio import google_tts, POST  # noqa: E402

SAMPLES = os.path.join(HERE, 'samples')
META = os.path.join(SAMPLES, 'meta.json')


def list_google_voices(key):
    req = urllib.request.Request('https://texttospeech.googleapis.com/v1/voices?languageCode=de-DE', headers={'X-Goog-Api-Key': key})
    with urllib.request.urlopen(req, timeout=30) as r:
        return [v for v in json.load(r)['voices'] if 'de-DE' in v['languageCodes']]


def auto_pick(voices):
    names = {v['name']: v for v in voices}
    picks = []
    for want in ('de-DE-Chirp3-HD-Charon', 'de-DE-Chirp3-HD-Kore'):   # bir erkek, bir kadın
        if want in names:
            picks.append(want)
    chirp = [n for n in names if 'Chirp3-HD' in n and n not in picks]
    while len(picks) < 2 and chirp:
        picks.append(chirp.pop(0))
    for family in ('Studio', 'Neural2'):
        fam = sorted(n for n in names if f'-{family}-' in n)
        if fam:
            picks.append(fam[0]); break
    return picks


def gender_tr(v):
    return {'MALE': 'erkek', 'FEMALE': 'kadın'}.get(v.get('ssmlGender', ''), '')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--google', default='', help='virgülle ayrılmış Google ses adları')
    ap.add_argument('--auto', action='store_true', help='Google seslerini otomatik seç')
    ap.add_argument('--rate', type=float, default=0.92)
    ap.add_argument('--whisper', action='store_true')
    ap.add_argument('--only', default='')
    ap.add_argument('--collection', default='round2')
    args = ap.parse_args()

    texts = json.load(open(os.path.join(HERE, 'texts.json')))
    meta = json.load(open(META))

    wanted = [v for v in args.google.split(',') if v]
    if wanted or args.auto:
        key = os.environ.get('GOOGLE_TTS_API_KEY') or sys.exit('GOOGLE_TTS_API_KEY ortam değişkeni tanımlı değil.')
        voices = list_google_voices(key)
        by_name = {v['name']: v for v in voices}
        if args.auto:
            wanted += [n for n in auto_pick(voices) if n not in wanted]
        print('Almanca Google sesleri:', len(voices), '| denenecek:', ', '.join(wanted), file=sys.stderr)
        for name in wanted:
            k = 'g-' + name.replace('de-DE-', '').lower()
            os.makedirs(os.path.join(SAMPLES, k), exist_ok=True)
            for i, t in enumerate(texts):
                dest = os.path.join(SAMPLES, k, f'{i:02d}.mp3')
                if os.path.exists(dest):
                    continue
                with tempfile.NamedTemporaryFile(suffix='.mp3') as tmp:
                    tmp.write(google_tts(t, name, args.rate, key)); tmp.flush()
                    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name, '-af', POST,
                                    '-ar', '24000', '-ac', '1', '-b:a', '48k', dest], check=True)
            v = by_name.get(name, {})
            family = 'Chirp 3 HD' if 'Chirp3' in name else 'Studio' if 'Studio' in name else 'Neural2' if 'Neural2' in name else 'Google'
            meta.setdefault(k, {}).update({'label': f'Google {family} · {name.split("-")[-1]}',
                                           'desc': f'Google Cloud Text-to-Speech, {gender_tr(v)} ses ({name}). Ücretli servis; bizim hacmimiz aylık ücretsiz kotada kalır.'})
            print('  hazır:', name, file=sys.stderr)

    keys = [k for k in (args.only.split(',') if args.only else meta.keys()) if k in meta and os.path.isdir(os.path.join(SAMPLES, k))]

    if args.whisper:
        from faster_whisper import WhisperModel
        m = WhisperModel('small', device='cpu', compute_type='int8')
        norm = lambda s: ' '.join(re.sub(r"[^a-zäöüß ]", ' ', s.lower().replace("'s", ' es')).split())
        for k in keys:
            if meta[k].get('asr'):
                continue
            res = []
            for i, t in enumerate(texts):
                with tempfile.NamedTemporaryFile(suffix='.wav') as pad:
                    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(SAMPLES, k, f'{i:02d}.mp3'),
                                    '-af', 'adelay=800,apad=pad_dur=0.8', '-ar', '16000', pad.name], check=True)
                    heard = ' '.join(s.text.strip() for s in m.transcribe(pad.name, language='de', beam_size=5)[0])
                res.append([norm(heard) == norm(t), heard])
            meta[k]['asr'] = res
            print(f'  whisper {k}: {sum(r[0] for r in res)}/{len(res)}', file=sys.stderr)

    json.dump(meta, open(META, 'w'), ensure_ascii=False, indent=1)

    b64 = lambda p: 'data:audio/mpeg;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
    cfg = {
        'collection': args.collection,
        'engines': [{'key': k, 'label': meta[k]['label'], 'desc': meta[k].get('desc', '')} for k in keys],
        'items': [{'text': t,
                   'clips': {k: b64(os.path.join(SAMPLES, k, f'{i:02d}.mp3')) for k in keys},
                   'asr': {k: meta[k]['asr'][i] for k in keys if meta[k].get('asr')}} for i, t in enumerate(texts)],
    }
    html = open(os.path.join(HERE, 'template.html')).read().replace('/*DATA*/', json.dumps(cfg, ensure_ascii=False))
    out = os.path.join(HERE, 'ses-karsilastirma.html')
    open(out, 'w').write(html)
    print(f'{out} ({len(html) // 1024} KB) · sesler: ' + ', '.join(meta[k]['label'] for k in keys), file=sys.stderr)


if __name__ == '__main__':
    main()
