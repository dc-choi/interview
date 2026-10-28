---
tags: [cs, typescript, compiler, tooling, performance]
status: done
verified_at: 2026-10-27
category: "CS - TypeScript"
aliases: ["TypeScript Native Compilers", "TypeScript 네이티브 컴파일러", "tsrs", "TypeScript 7 Go 포트"]
---

# TypeScript 네이티브 컴파일러 구현 선택

TypeScript 컴파일러는 JavaScript 구현에서 Go 포트로 넘어갔고, 그 위에 다른 언어로 옮긴 실험 구현도 나오고 있다. 더 빠른 구현을 고를 때는 속도보다 TypeScript 팀의 기준 구현과 같은 진단을 내는지, 쓰고 있는 도구가 기대는 API가 있는지를 먼저 본다.

## 구현 지형 (2026-10-27 확인)

| 구현 | 상태 | 확인할 경계 |
|---|---|---|
| TypeScript 6.x (JavaScript 구현) | 7.0 전환기에 기존 compiler API를 쓰는 도구를 위한 호환 패키지(`@typescript/typescript6`)로 남아 있다 | 기존 lint, loader 같은 도구의 기준선 |
| TypeScript 7.0 (Go 포트) | 2026-07-08 정식. TypeScript 팀의 기준 구현이다 | 안정 compiler API 없이 출시됐고, 기본값 변경과 제거된 옵션이 있다 |
| TypeScript 7.1 beta | 2026-10-20 공개. 여러 진입점으로 나뉜 새 API와 파일 확장자별 content mapper를 도입한다 | beta 단계이며 RC는 발표 시점 기준 약 한 달 뒤로 예고됐다 |
| tsrs (Rust 포트) | 2026-10-20 실험판 공개. Owner.com에서 시작한 포트를 Cloudflare와 VoidZero가 함께 Oxc 툴체인 안에서 개발한다. 2026-10-27 기준 npm `latest`는 2026-10-26 배포된 TypeScript 7.1 beta 대상 `0.20.0-ts7.1.0-beta`다 | 기준 구현과의 출력 차이, language server의 미검증 테스트 범위, language server에서 실행되지 않는 content mapper |

7.0으로 올릴 때의 설정 변화와 compiler API 공백은 [[option#TypeScript 7.0 전환|컴파일러 옵션의 7.0 전환]]에서 다룬다.

## 공개된 성능 수치와 조건

아래는 모두 제공자가 직접 측정해 공개한 값이다. 자기 코드베이스에서 같은 조건으로 다시 재기 전에는 기대치로만 쓴다.

- **7.1 beta와 7.0**: TypeScript 팀은 다섯 개 코드베이스를 기본 type checker thread 4개와 `--noEmit`으로 측정해 1.2~1.9배 빨라지고 메모리가 15.8~49.6% 줄었다고 발표했다. 같은 발표는 7.0이 6.0보다 약 10배 빠르다고 다시 적는다.
- **tsrs와 7.0**: Cloudflare는 같은 수의 type check worker로 비교해 최대 8배 빠르고 메모리를 약 70% 덜 쓴다고 발표했다. 벤치마크는 저장소의 `bench` 디렉터리에 있고 TypeScript 팀과 함께 같은 설정을 비교했다고 밝혔다. 발표 당시 기본 실행은 장비에 따라 바뀌는 적응형 설정이라 메모리를 더 쓰는 대신 빠르다고 설명했고, 이 설정의 수치는 본문에 내놓지 않았다. 측정한 코드베이스와 하드웨어는 발표 본문에서 확인하지 못했다. 2026-10-26 0.20.0 beta부터는 기본값이 기준 구현과 같은 checker 설정(checker 4개)이고 적응형 설정은 `--fast`로 켜므로, 발표 수치를 볼 때 어느 모드였는지부터 맞춘다.

## 대체 구현을 들일 때 확인할 것

1. **진단의 동일성**: 발표 시점의 tsrs는 진단 출력 순서 같은 차이가 있다고 밝히고 안정판 전까지 줄이겠다고 했다. 0.20.0 릴리스 기록은 기본 모드가 기준 구현의 checker 동작을 따르고, `--fast`는 알려진 경우에 진단과 종료 코드를 바꿀 수 있다고 적는다. CI가 `tsc` 출력 문자열이나 순서를 비교한다면 깨질 수 있으므로 오류 코드와 위치의 집합으로 비교하거나 기준 구현을 함께 돌린다.
2. **도구 API**: lint 규칙, bundler loader, 언어 서비스처럼 compiler API를 쓰는 도구는 구현이 그 API를 제공하는지에 묶인다. tsrs는 language server(`tsrs --lsp -stdio`)와 7.1 beta의 Node API 진입점을 제공한다. 다만 0.20.0 호환성 표 기준 Go fourslash 4,562개 그룹 가운데 4,092개가 통과하고 나머지는 건너뛰며, content mapper는 CLI와 `-b`에서만 실행되고 language server에서는 실행되지 않는다. 7.x의 새 API 자체도 7.1에서 도입되는 중이다.
3. **동작 추종 방식**: tsrs는 포크가 아니며 언어 설계와 방향은 TypeScript 팀이 정한다고 밝혔다. 기준 구현의 변경을 따라가는 방법으로는 에이전트가 upstream 변경을 검토하고 야간 호환성 표를 만든다는 계획만 공개됐다. 따라서 버전별 동작 차이는 직접 확인한다.
4. **역할 분리**: 빠른 구현은 편집 중 피드백이나 큰 저장소의 사전 검사에 쓰고, 배포 판정은 기준 구현으로 하는 식으로 역할을 나눌 수 있다(설계 제안).

## 확인 질문

- 기준 구현과 대체 구현의 진단이 다를 때 어느 쪽을 CI 판정 기준으로 삼는가
- 프로젝트가 쓰는 도구 가운데 compiler API나 언어 서비스에 기대는 것은 무엇인가
- 공개 벤치마크와 같은 조건(worker 수, `--noEmit`과 `--fast` 여부)으로 자기 저장소를 재 보았는가

## 출처

- [Introducing tsrs: a Port of TypeScript to Rust — Cloudflare Blog](https://blog.cloudflare.com/typescript-rust-port/)
- [tsrs 0.20.0 beta release notes — GitHub, oxc-project/tsrs](https://github.com/oxc-project/tsrs/blob/v0.20.0/docs/releases/0.20.0.md), [compatibility table](https://github.com/oxc-project/tsrs/blob/v0.20.0/docs/COMPATIBILITY.md) — 2026-10-27 기본 모드, language server와 content mapper 지원 범위 대조
- [Announcing TypeScript 7.1 Beta — TypeScript, Daniel Rosenwasser](https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/)
- [Announcing TypeScript 7.0 — TypeScript](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [tsrs - TypeScript 컴파일러의 Rust 이식판 — GeekNews](https://news.hada.io/topic?id=35724)

## 관련 문서

- [[compile|동작원리 (compile 인덱스)]]
- [[option|컴파일러 옵션]]
- [[TypeScript-AST|TypeScript와 AST]]
- [[Compile-and-Runtime|컴파일과 런타임]]
