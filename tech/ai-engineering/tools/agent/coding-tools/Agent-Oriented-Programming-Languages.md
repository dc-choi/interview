---
tags: [ai, coding-agent, programming-language, compiler, capabilities]
status: done
verified_at: 2026-11-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent-Oriented Programming Languages", "에이전트용 프로그래밍 언어", "Zerolang과 Mog", "Expo Exact", "Contract 언어", "Text.js MCP"]
---

# 에이전트용 프로그래밍 언어의 편집과 실행 경계

에이전트용 언어는 코드 생성, 오류 수정과 실행을 모델이 다루기 쉽게 설계한다. 평가할 축은 문법의 낯섦보다 에이전트가 읽는 상태, 수정의 검증 시점, 사람의 검토 경로와 실행 권한이다. 생성하기 쉽다는 설계 목표와 정확성, 성능, 보안의 실증은 구분한다.

## 프로그램을 편집하는 표면과 실행 권한

2026-11-04 공식 저장소의 README와 설계 소개를 대조한 사례다. 실제 컴파일러와 런타임은 실행하지 않았다.

| 사례 | 설계의 초점 | 사람이 확인할 경계 |
|---|---|---|
| Zerolang (Vercel Labs) | 프로그램 정본인 의미 그래프를 에이전트가 질의하고 검사된 변경을 제출한다 | 사람이 읽는 텍스트 투영본과 그래프의 일치, 변경 뒤 업무 동작 |
| Mog (Voltropy) | 작은 정적 타입 언어를 호스트에 내장하고 부수 효과를 호스트가 제공하는 capability로 제한한다 | 허용한 호스트 함수의 실제 권한, 입력 검증과 자원 제한 |

### 그래프 편집과 텍스트 검토

Zerolang의 현재 설계에서 `zero.graph`는 graph-first 패키지의 컴파일러 입력이며, `.0` 파일은 사람이 읽는 투영본이다. 에이전트는 `zero query`와 `zero patch`를 기본 편집 경로로 쓴다. 오래된 그래프 해시, 기대와 다른 필드 값, 잘못된 구조와 타입 오류는 저장 전에 거부하도록 설계됐다.

사람이 투영본을 직접 수정할 때는 `zero import`, 그래프를 텍스트로 내보낼 때는 `zero export`를 사용하며 `zero verify-projection`으로 투영 경계를 확인한다. 사람이 읽을 수 없게 만드는 것이 이 구조의 필수조건은 아니다. 컴파일러의 변경 수락 뒤에도 과업 검증이 필요하다.

프로젝트는 실험 단계이며 호환성을 깨는 변경과 보안 문제 가능성을 명시한다. 짧은 시작 시간, 적은 메모리와 토큰 효율은 README의 목표이며 이 문서의 비교 측정 결과가 아니다.

### 내장 언어의 capability와 보안 보장

Mog는 스크립트에서 필요한 capability를 `requires`로 선언하고 호스트가 이를 제공하는 구조다. 파일, 네트워크와 시스템 접근은 호스트 함수로 연결하며, 선언하지 않은 capability 사용을 컴파일러가 거부하고 필요한 capability를 제공하지 않는 호스트는 실행을 거부하도록 설계한다. 생성 코드가 선언한 권한과 호스트가 실제로 부여한 권한을 함께 봐야 한다.

공식 README는 익숙한 Rust, Go와 TypeScript 계열 문법과 작은 언어 표면을 강조한다. 에이전트 친화성을 사람이 유지보수할 수 없다는 뜻으로 해석하지 않는다. README의 사용 예시에 등장하는 `http`, `model`, `ml`, `log`, `db`의 참조 구현은 같은 README의 미구현 목록에 있으므로, 문법 예제를 준비된 표준 라이브러리로 간주하지 않는다.

README가 연결한 설계 소개는 당시 보안 감사를 받지 않았고 보안 보장을 제공하지 않는다고 명시한다. 그 소개의 일부 구현 계획은 현재 README와 시점이 다르다. capability 설계나 Rust 사용만으로 샌드박스 탈출과 호스트 장애가 불가능하다고 확정하지 않으며, 현재 릴리스의 감사 여부와 실제 격리는 별도로 확인한다.

