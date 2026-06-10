---
tags: [cs, code-quality, immutability, oop]
status: done
category: "CS - 코드 품질"
aliases: ["방어적 복사 실무 적용", "Defensive Copy vs Immutable"]
---

# 방어적 복사 — 불변 객체와 실무 적용

## 방어적 복사 vs 불변 객체

완전한 해결: **처음부터 불변 객체**.

```
// 불변
class ImmutablePeriod {
  readonly start: Date;
  readonly end: Date;

  constructor(start: Date, end: Date) {
    this.start = new Date(start);
    this.end   = new Date(end);
    if (this.start > this.end) throw new Error();
    Object.freeze(this);
  }

  withStart(newStart: Date): ImmutablePeriod {
    return new ImmutablePeriod(newStart, this.end);   // 새 인스턴스
  }
}
```

- 외부가 수정하려 해도 **frozen** → strict mode에서 에러
- 수정이 필요하면 **새 인스턴스 반환** (Value Object 패턴)
- 방어적 복사 필요성 자체가 줄어듦

Value Object, DDD, 함수형 스타일에 자연스럽게 어울림.

## 언제 쓰는가

**반드시**:
- 불변 조건을 가진 엔티티 (기간, 범위, 금액)
- 생성자에서 받는 컬렉션, 배열
- 외부 API에 노출되는 getter

**선택적**:
- 내부 전용 유틸 클래스 (방어 비용 > 이득)
- 이미 불변으로 설계된 객체

**안 씀**:
- 원시 타입 파라미터 (string, number — 값 복사)
- 성능 크리티컬 핫패스 (측정 후 결정)

## 흔한 실수

- 검증 전에 복사 안 하고 **참조 그대로 저장** → TOCTOU 공격
- 얕은 복사만 하고 **깊은 객체 공유** → 불변성 파괴
- `Object.freeze`를 **얕게** 쓰고 깊은 것으로 착각
- getter에서 내부 배열 **그대로 반환** → 외부 수정 가능

## 면접 체크포인트

- 방어적 복사가 해결하는 문제 (외부 참조 수정)
- 생성자, getter 두 지점에 적용하는 이유
- 검증보다 복사가 먼저여야 하는 이유 (TOCTOU)
- 얕은 복사와 깊은 복사 선택 기준
- Value Object, 불변 객체로 가는 게 방어적 복사보다 나은 경우
- 컬렉션 getter에서 readonly, unmodifiable이 주는 이점
