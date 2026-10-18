---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Slate 의존성 그래프와 이벤트 실행"]
---

# Slate 의존성 그래프와 이벤트 실행

## 값의 변화와 실행

Slate의 widget, query, function과 variable은 JSON을 내놓는 노드이며 Handlebars 참조가 의존성을 만든다. 기본 그래프는 DAG다. 값이 같으면 상류 노드를 다시 계산해도 하류가 재평가되지 않을 수 있다. 기본값을 자기 자신으로 다시 설정하는 reset이 실패하는 이유다. 원문은 entropy 값을 바꾸는 패턴을 제시한다.

이벤트로 변수를 설정하거나 쿼리를 실행하면 그래프 바깥에 순환을 만들 수 있다. 그래프가 DAG라는 사실이 이벤트까지 포함한 전체 앱의 비순환성과 결정성을 보장하지 않는다. 단순 계산은 함수와 의존성으로 표현하고 이벤트 사슬을 짧게 유지한다. 50개 이상 이벤트라는 기준은 리팩터링을 검토하는 휴리스틱이다.

## 초기화와 완료를 구분한다

- `slate.ready`는 페이지 프레임워크가 로드되고 쿼리가 시작한 시점이다. 쿼리 완료나 사용자 저장소 준비의 신호가 아니다.
- 사용자 저장소 기반 초기화는 `slate.userStorageChanged`와 해당 event value를 사용한다. 다른 창의 변경도 영향을 줄 수 있다.
- Query success/failure와 Function ran은 각각 해당 실행 결과의 신호다. 수동 쿼리를 실행한 뒤 하류 의존성은 그래프가 갱신하므로 모든 하류에 별도 success 이벤트를 연결할 필요는 없다.
- `slDisableAction` 반환은 이번 이벤트의 action만 막는다. 이벤트를 영구 비활성화하지 않는다. `slEventValue`는 선택 변경 후 값 등 트리거의 payload다.

## 함수의 격리와 직렬화

Slate JavaScript 함수와 이벤트 코드는 DOM, 외부 앱 상태를 직접 수정하지 않는 격리된 실행이다. 반환값을 하류가 소비하며 변수 변경은 variable.set action으로 수행한다. 함수는 async/await를 지원하지만 큐에서 하나씩 실행하므로 await하는 느린 함수가 뒤의 함수도 막는다.

입력이 없는 함수는 Recalculate만으로 다시 실행되지 않을 수 있다. 타이머 계산에는 바뀌는 입력이 필요하다. 함수 라이브러리는 일반 JavaScript이며 Handlebars를 내부에 넣지 않고 호출 인자로 값을 전달한다. 함수와 이벤트 편집기는 Handlebars helper를 지원하지 않는다.

HTML/Table의 동적 클릭 요소는 `slClickEvent`와 선택적 `slClickEventValue`를 쓰더라도 이벤트 이름 목록을 정적으로 등록해야 한다. 화면에서 해당 요소가 안 보인다는 이유로 이벤트가 등록되지 않아도 된다고 해석하지 않는다.

## 출처

