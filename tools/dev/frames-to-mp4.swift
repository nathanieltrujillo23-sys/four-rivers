// Turns a folder of screen-recording frames (with their times) into an H.264 .mp4 that plays on every phone and browser.
// Used by tools/dev/record-walkthroughs.mjs, which writes the manifest. Needs only macOS (AVFoundation).
//
//   swiftc -O tools/dev/frames-to-mp4.swift -o /tmp/frames-to-mp4 && /tmp/frames-to-mp4 manifest.json out.mp4 [soundtrack.m4a]
// With a soundtrack (AAC), it is added to the finished video without re-encoding either one.
import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

struct Frame: Decodable { let t: Double; let file: String }
struct Manifest: Decodable { let width: Int; let height: Int; let duration: Double; let fps: Double; let bitrate: Int; let frames: [Frame] }

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: frames-to-mp4 manifest.json out.mp4"); exit(2) }
let manifestURL = URL(fileURLWithPath: args[1])
let finalURL = URL(fileURLWithPath: args[2])
let audioURL: URL? = args.count > 3 ? URL(fileURLWithPath: args[3]) : nil
let outURL = audioURL == nil ? finalURL : URL(fileURLWithPath: args[2] + ".video.mp4")
let m = try JSONDecoder().decode(Manifest.self, from: Data(contentsOf: manifestURL))
let dir = manifestURL.deletingLastPathComponent()
try? FileManager.default.removeItem(at: outURL)
try? FileManager.default.removeItem(at: finalURL)

let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
let settings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: m.width,
  AVVideoHeightKey: m.height,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: m.bitrate,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoMaxKeyFrameIntervalKey: Int(m.fps * 3),
  ],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
  assetWriterInput: input,
  sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: m.width,
    kCVPixelBufferHeightKey as String: m.height,
  ])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func image(_ name: String) -> CGImage? {
  guard let src = CGImageSourceCreateWithURL(dir.appendingPathComponent(name) as CFURL, nil) else { return nil }
  return CGImageSourceCreateImageAtIndex(src, 0, nil)
}

let total = Int((m.duration * m.fps).rounded())
var idx = 0
var cachedIdx = -1
var cached: CGImage?
let space = CGColorSpaceCreateDeviceRGB()
for n in 0..<total {
  let t = Double(n) / m.fps
  while idx + 1 < m.frames.count && m.frames[idx + 1].t <= t { idx += 1 }
  if idx != cachedIdx { cached = image(m.frames[idx].file); cachedIdx = idx }
  while !input.isReadyForMoreMediaData { usleep(2000) }
  guard let pool = adaptor.pixelBufferPool else { continue }
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pb)
  guard let buffer = pb, let img = cached else { continue }
  CVPixelBufferLockBaseAddress(buffer, [])
  if let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: m.width, height: m.height, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: space, bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue) {
    ctx.draw(img, in: CGRect(x: 0, y: 0, width: m.width, height: m.height))
  }
  CVPixelBufferUnlockBaseAddress(buffer, [])
  adaptor.append(buffer, withPresentationTime: CMTime(value: Int64(n), timescale: Int32(m.fps)))
}
input.markAsFinished()
await writer.finishWriting()
guard writer.status == .completed else { print("failed: \(String(describing: writer.error))"); exit(1) }
if let audioURL {
  let comp = AVMutableComposition()
  let v = AVURLAsset(url: outURL), a = AVURLAsset(url: audioURL)
  let vt = try await v.loadTracks(withMediaType: .video)[0], at = try await a.loadTracks(withMediaType: .audio)[0]
  let vDur = try await v.load(.duration), aDur = try await a.load(.duration)
  let span = CMTimeMinimum(vDur, aDur)
  try comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!.insertTimeRange(CMTimeRange(start: .zero, duration: vDur), of: vt, at: .zero)
  try comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!.insertTimeRange(CMTimeRange(start: .zero, duration: span), of: at, at: .zero)
  let export = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough)!
  export.outputURL = finalURL
  export.outputFileType = .mp4
  export.shouldOptimizeForNetworkUse = true
  await export.export()
  try? FileManager.default.removeItem(at: outURL)
  guard export.status == .completed else { print("mux failed: \(String(describing: export.error))"); exit(1) }
}
print("wrote \(finalURL.path) (\(total) frames\(audioURL == nil ? "" : ", with sound"))")
