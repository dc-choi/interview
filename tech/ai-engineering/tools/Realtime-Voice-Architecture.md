---
tags: [ai, voice, realtime, full-duplex, delegation]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["Realtime Voice Architecture", "실시간 음성 에이전트", "전이중 음성 대화"]
---

# 실시간 음성 에이전트의 대화와 작업 분리

실시간 음성 에이전트는 말소리를 주고받는 인터페이스와 실제 업무를 처리하는 실행 계층을 함께 가진다. 전이중(full duplex)은 상대의 말을 들으면서 동시에 말할 수 있다는 뜻이며, 업무 처리가 끝났다는 뜻은 아니다.

## 세 가지 구성

| 구성 | 처리 흐름 | 선택할 조건 |
|---|---|---|
| 연쇄 파이프라인 | 음성 인식 → 텍스트 워크플로 → 음성 합성 | 중간 텍스트를 검사하거나 각 단계를 교체해야 할 때 |
| 단일 음성 세션 | 한 모델이 음성 이해, 추론과 도구 사용, 음성 응답을 담당 | 음성과 도구 사용을 하나의 세션에서 다룰 때 |
| 전이중 대화와 별도 백엔드 | 음성 모델이 대화하고 필요한 작업을 백엔드에 위임 | 작업을 기다리는 동안에도 대화를 이어가고 기존 업무 흐름을 재사용할 때 |

2026-10-06 OpenAI 문서 기준으로 Realtime API는 단일 음성 세션, GPT-Live는 별도 백엔드를 쓰는 전이중 구성의 예다. 모든 음성 제품이 같은 구조를 갖는다는 뜻은 아니다.

## 대화 진행과 작업 완료를 나눈다

GPT-Live 구성에서 음성 모델은 말하기 방식과 위임 시점을 담당하고, 백엔드는 추론, 업무 규칙과 도구 흐름을 담당한다. 애플리케이션은 권한, 필요한 확인, 실제 함수 실행과 작업 기록을 관리한다.

사용자가 답변 중간에 끼어들어도 백엔드 작업은 계속될 수 있다. 음성 재생 중단과 작업 취소를 같은 사건으로 처리하지 않고, 계속할지 취소할지 애플리케이션이 결정한다. 백엔드 응답이 완료됐어도 사용자가 결과를 들었는지는 별도 확인 대상이다.

설명용 예시로 예약 도중 사용자가 날짜를 정정하면, 이미 실행 중인 이전 예약 요청과 새 요청을 구분해야 한다. 작업 상태와 취소 결과를 확인한 뒤 실제 저장된 예약에 맞는 완료 안내를 한다. 재시도의 중복 실행 방지는 [[LLM-Failure-Handling|실패 처리와 멱등성]]을 함께 적용한다.

## 백엔드 위임의 두 방식

GPT-Live의 공식 위임 구분은 다음과 같다.

- **Responses delegation:** 서비스가 설정된 Responses 모델에 대화 맥락을 전달하고 결과를 음성 모델로 돌려준다. 커스텀 함수 실행과 권한 확인은 애플리케이션이 맡는다.
- **Client delegation:** 애플리케이션이 맥락을 구성하고 자체 모델, 에이전트나 서비스를 실행한 뒤 결과를 반환한다. 반환 전 검증, 비식별화나 여러 결과의 조합이 필요한 경우 선택할 수 있다.

Client delegation의 위임 이벤트에는 작업 본문 대신 메타데이터가 들어온다. 전사 이벤트와 애플리케이션 상태로 요청을 구성해야 한다. 위임 모드는 세션 생성 때 선택하며 변경하려면 새 세션을 만든다(2026-10-06 확인).

## 연결 지연과 업무 지연을 따로 측정한다

브라우저의 WebRTC 연결에서는 음성을 미디어 트랙으로, JSON 이벤트를 데이터 채널로 운반한다. WARP(WebRTC Abridged Roundtrip Protocol)는 연결 시작 지연을 줄이는 최적화다. 연결이 빨라진 사실을 검색이나 도구 실행도 빨라졌다는 근거로 쓰지 않는다.

평가에서는 자연스러운 말투와 실제 업무 성공을 구분한다. 다음은 공식 평가 항목을 적용한 점검 질문이다.

- 실제 저장 결과와 말로 안내한 완료 내용이 일치하는가?
- 백엔드 작업 중 정정과 끼어들기에도 사용자 의도가 보존되는가?
- 들리는 응답까지의 지연, 불필요한 침묵과 발화 겹침이 얼마나 발생하는가?
- 연결 실패, 오디오 누락과 세션 시간 초과를 업무 판단 오류와 분리했는가?

## 출처

- [OpenAI, Voice agents](https://developers.openai.com/api/docs/guides/voice-agents)
- [OpenAI, Getting started with GPT-Live](https://developers.openai.com/api/docs/guides/live)
- [OpenAI, Delegation and tools in GPT-Live](https://developers.openai.com/api/docs/guides/live-delegation)
- [OpenAI, WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc)

## 관련 문서

- [[Local-Speech-to-Text|로컬 음성 인식]]
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]]
- [[LLM-Failure-Handling|실패 처리와 멱등성]]
