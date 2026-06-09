---
tags: [messaging, aws, eventbridge, event-pattern]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["EventBridge Event Pattern", "이벤트 패턴 매칭", "EventBridge 패턴 연산자"]
---

# EventBridge 이벤트 패턴 매칭

> 상위 문서: [[EventBridge|Amazon EventBridge]]

규칙(Rule)이 어떤 이벤트를 잡을지 정의하는 JSON 패턴. 이벤트 구조를 미러링한 **부분 집합 필터**다. 매칭되면 그 규칙의 타겟으로 이벤트가 흐른다.

## 매칭 동작 규칙 (연산자보다 먼저)

이 규칙을 모르면 패턴이 왜 매칭 안 되는지 한참 헤맨다.

- **구조 미러링**: 이벤트의 `detail.status`를 매칭하려면 패턴도 `detail` 안에 `status`를 넣어야 한다. 평평하게 못 쓴다.
- **값은 항상 배열로 감싼다**: 단일 값이어도 `["running"]`.
- **같은 필드의 배열 안 = OR**: `"status": ["Paid", "Refunded"]`는 둘 중 하나만 맞으면 매칭.
- **서로 다른 필드 간 = AND**: `source`와 `detail.status`를 같이 쓰면 전부 맞아야 한다.
- **부분 집합 필터**: 패턴에 명시한 필드만 검사한다. 이벤트에 추가 필드가 더 있어도 무시하고 매칭.
- **문자열은 기본 대소문자 구분**: `"Running"`과 `"running"`은 다른 값 (`equals-ignore-case`로 무시 가능).
- 패턴에 쓴 필드는 이벤트에 **존재해야** 매칭 (`exists: false`는 예외).

## 기준 이벤트 (아래 예시들의 공통 입력)

```json
{
  "source": "weeklylab.orders",
  "detail-type": "OrderCreated",
  "detail": {
    "orderId": "ord-1234", "amount": 50000, "status": "Paid",
    "region": "ap-northeast-2", "fileName": "receipt.pdf", "clientIp": "10.0.3.15"
  }
}
```

## 연산자별 문법

**정확한 값 (exact)** — 대소문자까지 일치
```json
{ "detail": { "status": ["Paid", "Refunded"] } }
```

**prefix / suffix** — 접두사, 접미사. `equals-ignore-case` 중첩 가능
```json
{ "detail": { "region": [{ "prefix": "ap-" }], "fileName": [{ "suffix": ".pdf" }] } }
{ "detail": { "orderId": [{ "prefix": { "equals-ignore-case": "ORD-" } }] } }
```

**anything-but** — 제외(부정). 값 목록, 숫자, prefix/suffix/wildcard/equals-ignore-case와 조합 가능
```json
{ "detail": { "status": [{ "anything-but": ["Cancelled", "Failed"] }] } }
{ "detail": { "region": [{ "anything-but": { "prefix": "us-" } }] } }
```

**numeric** — 숫자 비교와 범위. 연산자 `=, <, <=, >, >=`. 짝지어 범위로. 진짜 숫자 타입에만 동작(문자열 숫자 X)
```json
{ "detail": { "amount": [{ "numeric": [">=", 10000, "<", 100000] }] } }
```

**exists** — 필드 존재 여부. **leaf 노드(말단 값)에서만** 동작, 중간 객체 키엔 안 됨
```json
{ "detail": { "orderId": [{ "exists": true }] } }
```

**equals-ignore-case** — 대소문자 무시. 외부 유입 값이 들쭉날쭉할 때
```json
{ "detail": { "status": [{ "equals-ignore-case": "paid" }] } }
```

**cidr** — IP 대역. IPv4, IPv6 모두. (`10.0.3.15`는 `10.0.0.0/24` 밖, `10.0.0.0/16`이면 매칭)
```json
{ "detail": { "clientIp": [{ "cidr": "10.0.0.0/24" }] } }
```

**wildcard** — `*`는 0개 이상 임의 문자. prefix/suffix보다 유연. 연속 `**`는 금지
```json
{ "detail": { "fileName": [{ "wildcard": "receipt*.pdf" }] } }
```

**$or** — 필드 구성 자체가 다른 이종 조건을 OR로. `$or` 밖 필드는 항상 AND로 적용
```json
{
  "source": ["weeklylab.orders"],
  "$or": [
    { "detail": { "status": ["Paid"] } },
    { "detail": { "amount": [{ "numeric": [">", 100000] }] } }
  ]
}
```
→ source가 weeklylab.orders **그리고** (status가 Paid **또는** amount가 10만 초과).

**연산자 조합** — 한 배열 안에 여러 매처를 넣으면 OR로 묶인다
```json
{ "detail": { "status": [{ "prefix": "Pa" }, "Refunded", { "anything-but": "Failed" }] } }
```
→ Pa로 시작하거나, 정확히 Refunded거나, Failed만 아니면 매칭.

## 빠른 참조표

| 연산자 | 용도 | 예시 |
|---|---|---|
| (값) | 정확 일치 | `["running"]` |
| prefix / suffix | 접두, 접미사 | `[{ "prefix": "ap-" }]` |
| anything-but | 제외 | `[{ "anything-but": ["x"] }]` |
| numeric | 숫자 비교, 범위 | `[{ "numeric": [">=", 10] }]` |
| exists | 필드 존재 (leaf만) | `[{ "exists": true }]` |
| equals-ignore-case | 대소문자 무시 | `[{ "equals-ignore-case": "paid" }]` |
| cidr | IP 대역 | `[{ "cidr": "10.0.0.0/24" }]` |
| wildcard | 와일드카드 | `[{ "wildcard": "a*b" }]` |
| $or | 이종 조건 OR | 최상위 `$or: [...]` |

## 패턴 테스트

- **콘솔 Sandbox**: 실제 이벤트 JSON을 붙여넣고 패턴이 매칭되는지 즉석 검증.
- **TestEventPattern API**: 이 이벤트가 이 패턴에 매칭되는가를 코드로 검증. CI에서 패턴 회귀 테스트를 짤 때 유용.

## 관련 문서

- [[EventBridge|Amazon EventBridge]]
- [[EventBridge-SQS-Target|EventBridge → SQS 타겟 패턴]]
- [[SNS|SNS]]

## 출처

- [Amazon EventBridge event patterns — AWS 공식 문서](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)
</content>