## UI 런타임이 관찰과 조작 명령을 제공한다

에이전트가 만든 앱을 에이전트가 직접 실행하고 확인하려면 화면을 읽는 경로와 조작 명령이 필요하다. OS 접근성 API나 스크린샷으로 앱 밖에서 읽는 방식([[Agent-Desktop-Accessibility-CLI|접근성 트리 기반 데스크톱 조작]])과 달리 아래 두 사례는 런타임이 그 명령을 직접 제공한다. 2026-11-16 공식 README와 문서를 대조했으며 실행하지 않았다.

| 사례 | 관찰과 조작 | 업데이트 중간의 화면을 피하는 방법 |
|---|---|---|
| Exact (Expo) | 웹, macOS, iOS, Linux에서 같은 10개 명령(`tree`, `screenshot`, `tap`, `type`, `state`, `layout`, `logs`, `clock`, `prefer`, `perf`)을 쓰고, 테스트 파일도 이 명령의 스크립트라 모든 호스트에서 그대로 실행한다 | 두 명령 사이에는 시간이 흐르지 않고 에이전트가 `clock +60000`이나 `clock settle`로 시계를 진행한다 |
| Text.js (`text mcp`) | React 앱을 문자 격자로 그리므로 MCP 도구가 화면을 일반 텍스트로 돌려주고, 페이지 이동, 키 입력과 route handler 호출을 받는다. 입력 도구는 바뀐 화면을 함께 돌려준다 | 예약된 프레임과 진행 중인 fetch가 없고 50ms 동안 변화가 없을 때까지 기다린 뒤 읽고, 1.5초 안에 멈추지 않으면 최신 화면에 busy 표시를 붙인다 |

Exact의 UI 언어 Contract는 뷰 안의 JavaScript와 I/O, 액션 안의 반복문과 `await`, 실행 계획 밖으로 나가는 탈출구를 의도적으로 뺐고, 네트워크, 파일, SQLite와 비밀 값 접근은 grant로 선언한다. 컴파일러는 안정적인 진단 ID와 소스 범위를 JSON으로 주고, 개발용 소스맵은 화면의 노드에서 그것을 선언한 줄로 돌아간다. 쓸 수 없는 데이터 경합은 에이전트도 만들 수 없다는 것은 README의 설계 의도이며 실증 결과가 아니다. 프로젝트는 pre-1.0이라 API 안정성과 하위 호환성이 없고 Android와 Windows는 초기 단계다. README의 할 일 앱 시연(2026-10-04, 깨끗한 클론에서 약 57분)에서는 macOS와 iOS의 첫 빌드가 약 25분을 차지했다는 자체 기록도 있다.

다음은 두 설계에서 도출한 적용 제안이다. 런타임이 시간과 화면 안정화를 통제하면 대기 시간에 기대는 불안정한 테스트를 줄일 수 있지만, 그 통제는 런타임 안의 동작에 한정된다. 외부 API 지연, OS 권한 창과 실제 기기 차이는 실제 환경 시험으로 따로 확인한다([[Deterministic-Test|Deterministic test]]).

## 기존 언어의 접근: 타입과 eDSL로 검토 경계를 만든다

새 언어를 만드는 대신 기존 언어의 타입 시스템을 생성 코드의 검토 경계로 쓰자는 주장도 있다. Haskell Foundation 기술 리더십 위원회는 2026-11-13 공개한 기술 비전에서 AI 작업 흐름의 큰 병목이 리뷰이고, 타입 안전성, 추상화와 참조 투명성이 리뷰하는 쪽에 유리하다고 주장한다. 도메인 전용 내장 언어(eDSL)를 빠르게 설계하고 필요한 곳에 제약을 표현하면 유연성을 잃지 않고 코드 생성에 강한 가드레일을 둘 수 있다고 본다. 형식 검증이나 바이브코딩에는 더 나은 언어가 있을 수 있지만 사람이 통제를 유지하는(human in the loop) 작업에는 Haskell보다 나은 언어가 없다는 것이 위원회의 입장이다.

