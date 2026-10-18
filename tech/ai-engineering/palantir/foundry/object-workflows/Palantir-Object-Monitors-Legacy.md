---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Legacy Object Monitors의 평가와 부작용

Object Monitors는 sunset이며 새 workflow는 Automate를 권장한다. 원문은 backward-compatible 대체라고 설명하지만 기존 monitor의 subscriber, 조건과 effect를 검증한 뒤 이전한다. 데이터 내용 변화 감시와 pipeline health monitoring은 다른 문제다.

입력은 저장 exploration이다. Monitor 저장 당시 exploration 정의를 보관하므로 원래 exploration 수정이 자동 반영되지 않는다. Out-of-sync banner에서 다시 맞춘다. Event는 객체 추가/제거 같은 이산 사건이고 threshold는 false→true trigger, true→false recover다. Function-backed 조건은 ObjectSet을 받아 Boolean 하나를 반환하는 threshold이며 realtime 미지원이다.

## 평가와 실행 주체

모든 평가/Action은 subscriber별 권한과 validation으로 실행한다. 여러 사용자가 같은 Action을 설정하면 각각 실행된다. 다른 subscriber 대신 Action을 구성할 수 없고 unsubscribe/계정 비활성화/삭제 뒤에는 그 사용자의 Action이 중단된다. Affected ObjectSet은 Action을 설정한 사용자만 접근할 수 있어 Action notification 입력으로 재사용하지 못한다.

Realtime은 OSv2, 1,000만 미만 type, string exact/number range/Boolean filter, linked/array property 없음, object add/remove event 조건에서만 지원한다. Pipeline 변경은 보통 수분 내 감지하지만 Action 변경은 최대 7시간 걸릴 수 있다. 즉시 통지는 Action notification rule로 처리한다. Polling은 직전 평가 후 24시간 이내이며 정확한 시각 scheduling은 불가하다. Non-realtime manual evaluation은 설정 시험용이다. 시간 제한 예제의 currentTime/currentTimestamp 변수 불일치는 그대로 실행할 코드가 아니다.

## 운영 제한과 관측

- 시간당 12회, 일당 96회 trigger면 자동 disable한다.
- Added/removed input은 100,000개, subscriber는 30명, realtime type은 1,000만 상한이다. 저장 시 통과해도 이후 증가로 실패할 수 있다.
- Activity는 6개월 뒤 영구 삭제한다. Monitor expiration은 최대 현재부터 3개월이며 Editor가 연장한다.
- Mute는 모든 subscriber의 effect만 막고 평가는 계속한다. Disable은 평가 자체를 중단한다.

Evaluation failed에는 조건 평가 성공 뒤 notification/Action 실패도 포함될 수 있으므로 effect 오류를 분리한다. 구독하지 않은 기간의 activity는 표시/기록되지 않는다. Notification 선호는 사용자에게 전역 적용될 수 있고 monitor별 bell 설정과 구분한다. Template 또는 Function으로 내용을 구성하지만 민감한 객체 정보를 외부 통지에 담을 때 수신자 권한을 별도로 확인한다.

## 출처

- [Palantir, object-monitors](https://www.palantir.com/docs/foundry/object-monitors)
- [Palantir, actions](https://www.palantir.com/docs/foundry/object-monitors/actions)
- [Palantir, activity](https://www.palantir.com/docs/foundry/object-monitors/activity)
- [Palantir, condition](https://www.palantir.com/docs/foundry/object-monitors/condition)
- [Palantir, create_new_object_monitor](https://www.palantir.com/docs/foundry/object-monitors/create_new_object_monitor)
- [Palantir, errors](https://www.palantir.com/docs/foundry/object-monitors/errors)
- [Palantir, evaluation](https://www.palantir.com/docs/foundry/object-monitors/evaluation)
- [Palantir, input](https://www.palantir.com/docs/foundry/object-monitors/input)
- [Palantir, limits](https://www.palantir.com/docs/foundry/object-monitors/limits)
- [Palantir, monitor](https://www.palantir.com/docs/foundry/object-monitors/monitor)
- [Palantir, notifications](https://www.palantir.com/docs/foundry/object-monitors/notifications)
- [Palantir, overview](https://www.palantir.com/docs/foundry/object-monitors/overview)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
