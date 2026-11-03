---
tags: [ai, coding-agent, programming-language, compiler, capabilities]
status: done
verified_at: 2026-11-04
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent-Oriented Programming Languages", "에이전트용 프로그래밍 언어", "Zerolang과 Mog"]
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

## 관련 문서

- [[Programming-Language-Landscape|프로그래밍 언어의 구분 기준]]
- [[Agent-Code-Search|코드 검색과 컴파일러 근거]]
- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[Agent-Test-Verification-Behavior|에이전트 검증 행동]]
