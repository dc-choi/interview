---
tags: [cs, javascript, object, descriptor, proxy, reflect, metaprogramming, global-object]
status: index
category: "CS - JavaScript"
aliases: ["JS Object Model", "객체 모델과 표준 내장 객체"]
---

# 객체 모델과 표준 내장 객체

object를 property 집합과 internal method의 조합으로 보는 관점 — descriptor와 불변성, Proxy/Reflect trap, 복사와 비교 연산의 계약, global object와 Realm, JSON과 Date 같은 built-in.

- [[Object-Property-Descriptor|프로퍼티 디스크립터]]: Object 불변성, writable/enumerable/configurable, getter와 setter, own과 inherited
- [[JavaScript-Proxy-and-Reflect|Proxy와 Reflect]]: trap, receiver, invariant
- [[JavaScript-Object-and-Array-Operations|Object와 Array 연산]]: 복사, descriptor, mutation, 목적별 equality 알고리즘
- [[JavaScript-Global-JSON-Date-and-Builtins|global object, JSON과 Date]]: Realm 경계, built-in과 host API의 구분

## 함께 볼 문서

- [[자바스크립트(JS)|JavaScript(JS)]]
