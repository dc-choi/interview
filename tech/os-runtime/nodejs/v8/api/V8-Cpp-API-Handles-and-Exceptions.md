---
tags: [runtime, v8, cpp, memory, exceptions]
status: done
verified_at: 2026-10-02
category: "OS & Runtime"
aliases: ["V8 Handles", "V8 MaybeLocal", "V8 TryCatch"]
---

# V8 handles, 약한 참조와 예외

Handle은 GC가 관리하는 객체를 C++ 코드에서 참조하는 수단이다. Handle의 종류는 참조를 얼마나 오래 보관할지와 GC에 어떤 도달성을 제공할지를 결정한다. 아래 계약은 V8 15.7.0 candidate의 공개 API 기준이다.

## Local과 scope

`Local<T>`는 stack에서 사용하며 값으로 전달한다. 자신이 속한 `HandleScope`가 끝나면 handle을 다시 사용하지 않는다. Scope 종료는 handle의 종료이며 객체의 즉시 소멸을 뜻하지 않는다.

함수 안에서 만든 값을 바깥 scope로 반환할 때 `EscapableHandleScope::Escape()`를 사용한다. 한 escapable scope에서 탈출시키는 값은 한 번이다. 단순히 C++ 반환 타입을 `Local<T>`로 정하는 것만으로 수명이 연장되지 않는다.

Handle의 내부 표현은 direct handle 빌드 여부 등에 따라 달라진다. 모든 handle을 고정된 간접 포인터 구조라고 전제하지 않는다. `internal::Internals`의 offset, tag와 압축 주소 상수를 앱 ABI로 복사하지 않는다.

## Global, Persistent와 해제 책임

`Global<T>`는 이동 가능한 장기 참조다. Native 객체나 컨테이너에 보관하고, 더 이상 필요하지 않을 때 `Reset()` 또는 소유 객체의 수명 종료로 해제한다. 강한 참조가 남아 있으면 JS 쪽에서 접근할 수 없어도 객체가 살아 있을 수 있다.

`Persistent<T>`의 기본 traits는 소멸자에서 자동 reset하지 않는다. 모든 persistent가 RAII로 정리된다고 가정하면 누수로 이어진다. 명시적인 traits와 해제 계약이 필요한 경우가 아니라면 `Global`과 표준 컨테이너가 소유권을 더 분명하게 드러낸다.

`Eternal`은 isolate 수명 전체를 위한 참조다. 요청이나 연결마다 생기는 임시 객체를 보관하는 용도로 쓰지 않는다. Legacy `PersistentValueMap`에서 얻은 내부 참조도 set, remove, clear, weak callback 또는 map 파괴 이후에는 무효가 될 수 있다.

## 약한 참조와 finalization

Weak callback의 호출 시점과 호출 자체는 최선 노력 방식이다. 파일 닫기, transaction 종료, lock 해제와 같은 필수 정리를 GC에만 맡기지 않는다. 명시적 `close()` 또는 native 소유권 해제를 먼저 설계한다.

첫 번째 weak callback에서는 원인이 된 handle을 `Reset()`해야 한다. 그 밖의 V8 API는 호출하지 않는다. 추가 V8 작업이 필요하면 `SetSecondPassCallback()`으로 두 번째 단계를 예약한다. 두 번째 단계에서도 JS 실행은 허용되지 않는다.

Retainer label처럼 빌려 쓰는 문자열은 handle이 사용하는 동안 유지한다. Callback이 종료됐다는 이유로 V8이 참조할 native buffer까지 즉시 해제하지 않는다.

## 실패, false와 값의 부재

| 반환 형태 | 처리 |
|---|---|
| `Maybe<bool>`에서 `IsNothing()`이 참 | 예외나 종료 등으로 결과를 얻지 못함 |
| `Just(false)` | API가 정상적으로 계산한 false |
| 빈 `MaybeLocal<T>` | 해당 API의 실패 또는 값 부재 계약 확인 |
| `ToLocal(&value)` 성공 | 같은 scope에서 사용할 Local을 확보함 |

