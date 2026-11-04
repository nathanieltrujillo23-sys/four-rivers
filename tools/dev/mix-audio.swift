// Makes a walkthrough's soundtrack. Everything is synthesized here, so there is nothing to license, and each video gets its
// own style (set by tools/dev/record-walkthroughs.mjs):
//   warm  - gentle and bright: bells over a soft pad, a light shaker; major key, unhurried.
//   drive - modern and steady: a soft kick, claps and hats, a pulsing bass, short chord stabs and a lead; minor key, quicker.
// Both build up over the first bars, so the music grows with the video instead of starting at full volume.
//
//   swiftc -O tools/dev/mix-audio.swift -o /tmp/mix-audio && /tmp/mix-audio audio.json out.wav
import AVFoundation
import Foundation

struct Spec: Decodable { let duration: Double; let style: String; let bpm: Double; let root: Int }

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: mix-audio audio.json out.wav"); exit(2) }
let spec = try JSONDecoder().decode(Spec.self, from: Data(contentsOf: URL(fileURLWithPath: args[1])))
let sr = 44100.0
let n = Int(spec.duration * sr)
var pad = [Float](repeating: 0, count: n)
var inst = [Float](repeating: 0, count: n) // everything but the pad, which gets a pumping dip on the drive style
let beat = 60 / spec.bpm
let bar = beat * 4
let base = 48 + spec.root // C3 for a root of 0

func hz(_ midi: Int) -> Double { 440 * pow(2, Double(midi - 69) / 12) }
var seed: UInt64 = 7
func noise() -> Double { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return Double(Int64(bitPattern: seed >> 11) % 2000) / 1000 - 1 }

func add(_ buf: inout [Float], _ start: Double, _ len: Double, _ amp: Double, _ f: (Double) -> Double) {
  let s = max(0, Int(start * sr)), e = min(n, Int((start + len) * sr))
  if s >= e { return }
  for i in s..<e { buf[i] += Float(amp * f(Double(i - s) / sr)) }
}
func tri(_ x: Double) -> Double { 2 * abs(2 * (x - floor(x + 0.5))) - 1 }

func warmBar(_ b: Int, _ t0: Double) {
  // I, V, vi, IV
  let prog: [[Int]] = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]]
  let chord = prog[b % 4].map { base + $0 }
  for note in chord {
    for d in [-0.0009, 0.0009] {
      let f = hz(note + 12) * (1 + d)
      add(&pad, t0, bar + 0.6, 0.036) { t in
        let a = min(1, t / 0.6), r = min(1, max(0, (bar + 0.6 - t) / 0.7))
        return a * r * (sin(2 * .pi * f * t) + 0.22 * sin(4 * .pi * f * t))
      }
    }
  }
  if b >= 2 { // bass: root then fifth
    for (k, off) in [(0.0, 0), (2.0, 7)] {
      let f = hz(chord[0] - 12 + (off == 7 ? 7 : 0))
      add(&inst, t0 + k * beat, beat * 2, 0.10) { t in exp(-t * 2.4) * min(1, t / 0.012) * (sin(2 * .pi * f * t) + 0.2 * sin(4 * .pi * f * t)) }
    }
  }
  if b >= 1 { // bells: an unhurried rising-and-falling figure
    let order = b % 2 == 0 ? [0, 1, 2, 1, 2, 1, 0, 1] : [2, 1, 0, 1, 2, 2, 1, 0]
    for (i, o) in order.enumerated() where i % 2 == 0 || b >= 3 {
      let f = hz(chord[o] + (i % 4 == 0 ? 36 : 24))
      add(&inst, t0 + Double(i) * beat / 2, 1.2, 0.055) { t in
        exp(-t * 3.6) * min(1, t / 0.004) * (sin(2 * .pi * f * t) + 0.45 * exp(-t * 9) * sin(2 * .pi * f * 2.76 * t) + 0.15 * sin(6 * .pi * f * t))
      }
    }
  }
  if b >= 4 { // a soft shaker on the off-beats
    for k in 0..<4 { add(&inst, t0 + (Double(k) + 0.5) * beat, 0.09, 0.022) { t in noise() * exp(-t * 45) } }
  }
}

