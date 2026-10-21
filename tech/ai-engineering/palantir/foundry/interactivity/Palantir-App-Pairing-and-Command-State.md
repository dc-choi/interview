---
tags: [palantir, app-pairing, commands, workshop]
status: done
verified_at: 2026-10-21
category: "AI엔지니어링(AIEngineering)"
aliases: ["App Pairing과 command 상태"]
---

# App Pairing과 command 상태

Cross-application interactivity는 같은 data를 다른 view로 확인하거나 한 앱의 맥락을 다른 앱의 기능으로 전달하는 연결점이다. Drag-and-drop은 명시적인 전달, App Pairing은 공유 상태 연결, Commands는 client-side operation 실행을 담당한다. 단순한 selection 동기화와 영구 data edit를 같은 동작으로 보지 않는다.

## Pairing은 visible widget과 scope에 의존한다

Workshop App Pairing widget에는 다른 앱이 발견할 수 있는 user-facing name이 필요하다. Widget이 visible해야 작동하므로 header 배치가 적합하다. 상대 앱을 열면 App Pairing menu에 Discovered로 표시되고, Pair해야 shared state variable이 갱신된다. Iframe widget으로 embed한 앱은 자동으로 발견되고 pair된다. 이 연결은 App Pairing widget의 Paired 목록에서 Unpair로 해제한다.

| 공유 상태 | 전송 범위 |
|---|---|
| Selection | 선택한 data/metadata. Workshop variable 변경도 paired app으로 전송 |
| Open data | 앱에 보이는 data. 현재 Graph에서만 지원 |
| Custom | 기본 variable type에 맞지 않는 data. Media type string이나 Boolean/Date/Numeric/Numeric array/String/String array type으로 기술 |

가장 많이 쓰는 selected objects variable이 기본으로 구성되어 있어, Gaia map이나 Graph analysis와 pair하면 이 variable의 기본값이 그 앱에서 현재 선택된 object를 기록한다. Add Variable로 Selection이나 Open data variable을 더 추가한다. Custom state variable 구성은 Palantir가 기존 preset을 갱신하지 않아도 이후의 앱 통합을 지원할 수 있게 한다.

Graph에 열린 10개 object가 pairing 시점에 모두 Open data로 들어오는 것과 선택한 object만 받는 것을 구분한다. 문서는 Workshop variable 변경의 paired app 전송을 Selection variable에 대해서만 설명하므로 Open data에도 역방향 전송이 있다고 가정하지 않는다. 여러 앱을 embed하면 성능에 영향을 줄 수 있으므로 필요한 앱만 embed한다. Iframe은 추가 memory와 processing 자원을 써 Workshop module의 안정성과 성능에 영향을 줄 수 있어 한 화면에 iframe widget을 둘 이상 두는 구성은 권장되지 않는다.

Scope Id는 서로 pair할 앱을 수동으로 조정하는 설정이다. Workshop이 자동 생성한 Scope Id variable로 Workshop widget을, URL에 붙인 `&appPairingScopeId=[scope-id]`로 Workshop이 아닌 앱을 같은 scope에 넣어 pairing할 수 있게 한다. 수동으로 pair하거나 unpair하면 scope가 바뀐다. 이 ID를 data authorization을 대체하는 보안 경계로 취급하지 않는다.

대부분의 workflow에는 data enrichment가 필요하지 않다. 예외로 Graph는 `Object Synonym RIDs set` variable type을 Workshop과 동기화할 때 enrichment가 필요하고, 앱이 synced artifact와 그 object 표현 사이를 변환한다면 enrichment 유지를 고려한다. Advanced의 Disable data enrichment는 paired app과 Workshop이 호환되는 state payload를 주고받는다고 확신할 때만 쓴다.

Appearance의 Display name은 pairing할 때 다른 앱에서 발견되는 이름이며 기본으로 Workshop application 이름이 표시된다. Auto open mode의 기본값은 Disabled라 App Pairing menu는 선택할 때만 열린다. 자동으로 열어 pair할 앱을 고르게 하려면 Enabled(초기 load와 pairing 변경 시), Only initially(앱 load 시), Only on pairing change(paired app이 바뀔 때마다) 중에서 고른다. 다른 앱이 pair할 때 알리는 toast는 기본으로 꺼져 있지만 오류 식별과 해결 안내 toast는 Enable toasts를 꺼도 표시된다. Enable toggle to pause updates도 기본으로 꺼져 있으며, 켜면 state update 송수신을 멈췄다가 재개할 수 있고 재개하면 latest state로 동기화한다. 중간 상태의 모든 event를 재생하는 queue로 취급하지 않는다.

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
- [Palantir, Iframe](https://www.palantir.com/docs/foundry/workshop/widgets-iframe)

## 관련 문서

- [[Palantir-Drag-Payloads-and-Enrichment|Payload와 enrichment]]
- [[Palantir-Chatbot-Tools-and-Commands|Chatbot command tool]]
- [[Palantir-Workshop-Embedding-and-Interop|Workshop embedding과 상태 계약]]