빈 `MaybeLocal`을 모두 같은 JS 예외로 해석하지 않는다. 예를 들어 지원하지 않는 객체의 `PreviewEntries()`는 예외 없이 빈 결과를 줄 수 있다. 반환 계약과 `TryCatch` 상태를 함께 확인한다.

`Maybe<T>::To(&out)`는 실패했을 때 기존 `out` 값을 바꾸지 않는다. 반면 `MaybeLocal::ToLocal(&out)`의 실패는 출력 handle을 비운다. 실패 분기 뒤에서 이전 결과를 새 결과처럼 쓰지 않는다.

`ToLocalChecked()`, `FromJust()`, `ToChecked()`와 `Check()`는 실패를 자동 복구하지 않는다. 비어 있는 값에 사용하면 프로세스를 중단시킬 수 있다. 사용자 입력, 객체 변환과 callback처럼 실패 가능한 경계에서는 명시적으로 검사한다.

## TryCatch와 종료 상태

`TryCatch`는 stack에 두고 해당 native 호출 범위의 예외를 잡는다. `HasCaught()`만 보지 않고 `CanContinue()`와 `HasTerminated()`로 실행 종료도 구분한다. 종료 예외는 일반 JS 값처럼 반환하거나 stringify하는 대상으로 보지 않는다.

`ThrowException()`으로 예외를 예약하거나 `TryCatch::ReThrow()`로 다시 던졌다면, 그 뒤에서 JS를 실행하지 않고 native callback에서 반환한다. 예외를 기록하려고 호출한 `ToString()`도 또 다른 JS 실행과 예외를 일으킬 수 있다.

`Reset()`은 잡아 둔 예약 예외를 취소할 수 있으므로 정리 목적으로 무조건 호출하지 않는다. Stack trace 조회 역시 실패할 수 있다. Message와 frame의 line/column도 없거나 제한될 수 있어 오류 보고 경로 자체가 checked 변환으로 중단되지 않게 한다.

## 타입 검사와 변환

`Cast()`와 `As<T>()`는 타입 변환이 아니다. 먼저 실제 타입을 확인한다. `IsTrue()`와 `IsFalse()`는 정확한 boolean primitive 검사이며 truthiness 계산이 아니다. Array를 감싼 Proxy도 `IsArray()`가 직접 Array를 검사하는 것과 같지 않다.

`ToString()`, `ToNumber()`와 property access는 사용자 코드를 실행할 수 있다. 재진입, GC와 예외 가능성을 함께 처리한다. `BigInt`를 고정 폭 정수로 바꿀 때는 `lossless`를 확인한다. 음수의 unsigned 변환이나 큰 수의 잘림을 성공으로 오인하지 않는다.

`TypecheckWitness`는 이미 수행한 충분한 타입 검사 결과를 재사용하는 장치다. 검사 결과가 false라고 다른 타입을 증명하는 것은 아니다. 최적화용 힌트를 입력 검증의 대체물로 쓰지 않는다.

## 출처

- [V8, Local](https://v8.github.io/api/head/classv8_1_1Local.html)
- [V8, Global](https://v8.github.io/api/head/classv8_1_1Global.html)
- [V8, Persistent](https://v8.github.io/api/head/classv8_1_1Persistent.html)
- [V8, MaybeLocal](https://v8.github.io/api/head/classv8_1_1MaybeLocal.html)
- [V8, TryCatch](https://v8.github.io/api/head/classv8_1_1TryCatch.html)
- [V8, WeakCallbackInfo](https://v8.github.io/api/head/classv8_1_1WeakCallbackInfo.html)
- [V8, Value](https://v8.github.io/api/head/classv8_1_1Value.html)

## 관련 문서

- [[V8-Cpp-API]]
- [[V8-Cpp-API-Cppgc]]
- [[V8-Cpp-API-Native-Bindings]]
