---
tags: [cs, javascript, primitives, reference]
status: done
category: "CS - JavaScript"
aliases: ["JS Value vs Reference", "원시·참조 타입", "Call By Value Reference"]
---

# JS 원시 vs 참조 · undefined vs null · Call by Value

JS 면접 기초 트리오. 셋 다 **"값이냐 참조냐·언제 복사되냐"** 라는 한 뿌리에서 나오는 주제.

## 원시(Primitive) vs 참조(Reference) 타입

| 원시 타입 | 참조 타입 |
|---|---|
| `number`, `string`, `boolean` | `object` |
| `undefined`, `null` | `array` |
| `symbol`, `bigint` | `function` |

### 저장 방식
- **원시**: 값 자체가 변수에 저장 → 대입·전달 시 **값 복사**
- **참조**: 힙(Heap)에 객체가 있고 변수는 **주소**만 보유 → 대입·전달 시 **주소 복사**

### 비교
```
// 원시
let a = 1, b = 1;
a === b;   // true — 값이 같음

// 참조
let o1 = {x:1}, o2 = {x:1};
o1 === o2; // false — 주소가 다름
let o3 = o1;
o1 === o3; // true — 같은 주소
```

## undefined vs null

둘 다 "값 없음"을 나타내지만 **의도가 다름**.

| 축 | `undefined` | `null` |
|---|---|---|
| 누가 할당 | **JS 엔진이 자동** | **개발자가 명시적** |
| 의미 | "아직 값이 할당되지 않음" | "의도적으로 비어 있음" |
| `typeof` | `"undefined"` | `"object"` (역사적 버그) |
| `==` 비교 | `null == undefined` → true | |
| `===` 비교 | 서로 다른 타입 | |
| JSON 직렬화 | 필드 생략 | `"field": null` |

### 언제 `null`을 쓰는가
- **"이 필드가 있지만 값이 없다"** 를 외부에 알릴 때 (API 응답)
- 메모리 해제 힌트 — 객체 참조를 `null`로 덮어 GC 대상화
- 함수 반환값을 **"실패·없음"** 으로 명시 (e.g., `find` 결과)

### 언제 `undefined`를 쓰는가 (권장되지 않음)
- 보통 **자동으로 발생**하는 상태. 개발자가 명시적으로 할당하는 건 비권장
- 함수 기본값·optional 파라미터에 자연스럽게 나타남

### JSON 직렬화 주의
```
JSON.stringify({a: undefined, b: null})
// '{"b":null}'   ← undefined는 생략됨
```
클라이언트로 "이 필드 비어 있음"을 전달하려면 `null` 써야 함.

## Call by Value vs Call by Reference

**JS는 전부 Call by Value**. 단지 참조 타입의 "값"이 **주소**일 뿐.

```
function modify(x) {
  x = 'changed';      // 지역 변수 재할당 — 외부 영향 없음
}
let a = 'original';
modify(a);
console.log(a);       // 'original'


function mutate(obj) {
  obj.x = 'changed';   // ← 객체 속성 수정
}
let o = {x: 'original'};
mutate(o);
console.log(o.x);     // 'changed' — 같은 객체를 가리키니까


function reassign(obj) {
  obj = {x: 'new'};   // ← 지역 변수를 다른 객체로 재할당
}
let o = {x: 'original'};
reassign(o);
console.log(o.x);     // 'original' — 외부 변수는 원래 객체 가리킴
```

### 세 가지 경우 정리
1. **원시 파라미터 재할당**: 외부 무관 (값 복사)
2. **객체 파라미터 속성 수정**: 외부 영향 (같은 주소)
3. **객체 파라미터 재할당**: 외부 무관 (지역 변수만 새 주소)

**"Call by Reference"는 JS에 없다** — 정확히는 "Call by Sharing" 또는 "참조의 값 전달(pass by value of reference)"이라 불러야 정확. 면접에서 "JS는 Call by Reference 있냐"고 물으면 위 예시로 반박.

## 불변성(Immutability) 패턴

참조 타입을 그대로 수정하면 예상치 못한 부작용. 실무에선:

```
// ❌ 원본 수정
function addTag(user, tag) {
  user.tags.push(tag);
  return user;
}

// ✅ 새 객체 반환
function addTag(user, tag) {
  return { ...user, tags: [...user.tags, tag] };
}
```

React·Redux 등 현대 상태 관리는 **불변성을 전제**로 동작. 원본 수정하면 변경 감지 실패.

## 흔한 실수

- 객체 복사로 `=`만 쓰면 주소만 복사 → 한쪽 수정이 양쪽 반영
- 깊은 복사가 필요한데 `{...obj}` 얕은 복사만 함 → 중첩 객체는 여전히 공유
- `null`·`undefined` 판별을 `==`로 했다가 둘 다 true되어 의도와 다른 분기
- 함수에서 객체 재할당하고 "외부 변경"을 기대함

## 깊은 복사

```
// 얕은 복사 (1단계만)
{ ...obj }
Object.assign({}, obj)
structuredClone(obj)   // ← 깊은 복사 (표준, Node 17+)

// 대체
JSON.parse(JSON.stringify(obj))  // 함수·Date·Symbol 손실
lodash cloneDeep(obj)            // 가장 완전
```

## 면접 체크포인트

- JS가 Call by Value 언어라는 주장의 정확한 의미
- 원시 vs 참조 타입 구분과 저장 방식
- `typeof null === 'object'`인 이유 (역사적 버그)
- `undefined`와 `null`의 의미 차이와 실무 선택
- JSON 직렬화에서 `undefined`가 생략되는 이유
- 함수 내 객체 속성 수정 vs 객체 재할당의 외부 영향 차이

## 출처
- [매일메일 — undefined와 null 차이](https://www.maeil-mail.kr/question/63)
- [매일메일 — Call By Value, Call By Reference](https://www.maeil-mail.kr/question/152)
- [매일메일 — JavaScript 배열](https://www.maeil-mail.kr/question/32)

## 관련 문서
- [[Prototype-OOP|Prototype 기반 OOP]]
- [[Object-Property-Descriptor|Object 프로퍼티 디스크립터]]
- [[JS-Function-Forms|JS 함수 형태·일급객체]]
