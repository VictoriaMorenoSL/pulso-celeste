"""Cuatro maquetas instrumentales originales para Pulso Celeste.

Herramienta opcional de autoría, no necesaria para ejecutar/compartir el sitio.
Requiere numpy y, para MP3, lameenc. No descarga ni utiliza muestras u obras.
python scripts/generar_musica.py [--formato mp3|wav]
"""
from pathlib import Path
import argparse
import hashlib
import json
import wave
import numpy as np

SR = 44100
DESTINO = Path(__file__).resolve().parents[1] / "assets/Audios/Musica"
RNG = np.random.default_rng(2301026)


def frecuencia(nota):
    return 440 * 2 ** ((nota - 69) / 12)


def piano(nota, segundos, fuerza=1):
    t = np.arange(round(segundos * SR)) / SR
    f = frecuencia(nota)
    voz = np.zeros(len(t))
    for h, nivel in enumerate([1, .36, .17, .075, .04, .019, .009], 1):
        # Parciales ligeramente inarmónicos, apagados más deprisa en el registro alto.
        parcial = f * h * np.sqrt(1 + .00007 * h * h)
        voz += nivel * np.sin(2 * np.pi * parcial * t) * np.exp(-t * (.66 + h * .42) * (f / 440) ** .16)
    ataque = 1 - np.exp(-t / .009)
    salida = np.minimum(1, np.maximum(0, segundos - t) / .3)
    return voz * ataque * salida * .3 * fuerza


def cuerdas(nota, segundos):
    t = np.arange(round(segundos * SR)) / SR
    voz = np.zeros(len(t))
    for afinacion in [-.0022, 0, .0025]:
        fase = 2 * np.pi * frecuencia(nota) * (1 + afinacion) * t + .23 * np.sin(2 * np.pi * 4.2 * t)
        for h in range(1, 7):
            voz += np.sin(fase * h + .2 * h) / h ** 2.1
    envolvente = np.minimum(1, t / .65) * np.minimum(1, np.maximum(0, segundos - t) / 1.1)
    return voz * envolvente * .065


def campana(nota, segundos=3.8):
    t = np.arange(round(segundos * SR)) / SR
    return ((np.sin(2 * np.pi * frecuencia(nota) * t) * np.exp(-t / 1.1)
             + .16 * np.sin(2 * np.pi * frecuencia(nota) * 2.756 * t) * np.exp(-t / .45))
            * (1 - np.exp(-t / .008)) * np.minimum(1, (segundos - t) / .2) * .13)


def pulso(fuerza):
    t = np.arange(round(.48 * SR)) / SR
    # Golpe redondo afinado en re, con caída suave; sin pitidos ni ruido de monitor.
    fase = 2 * np.pi * (73.416 * t + 4 * .06 * (1 - np.exp(-t / .06)))
    cuerpo = np.sin(fase) + .24 * np.sin(fase * 2) + .08 * np.sin(fase * 3)
    return cuerpo * (1 - np.exp(-t / .012)) * np.exp(-t / .095) * fuerza


def mezclar(destino, voz, inicio, nivel=1, panorama=0):
    posicion = round(inicio * SR) % len(destino)
    v = voz.astype(np.float32) * nivel
    balance = np.array([np.sqrt((1 - panorama) / 2), np.sqrt((1 + panorama) / 2)], dtype=np.float32)
    estereo = v[:, None] * balance
    for comienzo in range(0, len(v), len(destino)):
        tramo = estereo[comienzo:comienzo + len(destino)]
        n = min(len(tramo), len(destino) - posicion)
        destino[posicion:posicion + n] += tramo[:n]
        if n < len(tramo):
            destino[:len(tramo) - n] += tramo[n:]
        posicion = 0


