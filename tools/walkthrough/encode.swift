// Encodes numbered JPEG frames plus timed narration clips into an H.264/AAC mp4
// using AVFoundation, so the walkthrough builds without ffmpeg.
//   swift encode.swift <framesDir> <fps> <width> <height> <audio.json> <out.mp4>
import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

let args = CommandLine.arguments
guard args.count == 7 else { fputs("usage: encode.swift frames fps w h audio.json out.mp4\n", stderr); exit(2) }
let framesDir = args[1]
let fps = Int32(args[2])!
let width = Int(args[3])!
let height = Int(args[4])!
let audioJSON = args[5]
let outPath = args[6]
let tmpVideo = NSTemporaryDirectory() + "walkthrough-video-only.mp4"
try? FileManager.default.removeItem(atPath: tmpVideo)
try? FileManager.default.removeItem(atPath: outPath)

let files = try FileManager.default.contentsOfDirectory(atPath: framesDir).filter { $0.hasSuffix(".jpg") }.sorted()

let writer = try AVAssetWriter(outputURL: URL(fileURLWithPath: tmpVideo), fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 8_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel],
])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let colorSpace = CGColorSpaceCreateDeviceRGB()
for (i, name) in files.enumerated() {
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.005) }
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: framesDir + "/" + name) as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("cannot read \(name)") }
    var buffer: CVPixelBuffer?
    CVPixelBufferCreate(nil, width, height, kCVPixelFormatType_32BGRA, nil, &buffer)
    let pb = buffer!
    CVPixelBufferLockBaseAddress(pb, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb), width: width, height: height, bitsPerComponent: 8,
                        bytesPerRow: CVPixelBufferGetBytesPerRow(pb), space: colorSpace,
                        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    CVPixelBufferUnlockBaseAddress(pb, [])
    adaptor.append(pb, withPresentationTime: CMTime(value: Int64(i), timescale: fps))
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed { fatalError("video write failed: \(String(describing: writer.error))") }

// Mix the narration clips onto the video track.
struct Clip: Decodable { let file: String; let start: Double }
let clips = try JSONDecoder().decode([Clip].self, from: Data(contentsOf: URL(fileURLWithPath: audioJSON)))
let comp = AVMutableComposition()
let videoAsset = AVURLAsset(url: URL(fileURLWithPath: tmpVideo))
let videoDone = DispatchSemaphore(value: 0)
var vTrack: AVAssetTrack?
var duration = CMTime.zero
Task {
    vTrack = try await videoAsset.loadTracks(withMediaType: .video).first
    duration = try await videoAsset.load(.duration)
    videoDone.signal()
}
videoDone.wait()
let compVideo = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
try compVideo.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: vTrack!, at: .zero)
let compAudio = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
for clip in clips {
    let a = AVURLAsset(url: URL(fileURLWithPath: clip.file))
    let sem = DispatchSemaphore(value: 0)
    var aTrack: AVAssetTrack?
    var aDur = CMTime.zero
    Task {
        aTrack = try await a.loadTracks(withMediaType: .audio).first
        aDur = try await a.load(.duration)
        sem.signal()
    }
    sem.wait()
    try compAudio.insertTimeRange(CMTimeRange(start: .zero, duration: aDur), of: aTrack!, at: CMTime(seconds: clip.start, preferredTimescale: 600))
}
guard let export = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetHighestQuality) else { fatalError("no export session") }
export.outputURL = URL(fileURLWithPath: outPath)
export.outputFileType = .mp4
let exportDone = DispatchSemaphore(value: 0)
Task {
    do { try await export.export(to: URL(fileURLWithPath: outPath), as: .mp4) } catch { fputs("export error: \(error)\n", stderr) }
    exportDone.signal()
}
exportDone.wait()
try? FileManager.default.removeItem(atPath: tmpVideo)
print("encoded \(files.count) frames")
