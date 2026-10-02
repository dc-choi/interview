---
tags: [react-native, native, turbo-module]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Turbo Native Module 구현"]
---

# React Native Turbo Native Module 구현

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 구현 구성과 예제 계약

TurboModule은 typed Spec, Codegen이 만든 플랫폼 인터페이스와 직접 작성한 네이티브 구현으로 구성한다. 여기서는 Android `SharedPreferences`와 iOS `NSUserDefaults`를 UI 없는 영속 저장 API로 노출하는 흐름을 사용한다.

입문 구현은 New Architecture만 대상으로 한다. 구형 앱도 지원하는 라이브러리는 별도의 호환 설계와 지원 버전 검증이 필요하다.

## 1. Spec 선언

앱 루트에 `specs/NativeLocalStorage.ts`를 만든다. 이름의 `Native` 접두사가 필요하다.

```ts
import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  setItem(value: string, key: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  clear(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeLocalStorage');
```

`setItem` 인자 순서는 예제에서 **value, key**다. 웹 localStorage의 **key, value**와 혼동하지 않는다. `getItem`은 키가 없으면 JS `null`을 반환하는 계약이다.

| 조회 방식 | 모듈이 없을 때 | 사용할 조건 |
| --- | --- | --- |
| `TurboModuleRegistry.get<T>(name)` | `null` | 플랫폼에서 선택적으로 제공할 때 |
| `getEnforcing<T>(name)` | 예외 | 앱에 필수로 포함된다고 가정할 때 |

`getEnforcing`로 export했다면 호출부의 optional chaining만으로 등록 누락 예외를 피할 수 없다. 모듈 import/조회 단계에서 실패한다.

## 2. Codegen 구성과 실행

```json
{
  "codegenConfig": {
    "name": "NativeLocalStorageSpec",
    "type": "modules",
    "jsSrcsDir": "specs",
    "android": {"javaPackageName": "com.nativelocalstorage"},
    "ios": {
      "modules": {
        "NativeLocalStorage": {"className": "RCTNativeLocalStorage"}
      }
    }
  }
}
```

Android는 `android/`에서 `./gradlew generateCodegenArtifactsFromSchema`를 실행한다. 앱 빌드에도 포함된다. iOS는 `ios/`에서 `bundle install`, `bundle exec pod install`을 수행하면 Codegen script phase와 생성 의존성이 준비된다.

iOS 설정은 [[RN-Codegen#iOS 설정 키의 문서 불일치]]를 따른다. 입문 예제의 `modulesProvider`와 위 레퍼런스 형태를 같은 계약으로 가정하지 않는다.

## 3. Android 구현

1. `com.nativelocalstorage` 패키지에 구현 파일을 만든다.
2. 생성된 `NativeLocalStorageSpec`을 상속한다.
3. 생성 인터페이스의 저장, 조회, 삭제와 전체 삭제 메서드를 구현한다.
4. `getName()`은 Spec 조회 문자열과 같은 `NativeLocalStorage`를 반환한다.

```kotlin
class NativeLocalStorageModule(context: ReactApplicationContext)
  : NativeLocalStorageSpec(context) {
  override fun getName() = "NativeLocalStorage"

  override fun getItem(key: String): String? =
    reactApplicationContext
      .getSharedPreferences("my_prefs", Context.MODE_PRIVATE)
      .getString(key, null)
}
```

나머지 메서드는 같은 preferences의 editor에서 `putString`, `remove`, `clear`를 실행하고 `apply()`로 반영한다. `clear`는 해당 preferences에 저장된 모든 키를 지운다.

**원문 예제 주의**: Kotlin 탭은 nullable `getString` 결과에 `toString()`을 호출한다. 이 형태는 키가 없는 경우 문자열 `null`을 만들 수 있어 Spec의 `string | null`과 다르다. nullable 값을 그대로 반환하도록 위 예시를 정리했다. 실제 컴파일과 실행은 별도 검증 대상이다.

### 패키지 등록

`NativeLocalStoragePackage`는 `BaseReactPackage`를 상속한다.

- `getModule(name, context)`은 이름이 맞을 때만 모듈을 만들고, 다른 이름은 `null`을 반환한다.
- `getReactModuleInfoProvider()`는 모듈명/클래스명, override와 eager init 여부, C++ 여부와 Turbo 여부를 제공한다.
- 이 예제는 `canOverrideExistingModule=false`, `needsEagerInit=false`, `isCxxModule=false`, `isTurboModule=true`다.
- 앱 내부에 직접 만든 패키지는 `MainApplication`의 `getPackages()`가 반환하는 `PackageList`에 추가한다.
- npm 라이브러리로 배포하면 해당 라이브러리의 autolinking 구성을 사용한다.

패키지와 모듈을 작성해도 `getPackages()`에 등록하지 않으면 런타임에서 찾을 수 없다.

## 4. iOS 구현

1. CocoaPods가 생성한 `.xcworkspace`를 연다.
2. `RCTNativeLocalStorage.h`와 구현 파일을 앱 target에 추가한다.
3. 구현 확장자를 `.m`에서 `.mm`로 바꿔 Objective-C++를 사용할 수 있게 한다.
4. 헤더에서 생성된 `<NativeLocalStorageSpec/NativeLocalStorageSpec.h>`를 import한다.
5. 클래스가 `NativeLocalStorageSpec` protocol을 구현하게 한다.
6. `getTurboModule:`에서 `NativeLocalStorageSpecJSI`를 생성하여 반환한다.
7. `moduleName`을 Spec 조회명과 맞추고 `package.json`의 iOS 구현 클래스 매핑을 설정한다.
8. `bundle exec pod install`을 다시 실행하여 provider를 재생성한다.

`init`에서 별도 suite 이름으로 `NSUserDefaults`를 만들고, `stringForKey`, `setObject:forKey:`, `removeObjectForKey:`를 사용한다. `clear`는 `dictionaryRepresentation`의 키를 순회하여 해당 suite의 값을 지운다. nullable 반환은 `NSString * _Nullable`로 생성 계약과 맞춘다.

JavaScript module 이름, `codegenConfig.name`과 ObjC 클래스 이름은 역할이 다르다. 각각 조회명, 생성 Spec 묶음명, 구현 매핑으로 구분한다.

## 5. JavaScript 사용과 검증 항목

- import한 모듈로 값을 읽고, 쓰고, 삭제한다.
- 애플리케이션 state를 저장 결과와 함께 갱신한다. 저장소 변경이 React state를 자동으로 갱신하지 않는다.
- 네이티브 코드 변경 후 `npm run android` 또는 `npm run ios`로 다시 빌드한다.
- 저장 후 앱을 재시작해 값이 유지되는지 확인한다.
- 없는 키가 빈 문자열이나 문자열 `null`이 아닌 JS `null`인지 확인한다.
- `clear`가 예제 전용 저장소의 범위를 넘어 지우지 않는지 확인한다.

이 예제의 저장소 구현을 비밀정보용 저장소로 해석하지 않는다. API 노출과 영속성 연결을 설명하는 예제다.

## 출처

- [React Native, Native Modules](https://reactnative.dev/docs/turbo-native-modules-introduction)
- [React Native, Using Codegen](https://reactnative.dev/docs/the-new-architecture/using-codegen)

## 관련 문서

- [[RN-Codegen]]
- [[RN-Codegen-Types]]
- [[RN-Cxx-Native-Modules]]
- [[RN-Native-Module-Advanced]]
- [[RN-Native-Module-Libraries]]
