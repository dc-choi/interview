---
tags: [palantir, app-pairing, commands, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["App Pairing과 command 상태"]
---

# App Pairing과 command 상태

Cross-application interactivity는 같은 data를 다른 view로 확인하거나 한 앱의 맥락을 다른 앱의 기능으로 전달하는 연결점이다. Drag-and-drop은 명시적인 전달, App Pairing은 공유 상태 연결, Commands는 client-side operation 실행을 담당한다. 단순한 selection 동기화와 영구 data edit를 같은 동작으로 보지 않는다.

## Pairing은 visible widget과 scope에 의존한다

Workshop App Pairing widget에는 다른 앱이 발견할 수 있는 user-facing name이 필요하다. Widget이 visible해야 작동하므로 header 배치가 적합하다. Discovered application을 명시적으로 Pair하거나 iframe embedded app의 자동 pairing을 활용한다. Unpair하면 연결을 해제한다.

| 공유 상태 | 전송 범위 |
|---|---|
| Selection | 선택한 data/metadata. Workshop variable 변경도 paired app으로 전송 |
| Open data | 앱에서 열린 data. 현재 Graph에서만 지원 |
| Custom | Media type string과 Boolean/Date/Numeric/Numeric array/String/String array 등의 variable |

Graph에 열린 10개 object가 Open data로 들어오는 것과 선택한 object만 받는 것을 구분한다. Open data의 역방향 update를 Selection의 양방향 동작으로 일반화하지 않는다. 여러 embedded app은 성능에 영향을 주므로 필요한 view만 둔다.

Scope Id는 widget과 외부 app URL의 appPairingScopeId를 맞춰 연결 대상을 조정한다. 수동 pairing/unpairing으로 scope가 달라질 수 있다. 이 ID는 data authorization을 대체하는 보안 경계가 아니다. Gaia/Graph의 Object Synonym RIDs state를 Workshop으로 동기화하려면 enrichment가 필요하며 호환 payload가 확실할 때만 비활성화한다.

Auto open은 초기/변경 시점별로 고를 수 있다. Toast를 꺼도 오류 안내는 표시된다. Pause는 update 송수신을 멈추며 resume 시 latest state로 동기화한다. 중간 상태의 모든 event를 재생하는 queue로 취급하지 않는다.

## Command는 현재 앱 맥락에서 수행한다

Commands는 앱이 노출하는 client-side operation이며 Button Group on click, Metric Card, App Pairing variable listener에서 실행할 수 있다. Chatbot tool과 Notepad inline command에도 연결된다. 기본 target은 paired app이며 여러 app이 paired라면 실행 시 선택을 요구한다. New/existing map처럼 target을 명시할 수도 있다.

Input default, conditional trigger와 output-variable mapping을 구성한다. Button의 visibility/disabled 조건이 실제 command/data 권한을 대신하지 않는다. Derived value가 준비되기 전에 base variable 변화로 실행하면 stale input이 전송될 수 있으므로 derived variable 자체를 listener로 삼는다.

## Command chain은 transaction이 아니다

Chain은 같은 source application의 command를 추가한 순서로 실행하며 앞 output을 뒤 input으로 전달할 수 있다. 한 command가 실패해도 다음 command를 계속 실행한다. 전체 성공, 자동 rollback 또는 fail-fast를 전제하지 않는다. Completion action/event도 업무 성공의 별도 판정과 연결한다.

Prompt 모드는 always, missing any input, missing required, never/invalid skip 중에서 고른다. Button Group의 기본은 missing required prompt, App Pairing은 never/required missing skip이다. 자동 변수 trigger에서 사용자 입력창이 뜰 것이라고 가정하면 required input 누락으로 조용히 다음 command로 넘어갈 수 있다.

## 출처

- [Palantir, Cross-application interactivity](https://www.palantir.com/docs/foundry/cross-app-interactivity)
- [Palantir, App Pairing](https://www.palantir.com/docs/foundry/cross-app-interactivity/app-pairing)
- [Palantir, Commands](https://www.palantir.com/docs/foundry/cross-app-interactivity/commands-overview)

## 관련 문서

- [[Palantir-Drag-Payloads-and-Enrichment|Payload와 enrichment]]
- [[Palantir-Chatbot-Tools-and-Commands|Chatbot command tool]]
