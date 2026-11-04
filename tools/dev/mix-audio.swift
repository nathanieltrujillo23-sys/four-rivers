// Makes a walkthrough's soundtrack. Everything is synthesized here, so there is nothing to license. The style is set by
// tools/dev/record-walkthroughs.mjs (see tools/dev/soundtracks.mjs for the list and what each one sounds like):
//   piano, acoustic, ambient   - calm, credible beds for the course video
//   pulse, house, minimal      - modern, steady beds for the tools video
// Every style builds over its first bars, so the music grows with the video instead of starting at full volume.
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
var pad = [Float](repeating: 0, count: n)   // sustained strings and drones
var inst = [Float](repeating: 0, count: n)  // piano, plucks, stabs, bass: gets an echo
var drums = [Float](repeating: 0, count: n) // kick, hats, claps
let beat = 60 / spec.bpm
let bar = beat * 4
let base = 48 + spec.root // C3 for a root of 0
var kickTimes: [Double] = []

func hz(_ midi: Int) -> Double { 440 * pow(2, Double(midi - 69) / 12) }
var seed: UInt64 = 11
func rnd() -> Double { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return Double(Int64(bitPattern: seed >> 11) % 2000) / 1000 - 1 }
func add(_ buf: inout [Float], _ start: Double, _ len: Double, _ amp: Double, _ f: (Double) -> Double) {
  let s = max(0, Int(start * sr)), e = min(n, Int((start + len) * sr))
  if s >= e { return }
  for i in s..<e { buf[i] += Float(amp * f(Double(i - s) / sr)) }
}
func tri(_ x: Double) -> Double { 2 * abs(2 * (x - floor(x + 0.5))) - 1 }

typealias Partials = [(Double, Double, Double)] // multiple of the pitch, level, decay rate
let pianoParts: Partials = [(1, 1, 2.1), (2, 0.55, 3.3), (3, 0.3, 4.6), (4, 0.16, 6.2), (5, 0.08, 8.5), (6, 0.04, 11)]
let pluckParts: Partials = [(1, 1, 5.5), (2, 0.6, 7.5), (3, 0.34, 10), (4, 0.18, 13), (5, 0.08, 16)]
let glassParts: Partials = [(1, 1, 1.4), (3, 0.12, 3), (2, 0.2, 2)]

/// A struck or plucked note: decaying partials with a short soft attack, plus a faint hammer thump.
func note(_ buf: inout [Float], _ t0: Double, _ midi: Int, _ len: Double, _ amp: Double, _ parts: Partials, thump: Double = 0.05, release: Double = 0.06) {
  let f = hz(midi)
  add(&buf, t0, len, amp) { t in
    var v = 0.0
    for (m, a, d) in parts { v += a * exp(-t * d) * sin(2 * .pi * f * m * t) }
    return v * min(1, t / 0.004) * min(1, max(0, (len - t) / release))
  }
  if thump > 0 { add(&buf, t0, 0.04, amp * thump) { t in rnd() * exp(-t * 90) } }
}
/// Strings: a few slightly detuned voices with a slow swell.
func strings(_ t0: Double, _ midis: [Int], _ len: Double, _ amp: Double, attack: Double = 0.9, release: Double = 0.9) {
  for m in midis {
    for d in [-0.0011, 0.0011] {
      let f = hz(m) * (1 + d)
      add(&pad, t0, len, amp) { t in
        var v = 0.0
        for k in 1...5 { v += sin(2 * .pi * f * Double(k) * t) / Double(k * k) }
        return v * min(1, t / attack) * min(1, max(0, (len - t) / release))
      }
    }
  }
}
func sub(_ buf: inout [Float], _ t0: Double, _ midi: Int, _ len: Double, _ amp: Double, decay: Double) {
  let f = hz(midi)
  add(&buf, t0, len, amp) { t in exp(-t * decay) * min(1, t / 0.008) * (sin(2 * .pi * f * t) + 0.18 * sin(4 * .pi * f * t)) }
}
func kick(_ t0: Double, _ amp: Double) {
  kickTimes.append(t0)
  add(&drums, t0, 0.32, amp) { t in exp(-t * 12) * sin(2 * .pi * (48 + 90 * exp(-t * 30)) * t) }
}
func hat(_ t0: Double, _ amp: Double, decay: Double = 85) { add(&drums, t0, 0.2, amp) { t in (rnd() - rnd()) * exp(-t * decay) } }
func clap(_ t0: Double, _ amp: Double) { add(&drums, t0, 0.2, amp) { t in (rnd() - rnd()) * exp(-t * 28) * (0.6 + 0.4 * sin(t * 420)) } }

// Chord shapes (semitones above the root) used by the styles.
let major: [[Int]] = [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 19]]            // I, vi, IV, V
let minor: [[Int]] = [[0, 3, 7, 10], [8, 12, 15, 19], [3, 7, 10, 14], [10, 14, 17, 21]]           // i, VI, III, VII