같은 비전은 단계 실행 디버깅, 쓸모 있는 스택 추적과 성능 분석 보고를 편집기와 CLI, 스크립트 인터페이스로 제공해 LLM 주도 디버깅이 MCP 같은 별도 어댑터 없이 쓰게 하겠다는 목표와, GHC 자체 CI의 처리 시간을 6시간에서 2시간으로 줄이겠다는 목표도 적는다. 위원회의 목표와 주장이며 리뷰 시간이나 결함 감소를 측정한 결과가 아니다. 도입을 판단할 때는 아래 기준처럼 같은 과업의 검증 통과와 리뷰 시간으로 비교하고, 제약을 설계하는 비용과 빌드 시간도 함께 본다(적용 제안).

## 도입을 판단할 때

다음은 두 설계에서 도출한 적용 제안이다.

- 생성 성공률과 수정 횟수뿐 아니라 같은 과업의 검증 통과, 전체 지연과 사람의 리뷰 시간을 함께 잰다.
- 검사된 그래프 변경은 타입과 구조 검사의 결과다. 업무 요구사항 충족 여부는 별도 테스트로 확인한다.
- capability가 파일 함수 하나여도 허용 경로와 작업 종류가 넓으면 피해 범위가 크다. 호스트 경계의 입력 검사와 최소 권한을 확인한다.
- 기존 언어, 라이브러리와 운영 도구를 바꿀 비용도 비교한다. 새 언어의 존재만으로 기존 애플리케이션을 옮기지 않는다.

## 출처

- [Zerolang — Vercel Labs](https://github.com/vercel-labs/zerolang) — README의 graph-first 편집, 투영본 경계와 실험 단계 안내.
- [Mog — Voltropy](https://github.com/voltropy/mog) — README의 설계 원칙, capability와 미구현 참조 구현 목록.
- [Mog: A Programming Language for AI Agents — Mog 프로젝트 설계 소개](https://gist.github.com/belisarius222/203ac5edbc3306c34bf0481f451d4003) — 공식 README에서 연결한 소개. 호스트 권한 경계와 작성 당시 보안 감사 한계.
- [Exact — Expo](https://github.com/expo/exact) — 2026-11-16 README의 10개 에이전트 명령, 가상 시계, Contract가 뺀 기능과 grant, 진단과 소스맵, pre-1.0 상태와 시연 기록 대조.
- [Text.js — Anomaly](https://github.com/anomalyco/textjs) — 2026-11-16 README의 콘솔 렌더링 방식 대조.
- [Text.js Docs, MCP](https://github.com/anomalyco/textjs/blob/main/apps/web/src/docs/content/mcp.md) — 2026-11-16 `text mcp` 도구 목록, 입력 도구의 화면 반환과 idle 대기 조건 대조.
- [Expo의 Exact - React 없이 웹, iOS, macOS, Linux 앱을 만드는 AI 에이전트 중심 런타임 — GeekNews](https://news.hada.io/topic?id=36991) — 학습 계기. 댓글의 DSL 설계 우려와 Slint 비교는 의견으로만 참고.
- [Text.js - 브라우저 콘솔에서 동작하는 앱을 만드는 React 프레임워크 — GeekNews](https://news.hada.io/topic?id=37181) — 학습 계기.
- [A technical vision for the Haskell ecosystem — Haskell Discourse, Haskell Foundation 기술 리더십 위원회](https://discourse.haskell.org/t/a-technical-vision-for-the-haskell-ecosystem/15078) — 2026-11-13 게시. 리뷰 병목과 eDSL 가드레일 주장, 디버깅과 CI 목표를 2026-11-16 원문으로 대조.
- [Haskell 생태계를 위한 기술 비전 — GeekNews](https://news.hada.io/topic?id=37132) — 학습 계기. 요약의 자금 요청 접수 방식과 의견 수렴 기간은 원문 게시글에서 확인하지 못해 쓰지 않았다.

## 관련 문서

- [[Programming-Language-Landscape|프로그래밍 언어의 구분 기준]]
- [[Agent-Code-Search|코드 검색과 컴파일러 근거]]
- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[Agent-Test-Verification-Behavior|에이전트 검증 행동]]
- [[Agent-Desktop-Accessibility-CLI|접근성 트리 기반 데스크톱 조작]]
- [[Deterministic-Test|Deterministic test]]
