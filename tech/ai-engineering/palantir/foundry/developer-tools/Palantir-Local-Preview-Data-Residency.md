---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["로컬 preview의 데이터 반출과 저장 수명"]
---

# 로컬 preview의 데이터 반출과 저장 수명

## 권한과 실행 위치

Local VS Code preview에는 관리자의 활성화와 모든 입력 dataset의 Download 권한이 필요하다. 증분 preview는 출력 dataset의 Download도 요구한다. 이 권한은 전체 dataset을 내려받을 수 있는 권한이므로 UI의 작은 sample만을 허용하는 권한과 다르다.

VS Code workspace는 플랫폼 인프라에서 실행한다. Local extension은 사용자의 컴퓨터에서 코드와 데이터가 실행된다. Extension이 제공되는 enrollment라고 해서 모든 사용자의 local 사용이 자동으로 허용되는 것은 아니다. 현재 문서는 VSIX를 플랫폼에서 내려받으며 VS Code Marketplace에 제공되지 않는다고 명시한다.

## 입력과 결과의 저장을 구분한다

Local preview는 S3-compatible API로 입력 일부를 메모리로 스트리밍하고 내장 입력 cache도 메모리에 둔다. 그러나 출력 결과는 최대 10,000행을 로컬 cache 폴더에 저장해 preview table을 표시한다. 입력을 disk에 저장하지 않는다는 문장을 로컬 데이터가 전혀 남지 않는다고 해석하지 않는다.

결과 cache는 다음 preview 시작, 정상 VS Code 종료와 시작 시 삭제하며 명령으로 지울 수도 있다. 비정상 종료 뒤 즉시 삭제가 보장된다고 확대하지 않는다. Cache 경로를 설정할 수 있으며 audit log는 접근 기록을 제공한다.

이 경로는 우발적 반출을 줄이려는 기능이다. 사용자가 transform 코드로 임의 파일을 쓰는 의도적 반출을 방지하지 못한다고 원문이 명시한다. 플랫폼 workspace도 표시한 결과가 브라우저에 보이는 경계는 남는다.

External transform의 workspace marking 검사에는 과거 입력과 container marking 이력이 반영된다. 현재 input만 보고 허용 여부를 판단하지 않는다. 이 문서는 실제 로컬 설치/다운로드/cache 삭제 시험을 수행한 결과가 아니다.

## 출처

- [Palantir palantir-extension-for-visual-studio-code, palantir-extension-for-visual-studio-code](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code)
- [Palantir palantir-extension-for-visual-studio-code, active-preview](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/active-preview)
- [Palantir palantir-extension-for-visual-studio-code, code-defined-filtering](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/code-defined-filtering)
- [Palantir palantir-extension-for-visual-studio-code, debug-transforms](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/debug-transforms)
- [Palantir palantir-extension-for-visual-studio-code, environment-debugger](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/environment-debugger)
- [Palantir palantir-extension-for-visual-studio-code, extension-features](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/extension-features)
- [Palantir palantir-extension-for-visual-studio-code, overview](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/overview)
- [Palantir palantir-extension-for-visual-studio-code, python-libraries](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/python-libraries)
- [Palantir palantir-extension-for-visual-studio-code, security-considerations](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/security-considerations)
- [Palantir palantir-extension-for-visual-studio-code, transforms-build](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/transforms-build)
- [Palantir palantir-extension-for-visual-studio-code, transforms-preview](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/transforms-preview)
- [Palantir palantir-extension-for-visual-studio-code, transforms-type-hints](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/transforms-type-hints)

## 관련 문서

- [[Palantir-Developer-Tools]]
