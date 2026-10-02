---
tags: [runtime, v8, cpp, binding, security]
status: done
verified_at: 2026-10-02
category: "OS & Runtime"
aliases: ["V8 FunctionTemplate", "V8 ObjectTemplate", "V8 Native Binding"]
---

# V8 native 함수와 객체 연결

Native binding은 JS 객체의 형태, C++ 자원의 수명과 호출 권한을 연결한다. Template이나 internal field를 선언하는 것만으로 타입 안전성과 권한 검증이 완성되지 않는다. 기준은 V8 15.7.0 candidate API다.

## Template의 생성 시점

`FunctionTemplate`은 함수, prototype과 instance template을 함께 구성한다. 첫 인스턴스화 전에 설정을 끝낸다. 이후 template을 수정하면 프로세스가 중단될 수 있다. 같은 template에서 만든 함수는 context별로 관리되므로 임시 함수를 계속 만들 때 template을 무한히 늘리는 방식을 피한다.

Instance의 own property, prototype property와 함수 객체 자체의 property는 서로 다른 위치다. `Inherit()`로 연결하는 prototype과 internal field 조건을 구분한다. Prototype provider를 지정하는 방식과 자체 prototype 구성은 함께 사용할 수 없는 조합이 있다.

`DictionaryTemplate`은 고정된 property 이름과 같은 순서의 값으로 객체를 만든다. 빈 `MaybeLocal` 값은 property 생략을 뜻할 수 있다. 배열 길이와 순서를 잘못 맞춰도 의미가 보존된다고 가정하지 않는다.

## Callback의 receiver와 반환값

`FunctionCallbackInfo`의 `This()`는 receiver이고 `NewTarget()`은 생성 호출의 대상을 나타낸다. 인자 범위를 벗어난 접근이 `undefined`를 돌려줄 수 있으므로 개수, 타입과 값 범위를 명시적으로 확인한다. 반환값은 `GetReturnValue().Set(...)`으로 설정한다.

Property interceptor의 `Holder()`는 interceptor를 가진 객체이며 `This()`는 실제 receiver다. Prototype 경유 접근에서는 둘이 다를 수 있다. 접근 권한을 receiver와 holder 중 무엇에 적용하는지 먼저 정한다.

`ShouldThrowOnError()`는 strict mode만으로 추정하지 않는다. `Reflect.set`, `Reflect.defineProperty`와 `Reflect.deleteProperty`는 실패를 boolean으로 나타내므로 strict 코드에서 호출됐어도 해당 조건이 다를 수 있다.

Interceptor가 `Intercepted::kNo`를 반환하면 일반 property 처리가 계속될 수 있으므로 callback에서 부수효과를 만들지 않는다. `kNonMasking`은 이미 존재하는 named property를 가리지 않는 조건이고, `kOnlyInterceptStrings`는 symbol lookup을 제외한다. `kHasNoSideEffect`를 단순 성능 옵션처럼 켜지 않고 실제 getter/query/enumerator의 동작과 맞춘다.

## Property 연산은 재진입할 수 있다

`Get()`, `Set()`과 `Has()`는 getter, interceptor, Proxy trap 또는 key 변환을 실행할 수 있다. 그 결과 JS 예외, GC와 native callback 재진입이 발생할 수 있다. Callback 전의 raw pointer나 객체 상태를 그대로 신뢰하지 않는다.

- `Has()`는 prototype과 interceptor를 포함하는 존재 확인이다.
- `HasOwnProperty()`는 own property 여부를 다룬다.
- `HasRealNamedProperty()`와 관련 real-property API는 interceptor를 우회하는 별도 계약이다.
- `CreateDataProperty()`는 writable, enumerable, configurable인 data property를 만든다.
- `DefineProperty()`는 descriptor의 실제 지정 필드를 적용한다.

Descriptor에서 필드가 없는 상태는 `false`나 `undefined`를 지정한 상태와 다르다. `has_writable()` 같은 존재 검사를 먼저 사용한다. 단순 attribute 값 `None`은 일반 property와 부재를 혼동시킬 수 있으므로 존재 여부를 반환하는 overload의 계약도 확인한다.

`GetPrototype()`과 `SetPrototype()`은 security handler를 호출하는 권한 검사 대체물이 아니다. `Clone()`도 shallow copy다. 내부 native 자원까지 독립 복제됐다고 해석하지 않는다.

## Accessor와 lazy property

Native data property는 getter와 setter를 제공하지만 JS에서 보이는 descriptor 의미는 일반 accessor와 다를 수 있다. 상속받은 receiver에 값을 쓰는 경우에는 보통의 JS data property 규칙 때문에 holder의 native setter가 호출되지 않을 수 있다.

