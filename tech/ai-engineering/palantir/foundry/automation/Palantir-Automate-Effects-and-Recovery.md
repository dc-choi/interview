---
tags: [palantir, automate, effect, retry, idempotency]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Automate effect와 실패 복구"]
---

# Automate effect와 실패 복구

Condition이 trigger해도 각 effect의 실행/성공은 별도로 관찰한다. Automate effect는 **at-least-once**이며 같은 trigger가 드물게 중복 실행될 수 있다. Stable ID, 처리 상태와 idempotency를 설계하고 외부 쓰기의 중복까지 고려한다.

## Object input shape가 실행 단위다

Single object/property input은 객체마다 실행하고 ObjectSet/list는 all/batch/group으로 실행한다. 두 shape를 같은 effect에 섞을 수 없다. Action parameter type은 condition type과 맞아야 한다.

Batch size는 최대치이지 최소 모음 크기가 아니므로 새 객체가 찰 때까지 기다리지 않는다. Group-by는 property exact match이며 array는 순서까지 같아야 같은 group이다. Per-object 병렬성은 한 trigger 안의 설정이고 automation 전체 event 수를 제한하지 않는다.

하나의 Action effect 안에 여러 Action을 추가하면 순서가 보장되지 않는다. 별도 Action/Logic/Function effect 둘 이상을 sequential로 설정해야 순서를 제어한다. 서로 다른 automation은 독립 병렬/비결정적 순서다.

## Sequential 실패는 성공한 fallback 뒤에도 멈춘다

Sequential은 partition 전체에서 앞 effect를 처리한 후 다음 effect로 간다. 특정 object가 실패하면 그 object의 후속 effect는 실행하지 않지만 성공한 다른 object는 계속한다. Fallback 성공도 실패 object의 chain을 재개하지 않는다. Parallel은 다른 effect의 실패와 독립이다.

Fallback Action은 원 input, error, automation RID/event ID를 받아 non-retryable 실패 또는 최대 retry 후 실패 object subset에 실행한다. Fallback은 sequential에서만 구성하며 event retry 대상이 아니다. Fallback 자체의 local retry 설정과 parent event retry를 구분한다.

## Retry 대상과 버전을 확인한다

Effect-local backoff는 constant/exponential과 factor 또는 duration jitter를 설정한다. Event retry는 retryable object/effect만 새 event로 실행하며 interval은 24시간 미만, 재시도 횟수 1~5(최초 제외)다. Rate limit/outage/ObjectVersionChanged 같은 transient를 설정 오류와 구분한다.

Manual Retry failed events는 선택 effect를 **최신 configuration**으로 실행한다. 과거 event와 같은 논리로 재현하는 것이 아니다. Manual batch 실패도 새 batch size 등으로 재시도할 수 있다. Retry event와 원 event의 연결을 남긴다.

Function effect 전용 문서는 retry policy를 설명하지만 일반 retry 문서의 effect-local 지원 목록은 Action/Logic만 적어 상충한다. 실제 function type/enrollment UI를 확인하고 일괄 지원을 확정하지 않는다.

## Function, Logic와 Action의 편집 계약이 다르다

Function effect는 computed output 경로이며 Ontology edit return을 apply하지 않는다. 편집하려면 function-backed Action을 쓴다. Async 지원 type은 submit/polling으로 최대 4시간 실행하고 미지원 type은 synchronous다. Stable >=1.0.0의 compatible auto-upgrade는 non-prerelease의 다음 major 전까지다.

Logic effect는 edit list를 반환하는 legacy Logic만 받는다. Staged writes를 켠 Logic은 output type이 바뀌어 새 major가 되므로 기존 auto-upgrade가 건너가지 않는다. Create action으로 감싸 Action effect에서 호출하거나 명시적으로 migration한다. Project scope는 Logic auto-upgrade를 지원하지 않는다. Per-object 기본 parallelism 20과 충돌/지연을 함께 본다.

## Notification은 수신자마다 평가한다

Recipient는 user/group static 또는 String/Array<String>의 ID property다. Recipient는 automation Viewer, trigger object와 multi-datasource의 모든 property, content function이 읽는 모든 object 접근이 필요하다. Manual run은 trigger를 bypass해 이 trigger-object 검사를 하지 않으므로 일반 자동 실행과 구분한다.

All/group/per-object에 따라 수신자별 메시지 수가 달라지고 content/attachment는 각 수신자 권한으로 render된다. Function은 `Notification | undefined`를 반환해 전송을 생략할 수 있다. Plain template의 previous property는 live+per-object에서만 사용한다. Dataset email preview는 선택 column 최대 50행이다.

Notepad/document template/Contour를 PDF 또는 inline image로 붙이고 locale를 정한다. Template object input은 type metadata를 노출하지 않아 실제 object type을 작성자가 맞춰야 한다. PDF가 만들어졌다는 사실과 올바른 수신자에게 도착했다는 것은 별도로 확인한다.

Administrator 알림은 일반 information과 per-user effect failure를 나눈다. Only administrators로 줄이면 admin이 아닌 수신자의 failure notification이 억제될 수 있다. User notification preference는 모든 automation에 공통 적용한다.

## 출처

- [Palantir, Effects](https://www.palantir.com/docs/foundry/automate/effects)
- [Palantir, Action effects](https://www.palantir.com/docs/foundry/automate/effect-actions)
- [Palantir, Function effects](https://www.palantir.com/docs/foundry/automate/effect-function)
- [Palantir, Logic effects](https://www.palantir.com/docs/foundry/automate/effect-logic)
- [Palantir, Notification effect](https://www.palantir.com/docs/foundry/automate/effect-notification)
- [Palantir, Effect settings](https://www.palantir.com/docs/foundry/automate/effect-settings)
- [Palantir, Fallback effect](https://www.palantir.com/docs/foundry/automate/effect-fallback)
- [Palantir, Manual and automatic retries](https://www.palantir.com/docs/foundry/automate/retries)
- [Palantir, Evaluation and effect errors](https://www.palantir.com/docs/foundry/automate/errors)
- [Palantir, Automation administrators](https://www.palantir.com/docs/foundry/automate/automation-administrators)
- [Palantir, Notification settings](https://www.palantir.com/docs/foundry/automate/notification-settings)
- [Palantir, Notify contract owners](https://www.palantir.com/docs/foundry/automate/example-dynamic-contract-owner)

## 관련 문서

- [[Palantir-Automate-Conditions-and-Scheduling|Trigger 의미와 평가]]
- [[Palantir-Action-External-Effects|Action 내부 외부 효과]]
- [[Palantir-Automate-Identity-and-History|실행 주체와 이력]]
