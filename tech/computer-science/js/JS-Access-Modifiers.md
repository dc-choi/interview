---
tags: [cs, javascript, typescript, access-modifier, oop]
status: done
category: "CS - JavaScript"
aliases: ["JS Access Modifiers", "접근제어자"]
---

# JS·TS 접근 제어자

JS는 원래 **클래스 멤버 접근 제어가 없었지만** ES2022에서 `#` private 문법이 표준화. TS는 그 이전부터 `public`·`private`·`protected` 키워드로 **컴파일 타임 강제**. 둘의 차이를 구분 못 하면 실수하기 쉬움.

## 4가지 접근 단계

| 단계 | 외부 접근 | 서브클래스 접근 | 구현 |
|---|---|---|---|
| **Public** | ✅ | ✅ | 기본 |
| **Protected** | ✗ | ✅ | TS 키워드 |
| **Private** | ✗ | ✗ | `#` 또는 TS `private` |
| **Internal** (모듈) | 모듈 밖 ✗ | ✅ | 모듈 export 제어 |

## JS (ES2022+)

### `#` private 필드 (실제 강제)
```
class User {
  #password;       // 진짜 private
  
  constructor(pw) {
    this.#password = pw;
  }
  
  check(pw) {
    return this.#password === pw;
  }
}

const u = new User('secret');
u.#password;  // ❌ SyntaxError — 외부 접근 불가
```

특징:
- **런타임에 진짜 차단** — WeakMap으로 구현되어 외부·상속에서도 접근 불가
- 필드는 **미리 선언** 필요 (`#password;` 줄)
- Stage 4 → ES2022 표준

### `_` 관례 (소프트 private)
```
class User {
  constructor(pw) {
    this._password = pw;   // 밑줄 = "건드리지 마세요" 관례
  }
}

const u = new User('secret');
u._password;  // 접근 됨 (그러나 관례상 쓰면 안 됨)
```

**실제 강제 없음** — 단지 "외부에서 쓰지 마라"는 팀 컨벤션. 리팩토링 안전성 낮음.

### public 기본
```
class User {
  name;   // public
  email;  // public
}
```
별도 키워드 없이 모두 public.

### protected 미지원
JS는 **protected가 언어 차원에서 없다**. 서브클래스에서만 접근 가능한 상태는 불가. 필요하면 TS 쓰거나 Symbol·클로저로 에뮬레이션.

## TypeScript

### `public`·`private`·`protected` 키워드
```
class User {
  public name: string;
  private password: string;
  protected role: string;
  
  constructor(name: string, pw: string, role: string) {
    this.name = name;
    this.password = pw;
    this.role = role;
  }
}
```

### 특징과 한계
- **컴파일 타임에만 강제** — 실제 JS로 컴파일되면 `private`·`protected`는 사라지고 전부 public
- 런타임에 객체 reflection하면 여전히 보임
- `#` private과 달리 Test에서 접근 가능 (트레이드오프)

```
// TS
class User {
  private password: string;
}
// ↓ 컴파일 후 JS
class User {
  password;   // 그냥 public
}
```

**진짜 런타임 차단을 원하면 `#` 필드**, TS 타입 체크만으로 충분하면 키워드.

### Parameter Properties (편의)
```
class User {
  constructor(
    public name: string,
    private password: string,
    protected role: string,
  ) {}
  // this.name = name; this.password = password; 자동 생성
}
```
생성자 파라미터에 접근 제어자 붙이면 **자동으로 필드 선언 + 할당**. 보일러플레이트 감소.

## `#` vs TS `private` 선택

| 축 | `#` (JS 표준) | TS `private` |
|---|---|---|
| 런타임 강제 | ✅ | ✗ (컴파일 타임만) |
| 표준 | ES2022 JS | TypeScript only |
| 바이너리 작음 | 아주 약간 큼 (WeakMap) | 동일 |
| 테스트에서 접근 | 불가 | 가능 (cast로) |
| TS 외 환경 | 순수 JS 실행 가능 | TS 필요 |

### 언제 무엇
- **라이브러리·SDK**: `#` (외부가 의존하는 객체 내부 완전 차단)
- **사내 애플리케이션**: TS `private` (테스트 편의, 타입 체크 충분)
- **레거시 JS 코드**: `_` 관례 (표준 부재 시기)

## Protected의 딜레마

TS에선 `protected`가 있지만 **상속을 권장하지 않는** 현대 OOP 추세. "합성(composition) over 상속" 원칙에 따라 protected 사용은 제한적.

사용할 때:
- 기본 클래스가 확장 지점을 명시적으로 제공
- 프레임워크 내부 (e.g., NestJS의 `BaseExceptionFilter`)
- Template Method 패턴

## 함정

### TS private은 런타임에 없음
```
class A {
  private x = 1;
}
const a = new A();
(a as any).x;   // 1 — 접근됨
JSON.stringify(a);  // '{"x":1}' — 직렬화에도 포함
```
**민감 정보에 TS private 쓰고 안전하다고 착각 금지**. 진짜 감추려면 `#`.

### `#`는 상속 간 공유 안 됨
```
class A { #x = 1; }
class B extends A { get y() { return this.#x; } }  // ❌ 에러
```
`#`는 **선언한 클래스만 접근**. 서브클래스도 못 씀. protected 효과를 원하면 TS 키워드 필요.

## 면접 체크포인트

- JS가 언어 차원에서 private을 늦게 도입한 이유 (ES2022)
- `#`와 TS `private`의 런타임 차이
- `_` 관례가 "소프트 private"인 이유 (강제 없음)
- `#`가 상속에서 공유되지 않는 특성
- Parameter Properties로 얻는 편의
- 민감 정보 보호에 TS `private` 쓰면 안 되는 이유

## 출처
- [매일메일 — JavaScript 접근제어자](https://www.maeil-mail.kr/question/113)

## 관련 문서
- [[Prototype-OOP|Prototype 기반 OOP]]
- [[SOLID-In-Practice|SOLID 실전]]