- [Palantir slate, slate](https://www.palantir.com/docs/foundry/slate)
- [Palantir slate, applications-create](https://www.palantir.com/docs/foundry/slate/applications-create)
- [Palantir slate, applications-debug-problems](https://www.palantir.com/docs/foundry/slate/applications-debug-problems)
- [Palantir slate, applications-dependencies](https://www.palantir.com/docs/foundry/slate/applications-dependencies)
- [Palantir slate, applications-import-export](https://www.palantir.com/docs/foundry/slate/applications-import-export)
- [Palantir slate, applications-merging](https://www.palantir.com/docs/foundry/slate/applications-merging)
- [Palantir slate, applications-pages](https://www.palantir.com/docs/foundry/slate/applications-pages)
- [Palantir slate, applications-style-text](https://www.palantir.com/docs/foundry/slate/applications-style-text)
- [Palantir slate, applications-types](https://www.palantir.com/docs/foundry/slate/applications-types)
- [Palantir slate, applications-versioning](https://www.palantir.com/docs/foundry/slate/applications-versioning)
- [Palantir slate, applications-writeback](https://www.palantir.com/docs/foundry/slate/applications-writeback)
- [Palantir slate, best-practices-app-functionality](https://www.palantir.com/docs/foundry/slate/best-practices-app-functionality)
- [Palantir slate, best-practices-complex-layouts](https://www.palantir.com/docs/foundry/slate/best-practices-complex-layouts)
- [Palantir slate, best-practices-user-interaction](https://www.palantir.com/docs/foundry/slate/best-practices-user-interaction)
- [Palantir slate, concepts-events](https://www.palantir.com/docs/foundry/slate/concepts-events)
- [Palantir slate, concepts-events-and-actions-index](https://www.palantir.com/docs/foundry/slate/concepts-events-and-actions-index)
- [Palantir slate, concepts-foundry-functions](https://www.palantir.com/docs/foundry/slate/concepts-foundry-functions)
- [Palantir slate, concepts-functions](https://www.palantir.com/docs/foundry/slate/concepts-functions)
- [Palantir slate, concepts-handlebars](https://www.palantir.com/docs/foundry/slate/concepts-handlebars)
- [Palantir slate, concepts-object-context](https://www.palantir.com/docs/foundry/slate/concepts-object-context)
- [Palantir slate, concepts-object-sets](https://www.palantir.com/docs/foundry/slate/concepts-object-sets)
- [Palantir slate, concepts-osdk](https://www.palantir.com/docs/foundry/slate/concepts-osdk)
- [Palantir slate, concepts-queries](https://www.palantir.com/docs/foundry/slate/concepts-queries)
- [Palantir slate, concepts-styles](https://www.palantir.com/docs/foundry/slate/concepts-styles)
- [Palantir slate, concepts-variables](https://www.palantir.com/docs/foundry/slate/concepts-variables)
- [Palantir slate, faq](https://www.palantir.com/docs/foundry/slate/faq)
- [Palantir slate, logic-overview](https://www.palantir.com/docs/foundry/slate/logic-overview)
- [Palantir slate, marketplace-slate](https://www.palantir.com/docs/foundry/slate/marketplace-slate)
- [Palantir slate, navigation](https://www.palantir.com/docs/foundry/slate/navigation)
- [Palantir slate, overview](https://www.palantir.com/docs/foundry/slate/overview)
- [Palantir slate, public-applications-data-upload](https://www.palantir.com/docs/foundry/slate/public-applications-data-upload)
- [Palantir slate, read-write-overview](https://www.palantir.com/docs/foundry/slate/read-write-overview)
- [Palantir slate, references-convert-rows-columns](https://www.palantir.com/docs/foundry/slate/references-convert-rows-columns)
- [Palantir slate, references-helpers](https://www.palantir.com/docs/foundry/slate/references-helpers)
- [Palantir slate, references-indexes](https://www.palantir.com/docs/foundry/slate/references-indexes)
- [Palantir slate, references-query-perf](https://www.palantir.com/docs/foundry/slate/references-query-perf)
- [Palantir slate, references-writeback](https://www.palantir.com/docs/foundry/slate/references-writeback)
- [Palantir slate, style-overview](https://www.palantir.com/docs/foundry/slate/style-overview)
- [Palantir slate, styles-global-stylesheet](https://www.palantir.com/docs/foundry/slate/styles-global-stylesheet)
- [Palantir slate, widgets-advanced](https://www.palantir.com/docs/foundry/slate/widgets-advanced)
- [Palantir slate, widgets-chart](https://www.palantir.com/docs/foundry/slate/widgets-chart)
- [Palantir slate, widgets-container](https://www.palantir.com/docs/foundry/slate/widgets-container)
- [Palantir slate, widgets-control](https://www.palantir.com/docs/foundry/slate/widgets-control)
- [Palantir slate, widgets-platform](https://www.palantir.com/docs/foundry/slate/widgets-platform)
- [Palantir slate, widgets-text](https://www.palantir.com/docs/foundry/slate/widgets-text)
- [Palantir slate, widgets-time](https://www.palantir.com/docs/foundry/slate/widgets-time)
- [Palantir slate, widgets-visualization](https://www.palantir.com/docs/foundry/slate/widgets-visualization)

## 관련 문서

- [[Palantir-Slate]]
