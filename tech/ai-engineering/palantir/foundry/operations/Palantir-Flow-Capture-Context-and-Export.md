---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Flow Capture의 기록, 생성과 내보내기

## 기록 자원과 모델 입력

Flow Capture는 클릭, 스크린샷, 선택적인 마이크 음성과 전사, 문맥 metadata를 기록해 Markdown을 생성하는 beta 도구다. Enrollment에 없을 수 있으며 관리자가 Application access에서 활성화한다. 캡처 대상 URL은 같은 도메인과 같은 enrollment여야 한다.

자동 캡처는 클릭마다 화면을 저장하고 수동 캡처도 가능하다. Pause/Resume, Discard와 Done을 구분한다. 화면 크기 선택은 실제 표시 범위에 영향을 준다. 오디오를 켜지 않았다면 생성기에 말한 설명이 자동으로 생기지 않는다.

기록된 asset과 LLM에 포함된 asset은 다르다. Add to context한 이미지와 전사에만 In context 표시가 붙으며 그 자료만 생성에 사용된다. 외부 이미지도 업로드 후 선택해야 한다. 모델마다 이미지 수와 context 크기/비용이 달라 실패 시 모델 한도를 점검한다.

## 편집과 생성

Crop과 blur로 민감한 화면을 정리하고 전사 오류를 수정한다. 편집은 저장 전까지 staged 상태다. 삭제 표시한 이미지/오디오는 저장 전에는 복원할 수 있으나 저장 후 영구 제거된다.

일반 문서, 버그 보고, 기능 요청과 피드백 template은 생성 지시의 출발점이다. Regenerate는 현재 문서를 새 생성으로 덮고 append/modify는 현재 문맥을 유지해 수정한다. 생성 결과는 사용자가 검토하고 편집해야 한다.

## 보안과 export

캡처 자원에 원래 화면의 markings와 group access가 자동으로 보장된다고 가정하지 않는다. 생성한 Flow Capture 자원에 적절한 보안 검사를 맞추는 책임은 사용자에게 있다. Export 같은 민감한 동작 앞에 checkpoint를 둘 수 있다.

Notepad, Walkthrough, PDF와 이미지/Markdown zip으로 내보낼 수 있다. Walkthrough는 단계 구조를 강제하므로 export 후 내용이 달라질 수 있다. 플랫폼 밖 파일은 플랫폼 내부 자원과 다른 공유/보존 경계를 가진다.

## 출처

- [Palantir Foundry, flow-capture](https://www.palantir.com/docs/foundry/flow-capture/)
- [Palantir Foundry, generate-documentation](https://www.palantir.com/docs/foundry/flow-capture/generate-documentation/)
- [Palantir Foundry, overview](https://www.palantir.com/docs/foundry/flow-capture/overview/)
- [Palantir Foundry, record-a-workflow](https://www.palantir.com/docs/foundry/flow-capture/record-a-workflow/)

## 관련 문서

- [[Palantir-Foundry-Operations]]
