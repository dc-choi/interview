---
tags: [cs, code-quality, immutability, oop]
status: done
category: "CS - 코드 품질"
aliases: ["방어적 복사 기본", "Defensive Copy Basics"]
---

# 방어적 복사 — 필요성과 적용 지점

## 왜 필요한가

참조 타입(객체, 배열, 컬렉션)은 **주소를 공유**한다. 따라서 외부가 내 객체의 참조를 잡고 있으면 **나 몰래 내부를 바꿀** 수 있다.

```
class Period {
  constructor(private start: Date, private end: Date) {
    if (start > end) throw new Error();
  }
}

const start = new Date('2026-01-01');
const end   = new Date('2026-12-31');
const period = new Period(start, end);

end.setFullYear(2000);   // ← 외부에서 end 수정
// 이제 period의 불변 조건(start <= end) 깨짐
```

Period는 "시작 ≤ 끝"이라는 **불변 조건**을 생성 시 검증했지만, 외부의 `end` 참조 수정으로 **조건이 사후에 깨짐**. 방어적 복사로 막을 수 있음.

## 두 적용 지점

### 1. 생성자 — 받은 객체를 복사해서 저장
```
class Period {
  private start: Date;
  private end: Date;

  constructor(start: Date, end: Date) {
    this.start = new Date(start);   // 복사
    this.end   = new Date(end);     // 복사

    if (this.start > this.end) throw new Error();   // 복사 후 검증
  }
}
```

### 2. Getter — 내부를 복사해서 반환
```
class Period {
  getStart(): Date {
    return new Date(this.start);   // 복사본 반환
  }
}

const p = period.getStart();
p.setFullYear(2000);   // 외부 복사본만 바뀌고 내부는 안전
```

## 검증 타이밍 — 복사 먼저, 검증 나중

순서를 바꾸면 **TOCTOU(Time-Of-Check Time-Of-Use)** 공격 노출:

```
// ❌ 위험
constructor(start: Date, end: Date) {
  if (start > end) throw new Error();      // 검증
  this.start = new Date(start);             // 복사 — 이 사이에 외부가 값 바꿀 수 있음
  this.end   = new Date(end);
}

// ✅ 안전
constructor(start: Date, end: Date) {
  this.start = new Date(start);             // 복사 먼저
  this.end   = new Date(end);
  if (this.start > this.end) throw new Error();  // 복사본으로 검증
}
```

멀티스레드, 이벤트 루프 환경에서 경쟁 조건 방지.
