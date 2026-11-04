// Mixes a walkthrough's soundtrack: the narration clips (spoken lines placed at the times they were shown) over a quiet,
// generated background track (chords, a soft bass, a plucked arpeggio and a light tick) that dips while someone is talking.
// Everything is synthesized here, so there is nothing to license. Used by tools/dev/record-walkthroughs.mjs.
//
//   swiftc -O tools/dev/mix-audio.swift -o /tmp/mix-audio && /tmp/mix-audio audio.json out.wav
import AVFoundation
import Foundation

struct Clip: Decodable { let t: Double; let file: String }
struct Spec: Decodable { let duration: Double; let bpm: Double; let root: Int; let clips: [Clip] }

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: mix-audio audio.json out.wav"); exit(2) }
let spec = try JSONDecoder().decode(Spec.self, from: Data(contentsOf: URL(fileURLWithPath: args[1])))
let sr = 44100.0
let n = Int(spec.duration * sr)
var music = [Float](repeating: 0, count: n)
var voice = [Float](repeating: 0, count: n)

func hz(_ midi: Int) -> Double { 440 * pow(2, Double(midi - 69) / 12) }

// Chords: I, vi, IV, V over the chosen root (C3 = 48).
let prog: [[Int]] = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]]
let beat = 60 / spec.bpm
let bar = beat * 4
let base = 48 + spec.root
var seed: UInt64 = 7
func noise() -> Float { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return Float(Int64(bitPattern: seed >> 11) % 2000) / 1000 - 1 }

func add(_ start: Double, _ len: Double, _ amp: Double, _ f: (Double) -> Double) {
  let s = max(0, Int(start * sr)), e = min(n, Int((start + len) * sr))
  if s >= e { return }
  for i in s..<e { music[i] += Float(amp * f(Double(i - s) / sr)) }
}

var b = 0
while Double(b) * bar < spec.duration {
  let t0 = Double(b) * bar
  let chord = prog[b % 4].map { base + $0 }
  // Pad: two slightly detuned voices per note, slow swell.
  for note in chord {
    for d in [-0.0009, 0.0009] {
      let f = hz(note + 12) * (1 + d)
      add(t0, bar + 0.5, 0.032) { t in
        let a = min(1, t / 0.5), r = min(1, max(0, (bar + 0.5 - t) / 0.6))
        return a * r * (sin(2 * .pi * f * t) + 0.25 * sin(4 * .pi * f * t))
      }
    }
  }
  // Bass on beats 1 and 3.
  for k in [0.0, 2.0] {
    let f = hz(chord[0] - 12)
    add(t0 + k * beat, beat * 2, 0.11) { t in exp(-t * 2.6) * min(1, t / 0.01) * sin(2 * .pi * f * t) }
  }
  // Arpeggio on eighth notes.
  let order = [0, 1, 2, 1, 2, 1, 0, 2]
  for (i, o) in order.enumerated() {
    let f = hz(chord[o] + 24)
    add(t0 + Double(i) * beat / 2, 0.7, 0.05) { t in
      exp(-t * 5.2) * min(1, t / 0.005) * (sin(2 * .pi * f * t) + 0.4 * sin(4 * .pi * f * t) + 0.12 * sin(6 * .pi * f * t))
    }
  }
  // A light tick on the off-beats.
  for k in 0..<4 {
    add(t0 + (Double(k) + 0.5) * beat, 0.06, 0.02) { t in Double(noise()) * exp(-t * 70) }
  }
  b += 1
}

// Narration: normalized, placed where it was shown.
for c in spec.clips {
  guard let file = try? AVAudioFile(forReading: URL(fileURLWithPath: c.file)),
        let buf = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length)) else { continue }
  try file.read(into: buf)
  guard let ch = buf.floatChannelData?[0] else { continue }
  let len = Int(buf.frameLength)
  var peak: Float = 0.0001
  for i in 0..<len { peak = max(peak, abs(ch[i])) }
  let g = 0.9 / peak
  let s = Int(c.t * sr)
  for i in 0..<len where s + i < n { voice[s + i] += ch[i] * g }
}

// Music dips under the voice (smoothly), fades in and out.
var active = [Bool](repeating: false, count: n)
for i in 0..<n where abs(voice[i]) > 0.01 {
  let lo = max(0, i - 4000), hi = min(n - 1, i + 8000)
  for j in stride(from: lo, through: hi, by: 400) { active[j] = true }
}
var duck = 1.0
let rate = 1 - exp(-1 / (0.3 * sr))
var out = [Float](repeating: 0, count: n)
for i in 0..<n {
  duck += ((active[i] ? 0.38 : 1.0) - duck) * rate
  let fin = min(1, Double(i) / (0.8 * sr)), fout = min(1, Double(n - i) / (2.2 * sr))
  let m = Double(music[i]) * duck * fin * fout * 1.1
  let x = m + Double(voice[i])
  out[i] = Float(tanh(x * 0.95))
}

func writeOut() throws {
  let fmt = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: sr, channels: 1, interleaved: false)!
  // The file is only finished once this function returns and the AVAudioFile is released.
  let outFile = try AVAudioFile(forWriting: URL(fileURLWithPath: args[2]), settings: [AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: sr, AVNumberOfChannelsKey: 1, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false])
  let pcm = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: AVAudioFrameCount(n))!
  pcm.frameLength = AVAudioFrameCount(n)
  for i in 0..<n { pcm.floatChannelData![0][i] = out[i] }
  try outFile.write(from: pcm)
}
try writeOut()
print("wrote \(args[2]) (\(String(format: "%.1f", spec.duration))s, \(spec.clips.count) clips)")