/* ---------- course styles ---------- */

func pianoBar(_ b: Int, _ t0: Double) {
  let c = major[b % 4].map { base + $0 }
  note(&inst, t0, c[0] - 12, 3.4, 0.10, pianoParts, thump: 0.08)
  note(&inst, t0 + 2 * beat, c[0] - 5, 1.6, 0.05, pianoParts, thump: 0.06)
  let order = [0, 2, 1, 3, 2, 3, 1, 2], vel = [1, 0.6, 0.72, 0.56, 0.82, 0.56, 0.66, 0.5]
  for i in 0..<8 where b >= 1 || i % 2 == 0 {
    note(&inst, t0 + Double(i) * beat / 2 + rnd() * 0.006, c[order[i]] + 12, 1.6, 0.05 * vel[i], pianoParts)
  }
  if b >= 4 { strings(t0, [c[0], c[1], c[2]], bar + 0.8, 0.026) }
  if b >= 8 && b % 2 == 0 {
    let motif: [[Int]] = [[14, 12, 11], [16, 14, 12], [12, 11, 9], [14, 16, 19]]
    let m = motif[(b / 2) % 4]
    for (i, pos) in [0.5, 2.0, 3.0].enumerated() { note(&inst, t0 + pos * beat, base + 24 + m[i], 2.4, 0.058, pianoParts, thump: 0.02) }
  }
}

func acousticBar(_ b: Int, _ t0: Double) {
  let prog: [[Int]] = [[0, 4, 7, 12], [7, 11, 14, 19], [9, 12, 16, 19], [5, 9, 12, 16]]
  let c = prog[b % 4].map { base + $0 }
  strings(t0, [c[0], c[1], c[2]], bar + 0.6, 0.02, attack: 0.7, release: 0.7)
  sub(&inst, t0, c[0] - 12, beat * 2, 0.10, decay: 2.4)
  sub(&inst, t0 + 2.5 * beat, c[0] - 12, beat * 1.4, 0.07, decay: 3.2)
  let order = [0, 1, 2, 3, 2, 1, 2, 3], vel = [1, 0.55, 0.7, 0.8, 0.55, 0.65, 0.75, 0.55]
  for i in 0..<8 where b >= 1 {
    note(&inst, t0 + Double(i) * beat / 2 + rnd() * 0.005, c[order[i]] + 12, 0.9, 0.06 * vel[i], pluckParts, thump: 0.12, release: 0.05)
  }
  if b >= 4 { kick(t0, 0.13) }
  if b >= 2 { for k in [1, 3] { hat(t0 + Double(k) * beat, 0.012, decay: 40) } }
}

func ambientBar(_ b: Int, _ t0: Double) {
  guard b % 2 == 0 else {
    let c = major[(b / 2) % 4].map { base + $0 }
    // glass notes on the second bar of each chord
    note(&inst, t0 + 0.5 * beat, c[3] + 24, 3.0, 0.04, glassParts, thump: 0)
    note(&inst, t0 + 2.5 * beat, c[2] + 24, 3.0, 0.034, glassParts, thump: 0)
    return
  }
  let c = major[(b / 2) % 4].map { base + $0 }
  strings(t0, c, bar * 2 + 1.6, 0.03, attack: 1.8, release: 1.8)
  strings(t0, [c[0] + 12, c[2] + 12], bar * 2 + 1.6, 0.012, attack: 2.4, release: 2.0)
  sub(&pad, t0, c[0] - 24, bar * 2, 0.045, decay: 0.15)
  note(&inst, t0 + 0.5 * beat, c[2] + 24, 3.0, 0.036, glassParts, thump: 0)
  note(&inst, t0 + 2.5 * beat, c[3] + 24, 3.0, 0.03, glassParts, thump: 0)
}

/* ---------- tools styles ---------- */

func pulseBar(_ b: Int, _ t0: Double) {
  let c = minor[b % 4].map { base + $0 }
  strings(t0, [c[0], c[1], c[2]], bar + 0.4, 0.026, attack: 0.5, release: 0.5)
  if b >= 2 {
    for i in 0..<8 { sub(&inst, t0 + Double(i) * beat / 2, c[0] - 12, beat * 0.7, i % 2 == 0 ? 0.12 : 0.085, decay: 7) }
    for k in [0, 2] { kick(t0 + Double(k) * beat, 0.26) }
    note(&inst, t0, c[1] + 12, 1.3, 0.05, pianoParts, thump: 0.03)
    note(&inst, t0, c[2] + 12, 1.3, 0.045, pianoParts, thump: 0)
    note(&inst, t0 + 2.5 * beat, c[2] + 12, 0.9, 0.038, pianoParts, thump: 0)
  }
  if b >= 4 { for i in 0..<16 { hat(t0 + Double(i) * beat / 4, i % 4 == 2 ? 0.02 : 0.011) } }
  if b >= 6 {
    let order = b % 2 == 0 ? [0, -1, 1, -1, 2, -1, 1, 0] : [2, -1, 1, 2, -1, 1, -1, 0]
    for (i, o) in order.enumerated() where o >= 0 { note(&inst, t0 + Double(i) * beat / 2, c[o] + 24, 0.8, 0.045, glassParts, thump: 0) }
  }
}