Lazy data property는 첫 접근으로 값을 계산한 뒤 data property로 바뀐다. 매번 권한 확인이나 최신 데이터 조회가 필요한 속성에 이 캐시 의미를 잘못 적용하지 않는다.

## Internal field와 native 소유권

Internal field 개수를 template에 확보한 뒤, 값을 넣은 API와 같은 계열의 API로 읽는다. `SetAlignedPointerInInternalField()`와 대응 getter에는 정렬과 tag 조건이 있다. 일반 internal field에 넣은 값을 aligned pointer로 읽는 등 계약을 섞으면 정의되지 않은 동작이 될 수 있다.

`External`의 `void*`는 native 객체를 가리킬 뿐 그 객체의 소유권이나 GC 추적을 자동으로 제공하지 않는다. Native 자원의 생성, 명시적 종료와 wrapper 무효화를 따로 설계한다. Cppgc 대상은 `CppHeapExternal`, wrapper와 tracing 계약을 따른다.

Wrapper를 해제할 때 타입 tag를 맞춘다. Wrapper가 설정되지 않았으면 unwrap 결과가 null일 수 있다. Internal field를 가진 모든 객체가 API wrapper인 것도 아니다. 실제 binding에서 만든 인스턴스인지 확인한 뒤 접근한다.

## 권한과 동적 코드 실행

Context의 security token과 access check는 JS 객체 접근을 제어하는 엔진 장치다. OS 파일 권한이나 process sandbox를 대신하지 않는다. Access check callback만 등록하는 방식과 handler를 함께 두는 방식의 배타적 설정을 지킨다.

`AllowCodeGenerationFromStrings(false)`는 문자열 기반 `eval`과 `Function` 생성을 제어한다. 등록한 허용 callback이 예외를 만들 수 있고 Wasm 정책은 별개다. Native 함수가 노출한 파일, 네트워크와 시스템 호출 권한도 별도로 제한한다.

`Private::ForApi()`와 `Symbol::ForApi()`의 전역 등록은 키를 계속 보존할 수 있다. 요청 ID나 사용자 입력마다 새 이름을 등록하지 않고 고정된 이름 공간을 사용한다. Hash 값도 고유 ID가 아니며 isolate나 프로세스를 건너 안정적이라고 가정하지 않는다.

## Fast API의 제한

Fast `CFunction` callback은 일반 callback의 빠른 대체물이지만 할당, GC, JS 실행과 V8 호출에 제약이 있다. Number와 BigInt 정수 표현, 범위 검사와 clamp 같은 인자 계약을 선언에 맞춘다. 실험적 경로의 속도 이점 때문에 입력 검증이나 일반 경로의 의미를 생략하지 않는다.

Head Doxygen의 도입 설명에는 현재 선언과 맞지 않는 과거 fallback 예제가 남아 있다. `MakeWithFallbackSupport`와 `FastApiCallbackOptions::fallback`을 현재 API로 복사하지 않는다. 64비트 정수의 BigInt 지원을 미래 계획으로 적은 설명과 달리 현재 `CFunctionInfo::Int64Representation`에는 `kNumber`와 `kBigInt`가 있다. 설치한 헤더의 선언을 기준으로 사용한다.

정규식의 backtrack 제한 역시 제한 도달 시 match failure를 돌려줄 수 있다. 결과를 실제로 일치하는 문자열이 없다는 증거로만 해석하지 않는다. Linear regexp 모드는 지원 flag가 필요한 실험 기능이다.

## 출처

- [V8, FunctionTemplate](https://v8.github.io/api/head/classv8_1_1FunctionTemplate.html)
- [V8, ObjectTemplate](https://v8.github.io/api/head/classv8_1_1ObjectTemplate.html)
- [V8, Object](https://v8.github.io/api/head/classv8_1_1Object.html)
- [V8, PropertyCallbackInfo](https://v8.github.io/api/head/classv8_1_1PropertyCallbackInfo.html)
- [V8, Context](https://v8.github.io/api/head/classv8_1_1Context.html)
- [V8, Fast API calls header](https://v8.github.io/api/head/v8-fast-api-calls_8h.html)
- [V8, CFunctionInfo](https://v8.github.io/api/head/classv8_1_1CFunctionInfo.html)
- [V8, Namespace callbacks and interception](https://v8.github.io/api/head/namespacev8.html)
- [V8, RegExp](https://v8.github.io/api/head/classv8_1_1RegExp.html)

## 관련 문서

- [[V8-Cpp-API]]
- [[V8-Cpp-API-Handles-and-Exceptions]]
- [[V8-Embedding-and-Security]]
