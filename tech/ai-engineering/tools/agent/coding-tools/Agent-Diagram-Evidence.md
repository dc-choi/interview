---
tags: [ai, agent-skills, diagrams, evidence, architecture]
status: done
verified_at: 2026-10-28
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Diagram Evidence", "에이전트 다이어그램의 근거와 검증", "Archify"]
---

# 에이전트 다이어그램의 근거와 검증

에이전트가 생성한 다이어그램은 설명과 탐색을 돕는 산출물이다. 그림이 열리고 노드를 선택할 수 있다는 사실과 그림이 실제 시스템을 정확히 설명한다는 사실은 따로 검증한다.

## 입력의 성격에 따라 증거 기준을 정한다

| 입력 | 그림의 의미 | 확인할 근거 |
|---|---|---|
| 자연어로 설명한 업무 | 제안하거나 전달받은 절차 | 담당자, 분기 조건, 예외와 완료 기준 |
| 기존 Mermaid | 입력한 구조의 다른 표현 | 원본의 관계와 조건이 보존됐는지 |
| 실제 저장소 | 특정 소스 상태를 설명하는 구조 | 커밋, 진입점, 호출부, 설정과 실제 읽기/쓰기 위치 |

앞의 두 입력만으로 현재 구현을 확인했다고 표현하지 않는다. 실제 코드를 그릴 때도 설정에 등록된 기능, 주입된 어댑터와 정상 경로에서 호출되는 기능을 구분한다. 관계를 설명하는 화살표에는 호출이나 상태 변경을 뒷받침하는 위치가 필요하다.

## 구현 사례: 구조화된 입력과 독립 HTML

2026-10-28 공개 저장소의 README와 SKILL.md(version 3.2)를 확인한 Archify는 자연어 설명, Mermaid와 저장소를 입력으로 인터랙티브 HTML을 만드는 에이전트 스킬이다. Claude Code 전용 내장 명령이 아니라 별도로 제공되는 스킬이며, 공식 README는 Codex 등 여러 호스트도 안내한다.

일반 다이어그램 경로에서는 유형에 맞는 JSON 후보를 만들고 `finalize`로 검사와 전달을 수행하도록 지시한다. 공유용 결과는 독립 HTML이지만 작업 과정에는 후보 파일과 검증 기록이 별도로 있다. HTML 한 파일을 전달할 수 있다는 설명을 작업 상태와 이력도 파일 하나에 전부 포함된다는 뜻으로 확대하지 않는다. 새 요청마다 별도 폴더를 쓰고 같은 요청의 수정에는 기존 폴더를 재사용하므로, 모든 수정본이 자동으로 영구 보존된다고도 가정하지 않는다.

## 근거 고정과 품질 검사를 나눈다

Archify의 저장소 작성 지침은 저장소 URL과 40자리 커밋을 `meta.repository`에 기록하고, 출처를 그 커밋의 파일과 줄 범위에 연결하도록 요구한다. 검증 대상은 커밋된 바이트다. 미커밋 변경이나 `local-only` 링크 설정이 현재 작업 트리를 검증 가능한 스냅샷으로 바꿔 주지는 않는다.

스킬이 설명하는 `finalize` 성공은 포함된 `validate`, `deliver`, strict `check`, `browser-check` 관문의 통과를 뜻한다. 자동 검사 통과, 사람이 화면을 확인한 시각적 품질, 그림의 의미가 소스와 일치하는지는 구분해서 보고한다. 이 문서에서는 공개 작성 계약만 확인했으며 설치, 다이어그램 생성과 브라우저 검사는 실행하지 않았다.

실무 적용 제안: API 흐름을 공유한다면 정상 호출뿐 아니라 인증 실패, 재시도와 실제 저장 위치를 확인한다. 코드 링크가 있다는 사실로 설명의 정확성을 대신하지 않고, 해당 줄이 그림의 책임과 관계를 뒷받침하는지 읽는다.

## 도입 시 버전과 라이선스를 함께 확인한다

2026-10-28 README와 NOTICE는 현재 소스와 그 빌드 패키지의 기본 라이선스를 Apache-2.0으로 안내한다. 이전 MIT 배포와 허가는 유지되며, 별도로 버전 관리되는 DeepSeek Harness 어댑터와 제3자 구성요소에는 예외가 있다. 과거 소개의 MIT 표기를 최신 배포 전체에 그대로 적용하지 말고 사용할 리비전의 LICENSE, NOTICE와 구성요소별 고지를 확인한다.

## 출처

- [Archify README — tt-a1i](https://github.com/tt-a1i/archify) — 입력, 독립 HTML, 호스트와 현재 배포 안내.
- [Archify SKILL.md — tt-a1i](https://github.com/tt-a1i/archify/blob/main/archify/SKILL.md) — version 3.2의 후보 작성, 폴더 재사용과 검증 계약.
- [Archify, Repository-backed authoring](https://github.com/tt-a1i/archify/blob/main/archify/references/repository-authoring.md) — 커밋 고정, 호출과 쓰기 위치의 근거, 미커밋 변경의 경계.
- [Archify NOTICE — tt-a1i](https://github.com/tt-a1i/archify/blob/main/NOTICE) — Apache-2.0과 역사적 MIT 허가, 구성요소 예외.

## 관련 문서

- [[Agent-Skills|에이전트 스킬]] — 설치 경로와 외부 스킬 신뢰
- [[Agent-Code-Search|에이전트 코드 인텔리전스]] — 검색 후보와 구현 근거의 구분
- [[Operational-Manual-and-Improvement|업무 매뉴얼과 운영 개선]] — 업무 설명과 실제 수행 확인