func houseBar(_ b: Int, _ t0: Double) {
  let c = minor[b % 4].map { base + $0 }
  strings(t0, [c[0], c[1], c[2]], bar + 0.3, 0.032, attack: 0.3, release: 0.3)
  if b >= 1 { for k in 0..<4 { kick(t0 + Double(k) * beat, 0.3) } }
  if b >= 2 {
    for k in 0..<4 { sub(&inst, t0 + (Double(k) + 0.5) * beat, c[0] - 12, beat * 0.45, 0.14, decay: 9) }
    for k in 0..<4 { hat(t0 + (Double(k) + 0.5) * beat, 0.03, decay: 34) }
  }
  if b >= 3 {
    for pos in [0.5, 2.5, 3.5] { for m in c.prefix(3) { note(&inst, t0 + pos * beat, m + 12, 0.34, 0.03, pluckParts, thump: 0) } }
  }
  if b >= 4 { for k in [1, 3] { clap(t0 + Double(k) * beat, 0.07) } }
}

func minimalBar(_ b: Int, _ t0: Double) {
  let prog: [[Int]] = [[0, 3, 7, 10], [8, 12, 15, 19], [3, 7, 10, 14], [10, 14, 17, 21]]
  let c = prog[b % 4].map { base + $0 }
  let order = [0, 2, 1, 2, 0, 2, 1, 2], vel = [1, 0.62, 0.8, 0.6, 0.9, 0.62, 0.78, 0.58]
  for i in 0..<8 { note(&inst, t0 + Double(i) * beat / 2, c[order[i]] + 12, 0.32, 0.05 * vel[i], pianoParts, thump: 0.05, release: 0.05) }
  if b >= 2 { strings(t0, [c[0], c[1], c[2]], bar + 0.8, 0.03, attack: 1.2, release: 1.0) }
  if b >= 4 { kick(t0, 0.2) }
  if b >= 4 { for k in [1, 3] { hat(t0 + Double(k) * beat, 0.012, decay: 60) } }
  if b >= 6 { note(&inst, t0, c[0] - 12, 2.8, 0.09, pianoParts, thump: 0.06) }
}

var b = 0
while Double(b) * bar < spec.duration {
  let t0 = Double(b) * bar
  switch spec.style {
  case "acoustic": acousticBar(b, t0)
  case "ambient": ambientBar(b, t0)
  case "pulse": pulseBar(b, t0)
  case "house": houseBar(b, t0)
  case "minimal": minimalBar(b, t0)
  default: pianoBar(b, t0)
  }
  b += 1
}

// A little space: echoes on the tonal bus.
var taps: [(Double, Float)] = [(beat * 0.75, 0.3), (beat * 1.5, 0.18), (beat * 2.25, 0.1)]
if spec.style == "ambient" { taps = [(beat * 1.5, 0.42), (beat * 3.0, 0.3), (beat * 4.5, 0.2)] }
var echoed = inst
for (d, g) in taps {
  let off = Int(d * sr)
  if off < n { for i in off..<n { echoed[i] += inst[i - off] * g } }
}

// Pumping: the pad (and for house, the notes) dip on each kick.
let pump = spec.style == "house" ? 0.55 : (spec.style == "pulse" ? 0.3 : 0.0)
if pump > 0 {
  let sorted = kickTimes.sorted()
  var k = 0
  for i in 0..<n {
    let t = Double(i) / sr
    while k + 1 < sorted.count && sorted[k + 1] <= t { k += 1 }
    if !sorted.isEmpty && sorted[k] <= t {
      let dip = Float(1 - pump * exp(-(t - sorted[k]) * 9))
      pad[i] *= dip
      if spec.style == "house" { echoed[i] *= dip }
    }
  }
}

// Mix, set the loudness, soften the peaks, fade in and out.
var mix = [Double](repeating: 0, count: n)
var sum = 0.0
for i in 0..<n { mix[i] = Double(pad[i]) + Double(echoed[i]) + Double(drums[i]); sum += mix[i] * mix[i] }
let rms = max(0.0001, sqrt(sum / Double(n)))
let gain = 0.15 / rms
var out = [Float](repeating: 0, count: n)
for i in 0..<n {
  let fin = min(1, Double(i) / (0.8 * sr)), fout = min(1, Double(n - i) / (2.4 * sr))
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