def componer(tipo, bpm, compases):
    beat = 60 / bpm
    compas = beat * 4
    duracion = compases * compas
    audio = np.zeros((round(duracion * SR), 2), dtype=np.float32)
    # Re mayor / si menor relativo; las cuatro piezas comparten motivo y armonía.
    acordes = [[50, 57, 61, 64, 66], [43, 54, 57, 59, 62],
               [47, 54, 57, 62, 66], [45, 52, 59, 61, 64]]
    motivo = [[66, 69, 71, 69], [66, 64, 62, 66],
              [69, 74, 73, 71], [69, 66, 64, 62]]
    for bar in range(compases):
        acorde = acordes[bar % 4]
        if tipo == "pulso":
            acorde = [acordes[2], acordes[1], acordes[0], acordes[3]][bar % 4]
        instante = bar * compas
        # El final crece por frases, con una culminación entre los compases 9 y 20.
        crecimiento = min(1, .35 + bar / 12) if tipo == "final" else 1
        if tipo == "final" and bar >= 20:
            crecimiento = .92 - (bar - 20) * .12
        intensidad = {"encuentro": .55, "pulso": .28, "hola": .65, "final": .73}[tipo]
        for i, nota in enumerate(acorde[1:]):
            mezclar(audio, cuerdas(nota, compas + 1.6), instante,
                    intensidad * crecimiento, (i - 1.5) * .25)
        mezclar(audio, piano(acorde[0], 4.6), instante, .58 * crecimiento, -.15)
        if tipo == "pulso":
            for b in range(4):
                latido = instante + b * beat + RNG.uniform(-.009, .009)
                mezclar(audio, pulso(.38), latido, 1)
                mezclar(audio, pulso(.22), latido + .22, 1)
            if bar % 2 == 0:
                mezclar(audio, piano(motivo[(bar // 2) % 4][0], 4), instante + beat, .25, .2)
                mezclar(audio, piano(motivo[(bar // 2) % 4][2], 4), instante + 3 * beat, .23, -.15)
        else:
            arpegio = [acorde[1], acorde[3], acorde[2], acorde[4]]
            pasos = 8 if tipo in ["hola", "final"] else 4
            for b in range(pasos):
                nota = arpegio[b % 4]
                momento = instante + b * compas / pasos + RNG.uniform(-.015, .015)
                mezclar(audio, piano(nota, 3.5), momento, .32 * crecimiento, (b % 3 - 1) * .28)
            # Frases espaciadas para que el tema respire sobre la narración.
            melodia = motivo[bar % 4]
            for b, nota in enumerate(melodia):
                if tipo == "encuentro" and b in [1, 3]:
                    continue
                if tipo == "final" and bar < 4 and b in [1, 3]:
                    continue
                momento = instante + [0, 1.5, 2.25, 3.25][b] * beat
                mezclar(audio, piano(nota, 4.4, .88 + RNG.random() * .12), momento,
                        .67 * crecimiento, .12)
                if tipo == "final" and 8 <= bar < 20:
                    mezclar(audio, cuerdas(nota + 12, 1.8), momento + .02, .22, -.3)
            if tipo in ["hola", "final"] and bar % 2 == 1:
                mezclar(audio, campana(melodia[0] + 12), instante + beat * 2.5,
                        .25 * crecimiento, .45)
    # Reverberación estéreo circular: las colas pasan al principio del loop.
    seco = audio.copy()
    for demora, nivel in [(.113, .12), (.193, .10), (.293, .082), (.419, .069), (.557, .052), (.743, .038), (1.013, .026)]:
        audio += np.roll(seco[:, ::-1], round(demora * SR), axis=0) * nivel
    audio -= audio.mean(axis=0)
    rms = float(np.sqrt(np.mean(audio ** 2)))
    ganancia = min(.12 / max(rms, .00001), .83 / max(float(np.max(np.abs(audio))), .00001))
    audio *= ganancia
    # Cerrar el último medio milisegundo sobre el inicio evita saltos de muestra.
    n = 32
    audio[-n:] = audio[-n:] * np.linspace(1, 0, n)[:, None] + audio[:1] * np.linspace(0, 1, n)[:, None]
    return audio, duracion


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--formato", choices=["mp3", "wav"], default="mp3")
    args = parser.parse_args()
    DESTINO.mkdir(parents=True, exist_ok=True)
    piezas = [("cap01_primer_encuentro", "encuentro", 76, 16),
              ("cap02_pulso", "pulso", 80, 16),
              ("cap02_despues_del_hola", "hola", 84, 24),
              ("final_amor_creciente", "final", 76, 24)]
    manifiesto = {"estado": "maquetas instrumentales sintetizadas pendientes de aprobación", "originales": True,
                  "procedencia": "Composición y síntesis aditiva propias; sin muestras, descargas ni obras ajenas.",
                  "frecuencia_muestreo": SR, "semilla": 2301026, "pistas": []}
    for nombre, tipo, bpm, compases in piezas:
        audio, duracion = componer(tipo, bpm, compases)
        pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes()
        destino = DESTINO / f"{nombre}.{args.formato}"
        if args.formato == "mp3":
            import lameenc
            encoder = lameenc.Encoder()
            encoder.set_bit_rate(192)
            encoder.set_in_sample_rate(SR)
            encoder.set_channels(2)
            encoder.set_quality(2)
            destino.write_bytes(encoder.encode(pcm) + encoder.flush())
        else:
            with wave.open(str(destino), "wb") as wav:
                wav.setnchannels(2)
                wav.setsampwidth(2)
                wav.setframerate(SR)
                wav.writeframes(pcm)
        # Guardar solo metadatos, no duplicar los archivos de audio sin comprimir.
        manifiesto["pistas"].append({"archivo": destino.name, "duracion_pcm_segundos": round(duracion, 6),
          "bpm": bpm, "compases": compases, "rms_dbfs": round(float(20 * np.log10(np.sqrt(np.mean(audio ** 2)))), 2),
          "pico_dbfs": round(float(20 * np.log10(np.max(np.abs(audio)))), 2),
          "bytes": destino.stat().st_size, "sha256": hashlib.sha256(destino.read_bytes()).hexdigest()})
        print(f"{destino.name}: {duracion:.3f} s, {destino.stat().st_size} bytes", flush=True)
    (DESTINO / "manifiesto.json").write_text(json.dumps(manifiesto, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
