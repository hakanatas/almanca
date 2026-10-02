#!/usr/bin/env python3
"""Oyunda seslendirilen bütün metinleri önceden kaydeder.

js/data.js'teki kelimeler ("der Hund"), cümle treni cümleleri, fiil cümleleri ve
Max'in sözleri Piper nöral ses motoruyla (Thorsten-Voice, CC0) mp3 olarak
audio/ klasörüne yazılır; metin -> dosya eşlemesi js/audio.js'e kaydedilir.
Kaydı olmayan bir metin oyunda tarayıcının kendi sesine düşer.

Kurulum (bir kez):
  pip install piper-tts
  # model: https://huggingface.co/rhasspy/piper-voices/tree/main/de/de_DE/thorsten/high
  #   de_DE-thorsten-high.onnx ve de_DE-thorsten-high.onnx.json dosyalarını indir
Kullanım:
  python3 tools/generate_audio.py --model yol/de_DE-thorsten-high.onnx
Gereken araçlar: node (data.js'i okumak için) ve ffmpeg.
"""
import argparse, json, os, re, subprocess, sys, tempfile, wave

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

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True, help='de_DE-thorsten-high.onnx yolu')
    ap.add_argument('--speed', type=float, default=1.18, help='>1 daha yavaş (öğrenciler için biraz yavaş)')
    ap.add_argument('--force', action='store_true', help='var olan kayıtları da yeniden üret')
    args = ap.parse_args()

    texts = json.loads(subprocess.check_output(['node', '-e', NODE_DUMP, os.path.join(ROOT, 'js', 'data.js')]))
    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(args.model)
    cfg = SynthesisConfig(length_scale=args.speed, noise_scale=0.6, noise_w_scale=0.7)

    out_dir = os.path.join(ROOT, 'audio')
    os.makedirs(out_dir, exist_ok=True)
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
        with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
            with wave.open(tmp.name, 'wb') as wf:
                voice.synthesize_wav(text, wf, syn_config=cfg)
            # baş/son sessizliği kırp, ses seviyesini eşitle, küçük mono mp3
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name, '-af',
                            'silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
                            'silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
                            'adelay=60,apad=pad_dur=0.12,loudnorm=I=-16:TP=-1.5:LRA=11',
                            '-ar', '24000', '-ac', '1', '-b:a', '48k', dest], check=True)
        print(f'[{i}/{len(texts)}] {text}', file=sys.stderr)

    # artık kullanılmayan eski kayıtları temizle
    keep = {os.path.basename(p) for p in mapping.values()}
    for f in os.listdir(out_dir):
        if f.endswith('.mp3') and f not in keep:
            os.remove(os.path.join(out_dir, f))

    with open(os.path.join(ROOT, 'js', 'audio.js'), 'w', encoding='utf-8') as f:
        f.write('// tools/generate_audio.py tarafından üretildi; elle düzenlemeyin.\n')
        f.write('// Ses: Thorsten-Voice (CC0), Piper nöral TTS ile kaydedildi.\n')
        f.write('const AUDIO_CLIPS = ' + json.dumps(mapping, ensure_ascii=False, indent=1) + ';\n')
    print(f'{len(mapping)} kayıt hazır.', file=sys.stderr)

if __name__ == '__main__':
    main()
