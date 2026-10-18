---
tags: [palantir, automate, event, schedule, streaming]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Automate 조건과 평가 시점"]
---

# Automate 조건과 평가 시점

Automate는 condition 평가와 effect 실행을 분리한다. Business automation이 목적이며 source/build의 운영 health check와 다르다. 조건이 같은 이름을 써도 object membership, property modification과 dataset commit의 trigger 의미는 다르다.

## 집합 진입은 객체 생성과 같지 않다

Objects added는 새 객체뿐 아니라 기존 객체가 filter를 만족해 집합에 진입할 때도 trigger한다. Filter가 없을 때만 type에 새로 추가된 객체가 대상이다. Objects removed는 filter를 벗어난 객체를 잡지만 **Ontology에서 삭제된 객체는 trigger하지 않는다**.

Objects modified는 선택 property 또는 모든 property의 변경을 감시한다. Include added/removed를 끄면 변경 전후 계속 집합에 남는 객체만 대상이고 켜면 집합 진입/이탈도 포함한다. 삭제는 여전히 대상이 아니다. 특정 값으로 바뀌는 사건이면 added+해당 값 filter가 더 명시적이다.

Run on all은 schedule/dependency마다 현재 전체 집합을 처리한다. Threshold crossed는 모든 Boolean check가 True가 되는 경계와 회복 방향 모두에 event/effect를 기록한다. Metric changed는 sunset이지만 기존 편집/지원이 남아 있어 deprecated/제거와 구분한다.

Saved exploration은 automation 저장 시 정의를 복사한다. Exploration 수정만으로 condition이 동적으로 갱신되지 않아 out-of-sync warning 후 automation을 업데이트해야 한다. Function-generated set은 `ObjectSet<T>`를 반환하고 system 한 번과 subscriber별 한 번씩 호출하므로 사용자 수에 따른 비용/권한을 고려한다.

## Live, scheduled와 dependency의 지원을 맞춘다

Live는 OSv2 index에 변경이 보인 뒤 수분 내 평가하며 patch와 backing base version은 지연이 다르다. OSv1→v2 이전 뒤 automation을 재저장한다. Relative-time, multi-type/joined/function-generated set, 일부 prefix/term/phrase filter, derived-property filter와 interface는 live를 지원하지 않는다.

Objects modified는 live만, threshold/metric-changed는 scheduled만 지원한다. Added/removed는 live/scheduled/dependency, Run on all은 scheduled/dependency다. Derived property filter는 scheduled에서 가능하다. Frequent schedule의 비싼 query는 compute를 크게 쓸 수 있다.

Stream-backed object의 live는 modified만 지원하고 감시 property를 골라 줄일 수 없다. 상태는 downstream Ontology에서 처리한다. Raw streaming dataset은 전용 stream condition과 초당 200 record 조건을 안내하며 binary input을 decode한다. Stream-backed 소개의 무제한 throughput 표현을 전체 effect/backend 처리량 보장으로 확대하지 않는다.

## Dataset condition은 commit의 전체 view를 평가한다

선택 dataset branch의 committed update마다 평가하고 그 transaction의 전체 row 수를 사용한다. 새로 추가된 row만 세거나 threshold를 넘는 순간만 trigger하는 것이 아니다. Row threshold는 0~300 integer지만 dataset 자체의 크기가 300행 제한인 것은 아니다. At least 1은 nonempty, At most 0은 empty update다. Automation은 Main에서 설정하며 Global Branching automation에는 미지원이다.

## Schedule과 실행 중첩을 구분한다

Cron은 minute/hour/day-of-month/month/day-of-week의 5 field다. Seconds/year/`W`는 안 되고 최소 1분, condition function이 있으면 5분이다. `* - / , L #`를 지원하고 여러 cron은 서로 겹치지 않아야 한다.

Time evaluation은 이전 평가가 끝나고 effects를 enqueue한 뒤 다음 평가를 예약한다. 평가 자체는 겹치지 않지만 이전 effects가 실행 중일 때 다음 평가가 시작될 수 있다. Effects 완료까지 기다리는 schedule로 해석하지 않는다.

Dependency는 parent 완료의 성공/실패와 무관하게 child를 평가하며 성공-only/실패-only 선택이 없다. Parent 하나의 1단계 연결만 지원하고 multi-level chain/branch는 미지원, monitored type은 project scope를 지원해야 한다. 선택 wait-time으로 평가를 늦출 수 있다.

Object condition 없는 dependency는 매 완료마다 dynamic object input 없이 실행한다. Object condition이 있을 때 Always trigger를 켜고 match가 비면 static effect는 한 번, per-object는 0번, all-object single effect는 empty set으로 한 번 실행한다. Empty input의 처리 의미를 function/Action에서 명시한다.

## 효과 수와 평가 수를 따로 관리한다

Queue effect executions는 event/run 사이를 trigger 순서대로 직렬화하고 event 내부 effect 병렬 설정은 유지한다. Live의 빠른 동시 edit는 batch별 trigger, scheduled는 지난 평가 이후 edit를 하나로 합친다. Process edits sequentially 해제는 live의 합침 동작을 바꾼다.

Skip peering patches는 live object condition에만 적용해 해당 event를 History에도 남기지 않는다. Scheduled/time은 그대로이며 backing source peering의 새 base version도 skip하지 않는다. 같은 automation이 양쪽 peer에서 중복 알림을 보내는 경우 patch/base-version을 구분해 설계한다.

## 출처

- [Palantir, Automate](https://www.palantir.com/docs/foundry/automate/overview)
- [Palantir, Object set conditions](https://www.palantir.com/docs/foundry/automate/condition-objects)
- [Palantir, Evaluation frequency](https://www.palantir.com/docs/foundry/automate/evaluation-frequency)
- [Palantir, Dataset condition](https://www.palantir.com/docs/foundry/automate/condition-dataset)
- [Palantir, Time condition](https://www.palantir.com/docs/foundry/automate/condition-time)
- [Palantir, Automation dependencies](https://www.palantir.com/docs/foundry/automate/automation-dependencies)
- [Palantir, Condition settings](https://www.palantir.com/docs/foundry/automate/condition-settings)
- [Palantir, Streaming](https://www.palantir.com/docs/foundry/automate/streaming)
- [Palantir, Auto-close inactive tickets](https://www.palantir.com/docs/foundry/automate/example-relative-time-condition)
- [Palantir, Send a weekly report](https://www.palantir.com/docs/foundry/automate/example-weekly-report)

## 관련 문서

- [[Palantir-Automate-Effects-and-Recovery|Effect와 retry]]
- [[Palantir-Automate-Identity-and-History|Identity와 history]]
- [[Palantir-Autopilot-Observability-and-Control|운영 관측]]
