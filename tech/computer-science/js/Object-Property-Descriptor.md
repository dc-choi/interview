---
tags: [cs, javascript, object]
status: seminar
category: "CS&프로그래밍(CS&Programming)"
aliases: ["프로퍼티 디스크립터"]
---

# 프로퍼티디스크립터와Object불변성

## 프로퍼티디스크립터란

프로퍼티의 속성을 정의할 수 있는 메타데이터. 크게 3가지로 구분:

| 구분 | 판별 기준 | 속성 |
|------|----------|------|
| 데이터 디스크립터 | value 또는 writable이 있으면 | value, writable |
| 엑세스 디스크립터 | get 또는 set이 있으면 | get, set |
| 공용 디스크립터 | 둘 다 사용 가능 | enumerable, configurable |

- 데이터와 엑세스를 함께 작성할 수 없음 (value/writable과 get/set은 동시 사용 불가)

## 데이터디스크립터

### value
- 프로퍼티의 실제 값
- get/set과 동시 사용 불가

### writable
- 프로퍼티 값의 변경 가능 여부
- `false`면 값 변경 시 에러 없이 무시됨 (strict mode에서는 TypeError)

```javascript
Object.defineProperty(obj, 'name', {
  value: 'hello',
  writable: false
});
obj.name = 'world'; // 무시됨, obj.name은 여전히 'hello'
```

## 엑세스디스크립터

### get(Getter)
- 프로퍼티 값을 읽을 때 호출되는 함수
- 함수처럼 `()`으로 호출하면 에러 발생

### set(Setter)
- 프로퍼티 값을 변경할 때 호출되는 함수

```javascript
const obj = {
  _name: 'hello',
  get name() { return this._name; },
  set name(value) { this._name = value; }
};
console.log(obj.name);  // getter 호출 → 'hello'
obj.name = 'world';     // setter 호출
```

## 공용디스크립터

### enumerable
- `true`: `for...in`으로 열거 가능
- `false`: 열거에서 제외

### configurable
- `true`: 프로퍼티 삭제 가능, value 이외 속성 변경 가능
- `false`: 프로퍼티 삭제 불가, value 이외 속성 변경 불가

## Object불변성메서드

| 메서드 | 프로퍼티추가 | 프로퍼티삭제 | 값변경 |
|--------|------------|------------|--------|
| Object.seal() | X | X | **O** |
| Object.freeze() | X | X | X |

- `Object.seal()`: 추가/삭제만 금지, 기존 값 변경은 가능
- `Object.freeze()`: 추가/삭제/변경 모두 금지 (얕은 동결 — 중첩 객체는 동결되지 않음)

## 면접포인트
- "Object.freeze vs const?" → const는 재할당 방지, freeze는 객체 내부 변경 방지
- "얕은 동결 문제?" → 중첩 객체는 freeze되지 않음, 깊은 동결은 재귀적으로 적용 필요
