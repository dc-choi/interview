// 릴스 프레임의 화면 글자를 macOS Vision으로 읽는다. VL reel-extract가 S/bin/reel-ocr로 빌드해(소스가 더 새로우면 다시)
// 프레임 이미지 경로를 순서대로 넘긴다. 프레임마다 "파일이름<TAB>줄1 / 줄2 ..."를 출력하되, 앞선 프레임을 포함해 전체에서
// 처음 나온 줄만 쓴다(같은 자막과 배경 로고의 반복을 줄인다). 신뢰도 0.3 미만의 줄은 버린다. 읽지 못한 이미지와 실패한
// 인식 요청은 세어 stderr에 남기고, 모든 프레임이 실패하면 종료 코드 1로 끝낸다.
import AppKit
import Foundation
import Vision

let paths = Array(CommandLine.arguments.dropFirst())
var seen = Set<String>()
var failed = 0
for path in paths {
    autoreleasepool {  // 프레임마다 이미지와 요청의 메모리를 바로 놓는다(최대 300프레임).
        guard let image = NSImage(contentsOfFile: path),
              let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            failed += 1
            return
        }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["ko-KR", "en-US"]
        request.usesLanguageCorrection = true
        do {
            try VNImageRequestHandler(cgImage: cg, options: [:]).perform([request])
        } catch {
            failed += 1
            return
        }
        let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first }
            .filter { $0.confidence >= 0.3 }
            .map { $0.string.trimmingCharacters(in: .whitespacesAndNewlines) }
        let fresh = lines.filter { !$0.isEmpty && seen.insert($0).inserted }
        if !fresh.isEmpty {
            print((path as NSString).lastPathComponent + "\t" + fresh.joined(separator: " / "))
        }
    }
}
if failed > 0 {
    FileHandle.standardError.write(Data("읽지 못한 프레임 \(failed)/\(paths.count)\n".utf8))
}
exit(!paths.isEmpty && failed == paths.count ? 1 : 0)
