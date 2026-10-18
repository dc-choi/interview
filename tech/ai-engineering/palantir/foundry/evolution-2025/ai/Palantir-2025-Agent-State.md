---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Agent의 검색 문맥, 상태와 실행 계약

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 검색과 상태를 분리하는 이유

2025년 Agent Studio는 질문에 답하는 도구에서 상태를 읽고 변경하는 실행 단위로 확장됐다. 아래 날짜는 당시 발표 기준이며 현재 SDK 지원 보장이 아니다.

- 2월 13일 Function-backed context 베타는 매 질문마다 사용자 정의 검색을 실행했다. TypeScript `@AipAgentsContextRetrieval`의 유일한 필수 입력은 `messages`다. 선택적 string/object set 인자를 같은 타입의 application variable에 연결한다. 반환 `RetrievedContext.retrievedPrompt`를 시스템 프롬프트 문맥으로 사용한다. 본문의 string 반환 설명과 코드의 wrapper 타입을 구분한다.
- 같은 발표의 citation은 object RID의 `<citation><key>…</key></citation>`, PDF의 `mediaSetKey`/`mediaItemKey`, 외부 URL의 `name`/`href`를 구분했다. PDF citation은 당시 첫 페이지를 열었다. Logic 직접 retrieval은 향후 계획이었고 TypeScript wrapper가 제시됐다.
- 2월 26일 query rewriting은 모호한 후속 질문을 검색용 질문으로 바꾸는 선택 기능이었다. 생성 응답의 정확성 보장과 별개다.
- 4월 1일 기존 read/write access mode를 명시적 Update application variable tool로 바꿨다. 변수 UUID 대신 이름으로 업데이트하며 기존 agent는 backend migration했다. 새 변수는 tool을 직접 연결한다.
- 같은 변경은 모델이 변수를 수정하도록 추론시키기보다 deterministic output을 권했다. Object query의 타입별 object set, string/object set 반환 Function, Ontology RAG의 상위 K 객체를 타입에 맞춰 출력한다. Object query에는 미리 필터링한 입력 object set도 지정할 수 있다.
- 변수의 현재값을 프롬프트에서 숨길 수 있다. tool 입력으로 쓰는 변수까지 모두 LLM에 노출할 필요는 없다. citation 선택 객체를 별도 변수로 받아 같은 Workshop 화면에 표시할 수도 있다.
- AIP Interactive textbox 변수를 외부에서 바꾸면 메시지를 전송한다. session identifier를 외부에서 바꾸면 새 세션을 만들거나 지정 `sessionRid`로 전환한다. 단순 UI 값 변경으로만 취급하면 예기치 않은 실행이 생긴다.

## 세션, context와 tool 호출의 확대

- 3월 12일 Agents as Functions는 Evals, Automate, Code Repositories와 다른 agent의 tool에서 agent를 실행하게 했다. Function publishing, 이름과 버전을 별도로 설정한다.
- 4월 22일 공지는 5월 5일 주 GA, AIP 활성화 필요, 기본 활성화를 알렸다. 기존 application access override는 유지한다. Threads의 즉석 질문, task agent, stateful agentic app, Functions/Automate 자율 실행을 서로 다른 단계로 설명했다.
- 5월 6일 indefinite conversation은 agent **버전별 opt-in**이다. 이후 버전은 상속하지만 기존 버전에 소급하지 않는다. Restricted View-backed object type은 당시 지원하지 않았다. Threads model mode와 agent mode의 설정 근원도 다르다.
- 5월 7일 citation 숨김, 외부 URL과 PDF chunk preview가 추가됐다. citation 표시 여부는 검색 실행 여부와 다르다.
- 6월 2일 object/function/document context를 함께 구성하고, 새 사용자 메시지마다 설정된 순서대로 해석한다. 전역 citation 설정과 object별 override를 구분한다.
- 7월 2일 모든 deployment의 세션을 함께 확인하는 화면과 Workshop session widget이 소개됐다.
- 8월 5일 native tool calling은 지원 모델의 Apply Action, Call Function, Object Query, Update Application Variable에 적용됐다. 병렬 호출과 이전 결과 재사용을 제공하며 다른 모델에는 prompted 방식이 남았다.
- 1월 image attachment는 media set에 올린 이미지나 기존 media item을 사용했다. agent Marketplace 배포도 1월 추가됐지만 개별 기능의 packaging 지원까지 일괄 보장하지 않았다.

## 적용 판단

검색 결과 표시, 변수 업데이트, Action 실행을 각각 시험한다. 세션 유지 기능을 권한 지속성으로 해석하지 않고, deterministic output과 tool 기반 변경을 구분해 재현한다. GA 공지의 기능 개요보다 실제 agent 버전, 모델과 object datasource의 제약을 우선 대조한다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [February 13, 2025, Enable custom retrieval with Function-backed context in AIP Agent Studio [Beta] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#c6a1dad2-8cd2-4f29-b3cd-f724989f69a0)
- [April 22, 2025, Introducing AIP Agent Studio [GA] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#c67344e2-41c3-451a-ba2b-47c669a69e40)
- [April 1, 2025, Redefining application variables in AIP agents — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#070ab8bc-6b0b-4f8c-9750-b59400a80c07)
- [August 5, 2025, Native tool calling mode now available in AIP Agent Studio — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#5a638a81-98f5-460d-a173-a0d5ae7cc64f)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
- [[Palantir-2025-Evaluation]]
- [[Palantir-2025-Workshop-State]]
