---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Modules API 타입 변환과 직렬화"]
---

# Modules API 타입 변환과 직렬화

## 기본 타입과 built-in converters

함수와 Prop setter는 primitive, array, dictionary/map, optional을 받는다. Swift는 Bool, signed/unsigned Int 계열, Float32/Double/String을, Kotlin은 Boolean/Int/Long/Float/Double/String/Pair를 지원한다. Android는 가능하면 boxed list보다 primitive array를 사용한다.

| Native type | JS 표현과 조건 |
|---|---|
| iOS URL | string, scheme 없으면 file URL로 해석 |
| Android URL/Uri/URI | scheme 포함 string, percent encoding 유효해야 함 |
| iOS CGPoint/CGSize/CGVector/CGRect | 해당 field object 또는 정해진 순서의 number array |
| iOS UIColor/CGColor, Android color | hex, 지원 named color, transparent |
| iOS Data, Android ByteArray | Uint8Array, SDK50 이상 |
| Android File/Path | filesystem path string, Path는 Android API26 이상 |
| Android Pair<A,B> | 두 원소 array |
| Android BooleanArray | boolean[] |
| Android Int/Float/Long/DoubleArray | number[] |
| Android kotlin.time.Duration | 초 단위 number, SDK52 이상 |

## 사용자 정의 conversion

Swift type는 Convertible에 conform하고 `static convert(from: Any?, appContext: AppContext) throws -> Self`를 구현한다. unsupported/malformed 값을 조용히 cast하지 말고 예외로 거부한다. Kotlin Module은 `converters()`에서 ModuleConverters를 반환하고 `TypeConverter(CustomType::class).from { number: Int -> ... }.from { string: String -> ... }`를 등록한다. framework는 입력과 맞는 source converter를 시도한다.

Record는 JS object를 native typed field로 표현한다. `@Field`가 있는 필드만 conversion contract에 포함하며 default와 optional을 선언한다.

```swift
struct ReadOptions: Record {
  @Field var encoding: String = "utf8"
  @Field var position: Int = 0
  @Field var length: Int?
}
```

Enumerable enum은 primitive raw value를 사용한다. Swift는 `enum Encoding: String, Enumerable`, Kotlin은 `enum class Encoding(val value: String): Enumerable` 형태다. Kotlin constructor의 property 이름은 value여야 한다. TS union만으로 native runtime validation이 생기지 않으므로 실제 enum parameter를 사용한다.

## Union과 미지정 값

Either<A,B>, EitherOfThree<A,B,C>, EitherOfFour<A,B,C,D>는 복수 argument type을 담는다. native에서 get으로 실제 타입을 읽는다. 일반 optional은 JS null/undefined를 같은 null로 바꾸므로 patch 설정에서 둘을 구별하려면 experimental ValueOrUndefined를 사용한다.

| `ValueOrUndefined<String?>` | 해석 |
|---|---|
| isUndefined true | argument 미제공 또는 undefined |
| isUndefined false, optional null | 명시적 null |
| isUndefined false, optional string | 값 제공 |

## Record Formatter

experimental Formatter는 반환 Record 직렬화를 변환한다. property의 map은 값을 바꾸며 skip은 전체 field를 제외한다. skip predicate와 map chain도 가능하다. Swift는 record.format closure에서 keyPath를, Kotlin은 formatter DSL에서 property reference를 사용한다. 반환 타입이 number에서 string으로 바뀌면 JS public type도 함께 맞춘다. skip은 출력 계약이며 원래 native 객체의 field를 지우는 동작으로 가정하지 않는다.

## Raw JavaScript value의 thread 제약

JavaScriptValue는 임의 JS 값을 보관하고 직접 mutation할 수 있다. JavaScriptObject는 object만, JavaScriptFunction<ReturnType>은 callback을 받는다. runtime read/write는 JS thread에서만 허용되므로 synchronous Function에 제한한다. 다른 thread에서 접근하면 crash할 수 있다. AsyncFunction background queue에 이 값을 넘기는 방법으로 사용하지 않는다.

## 출처

- [Expo Documentation, Module API Reference](https://docs.expo.dev/modules/module-api/)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
