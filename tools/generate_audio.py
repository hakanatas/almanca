#!/usr/bin/env python3
"""Oyunda seslendirilen bütün metinleri önceden kaydeder.

js/data.js'teki kelimeler ("der Hund"), cümle treni cümleleri, fiil cümleleri ve
Max'in sözleri mp3 olarak audio/ klasörüne yazılır; metin -> dosya eşlemesi
js/audio.js'e kaydedilir. Kaydı olmayan bir metin oyunda tarayıcının kendi sesine düşer.

İki ses motoru:
  google  Google Cloud Text-to-Speech (önerilen). Anahtar GOOGLE_TTS_API_KEY ortam
          değişkeninden okunur. Bizim hacmimiz aylık ücretsiz kotanın içinde kalır.
            python3 tools/generate_audio.py --engine google --voice de-DE-Chirp3-HD-Charon
  piper   Ücretsiz, çevrimdışı (Thorsten-Voice, CC0); kalitesi sınırlı.
            pip install piper-tts
            python3 tools/generate_audio.py --engine piper --model yol/de_DE-thorsten-high.onnx
Ses değiştirildiğinde bütün kayıtlar otomatik yeniden üretilir.
Gereken araçlar: node (data.js'i okumak için) ve ffmpeg.
"""
import argparse, base64, json, os, re, subprocess, sys, tempfile, time, urllib.error, urllib.request, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# data.js'i çalıştırıp oyunun seslendirdiği metinleri birebir aynı biçimde topla
NODE_DUMP = r"""
const fs = require('fs');
eval(fs.readFileSync(process.argv[1], 'utf8') + `
  ;globalThis.__out = [
    ...THEMES.flatMap(t => t.words.map(w => w.art + ' ' + w.de)),
    ...THEMES.flatMap(t => t.sentences.map(s => s.de.join(' '))),
    ...VERBS.flatMap(v => PRONOUNS.map((_, p) => verbSentence(v, p))),
    ...MAX_SAETZE,
  ];`);
process.stdout.write(JSON.stringify([...new Set(globalThis.__out)]));
"""

def slug(text):
    t = text.lower()
    for a, b in (('ä', 'ae'), ('ö', 'oe'), ('ü', 'ue'), ('ß', 'ss')):
        t = t.replace(a, b)
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')[:60]

POST = ('silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
        'silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
        'adelay=60,apad=pad_dur=0.12,loudnorm=I=-16:TP=-1.5:LRA=11')

_NO_RATE = set()   # hız ayarını desteklemeyen sesler (bir kez öğrenilir)

def google_tts(text, voice, rate, key):
    """Google Cloud TTS'ten mp3 baytları döndürür."""
    cfg = {'audioEncoding': 'MP3', 'sampleRateHertz': 24000}
    if voice not in _NO_RATE:
        cfg['speakingRate'] = rate
    body = {'input': {'text': text}, 'voice': {'languageCode': voice[:5], 'name': voice}, 'audioConfig': cfg}
    for attempt in range(4):
        req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize',
                                     data=json.dumps(body).encode(), method='POST',
                                     headers={'Content-Type': 'application/json', 'X-Goog-Api-Key': key})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return base64.b64decode(json.load(r)['audioContent'])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')
            if e.code == 400 and 'speakingRate' in msg and 'speakingRate' in body['audioConfig']:
                del body['audioConfig']['speakingRate']   # bazı sesler hız ayarını desteklemez
                _NO_RATE.add(voice)
                continue
            if e.code in (429, 500, 503) and attempt < 3:
                time.sleep(2 ** attempt); continue
            sys.exit(f'Google TTS hatası {e.code}: {msg[:300]}')

class Engine:
    def __init__(self, args):
        self.args = args
        if args.engine == 'google':
            self.key = os.environ.get('GOOGLE_TTS_API_KEY')
            if not self.key:
                sys.exit('GOOGLE_TTS_API_KEY ortam değişkeni tanımlı değil.')
            self.label = f'Google Cloud TTS · {args.voice}'
        else:
            if not args.model:
                sys.exit('--engine piper için --model gerekli.')
            from piper import PiperVoice, SynthesisConfig
            self.voice = PiperVoice.load(args.model)
            self.cfg = SynthesisConfig(length_scale=1.18, noise_scale=0.6, noise_w_scale=0.7)
            self.label = 'Piper · Thorsten-Voice (CC0)'

    def to_mp3(self, text, dest):
        with tempfile.TemporaryDirectory() as d:
            raw = os.path.join(d, 'raw')
            if self.args.engine == 'google':
                open(raw + '.mp3', 'wb').write(google_tts(text, self.args.voice, self.args.rate, self.key))
                raw += '.mp3'
            else:
                raw += '.wav'
                with wave.open(raw, 'wb') as wf:
                    self.voice.synthesize_wav(text, wf, syn_config=self.cfg)
            # baş/son sessizliği kırp, ses seviyesini eşitle, küçük mono mp3
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', POST,
                            '-ar', '24000', '-ac', '1', '-b:a', '48k', dest], check=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--engine', choices=['google', 'piper'], default='google')
    ap.add_argument('--voice', default='de-DE-Chirp3-HD-Charon', help='Google ses adı')
    ap.add_argument('--rate', type=float, default=0.92, help='Google konuşma hızı (1 = normal)')
    ap.add_argument('--model', help='piper: de_DE-thorsten-high.onnx yolu')
    ap.add_argument('--force', action='store_true', help='var olan kayıtları da yeniden üret')
    args = ap.parse_args()

    texts = json.loads(subprocess.check_output(['node', '-e', NODE_DUMP, os.path.join(ROOT, 'js', 'data.js')]))
    engine = Engine(args)
    out_dir = os.path.join(ROOT, 'audio')
    os.makedirs(out_dir, exist_ok=True)
    stamp = os.path.join(out_dir, 'VOICE.txt')
    if not os.path.exists(stamp) or open(stamp).read().strip() != engine.label:
        args.force = True   # ses değişti: hepsini yeniden kaydet

    mapping, used = {}, set()
    for i, text in enumerate(texts, 1):
        name = slug(text)
        while name in used:
            name += '-x'
        used.add(name)
        rel = f'audio/{name}.mp3'
        mapping[text] = rel
        dest = os.path.join(ROOT, rel)
        if os.path.exists(dest) and not args.force:
            continue
        engine.to_mp3(text, dest)
        print(f'[{i}/{len(texts)}] {text}', file=sys.stderr)

    # artık kullanılmayan eski kayıtları temizle
    keep = {os.path.basename(p) for p in mapping.values()}
    for f in os.listdir(out_dir):
        if f.endswith('.mp3') and f not in keep:
            os.remove(os.path.join(out_dir, f))
    open(stamp, 'w').write(engine.label + '\n')

    with open(os.path.join(ROOT, 'js', 'audio.js'), 'w', encoding='utf-8') as f:
        f.write('// tools/generate_audio.py tarafından üretildi; elle düzenlemeyin.\n')
        f.write(f'// Ses: {engine.label}\n')
        f.write('const AUDIO_CLIPS = ' + json.dumps(mapping, ensure_ascii=False, indent=1) + ';\n')
    print(f'{len(mapping)} kayıt hazır ({engine.label}).', file=sys.stderr)

if __name__ == '__main__':
    main()
