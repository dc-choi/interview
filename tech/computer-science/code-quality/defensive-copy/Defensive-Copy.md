---
tags: [cs, code-quality, immutability, oop]
status: index
category: "CS - 코드 품질"
aliases: ["Defensive Copy", "방어적 복사"]
---

# 방어적 복사 (Defensive Copy)

객체의 **내부 상태를 외부 참조로부터 보호**하는 기법. 생성자, getter, setter 경계에서 **원본과 참조를 끊은 복사본**을 주고받는다. 불변성, 캡슐화의 핵심 도구.

- [[Defensive-Copy-Basics|필요성과 적용 지점 — 외부 참조 수정 문제, 생성자와 getter, TOCTOU 검증 타이밍]]
- [[Defensive-Copy-Depth-Collections|복사 깊이와 컬렉션 — 얕은 vs 깊은 복사, readonly 뷰, 성능 비용, JS 특수성]]
- [[Defensive-Copy-Immutable-Practice|불변 객체와 실무 적용 — Value Object, 적용 기준, 흔한 실수, 면접 체크포인트]]

## 출처
- [매일메일 — 방어적 복사](https://www.maeil-mail.kr/question/146)

## 관련 문서
- [[Code-Quality-Criteria|코드 품질의 기준]]
- [[OOP-vs-Procedural-In-Practice|OOP vs 절차지향 실무 (Rich Domain Model)]]
- [[JS-Value-vs-Reference|JS 원시, 참조, Call by Value]]
- [[Object-Property-Descriptor|Object 프로퍼티 디스크립터, 불변성]]