func driveBar(_ b: Int, _ t0: Double) {
  // i, VI, III, VII
  let prog: [[Int]] = [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]]
  let chord = prog[b % 4].map { base + $0 }
  for note in chord {
    let f = hz(note + 12)
    add(&pad, t0, bar + 0.3, 0.03) { t in
      let a = min(1, t / 0.25), r = min(1, max(0, (bar + 0.3 - t) / 0.3))
      return a * r * (sin(2 * .pi * f * t) + 0.3 * tri(f * t))
    }
  }
  let root = chord[0] - 12
  if b >= 2 { // the pulse: eighth notes on the root, jumping an octave on the "and" of 2 and 4
    for i in 0..<8 {
      let up = (i == 3 || i == 7)
      let f = hz(root + (up ? 12 : 0))
      add(&inst, t0 + Double(i) * beat / 2, beat, 0.12) { t in
        exp(-t * 7) * min(1, t / 0.006) * (sin(2 * .pi * f * t) + 0.5 * sin(4 * .pi * f * t) + 0.3 * sin(6 * .pi * f * t))
      }
    }
    // soft kick on every beat
    for k in 0..<4 {
      add(&inst, t0 + Double(k) * beat, 0.3, 0.34) { t in
        let f = 45 + 95 * exp(-t * 28)
        return exp(-t * 11) * sin(2 * .pi * f * t)
      }
    }
  }
  if b >= 3 { // hats on the eighths, open on the last one
    for i in 0..<8 {
      let open = (i == 7 && b % 2 == 1)
      add(&inst, t0 + Double(i) * beat / 2, open ? 0.2 : 0.05, i % 2 == 1 ? 0.04 : 0.022) { t in noise() * exp(-t * (open ? 14 : 80)) }
    }
  }
  if b >= 4 { // claps on 2 and 4
    for k in [1, 3] {
      add(&inst, t0 + Double(k) * beat, 0.16, 0.13) { t in noise() * exp(-t * 26) + 0.5 * sin(2 * .pi * 190 * t) * exp(-t * 35) }
    }
  }
  if b >= 2 { // short chord stabs
    for pos in [0.0, 1.5, 3.0] {
      for note in chord {
        let f = hz(note + 12)
        add(&inst, t0 + pos * beat, 0.3, 0.032) { t in
          exp(-t * 11) * min(1, t / 0.004) * (tri(f * t) + 0.5 * (tri(f * t * 1.003) > 0 ? 1 : -1) * 0.4)
        }
      }
    }
  }
  if b >= 6 { // a lead line, sparse
    let order = b % 2 == 0 ? [0, -1, 1, -1, 2, -1, 1, 0] : [2, -1, 1, 2, -1, 1, -1, 0]
    for (i, o) in order.enumerated() where o >= 0 {
      let f = hz(chord[o] + 24)
      add(&inst, t0 + Double(i) * beat / 2, 0.5, 0.05) { t in
        exp(-t * 6) * min(1, t / 0.005) * (tri(f * t) + 0.25 * sin(4 * .pi * f * t))
      }
    }
  }
}

var b = 0
while Double(b) * bar < spec.duration {
  let t0 = Double(b) * bar
  if spec.style == "drive" { driveBar(b, t0) } else { warmBar(b, t0) }
  b += 1
}

// The drive style's pad dips on each kick, which gives it a pumping feel.
if spec.style == "drive" {
  for i in 0..<n {
    let t = Double(i) / sr
    if t >= 2 * bar {
      let phase = (t / beat).truncatingRemainder(dividingBy: 1) * beat
      pad[i] *= Float(1 - 0.55 * exp(-phase * 9))
    }
  }
}

// Mix, set the loudness, soften the peaks, fade in and out.
var mix = [Double](repeating: 0, count: n)
var sum = 0.0
for i in 0..<n { mix[i] = Double(pad[i]) + Double(inst[i]); sum += mix[i] * mix[i] }
let rms = max(0.0001, sqrt(sum / Double(n)))
let gain = 0.16 / rms
var out = [Float](repeating: 0, count: n)
for i in 0..<n {
  let fin = min(1, Double(i) / (0.6 * sr)), fout = min(1, Double(n - i) / (2.4 * sr))
  out[i] = Float(tanh(mix[i] * gain * 1.1) * fin * fout * 0.9)
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
print("wrote \(args[2]) (\(String(format: "%.1f", spec.duration))s, \(spec.style) at \(Int(spec.bpm)) bpm)")
