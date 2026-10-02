---
tags: [react-native, native, cpp, turbo-module]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 공유 C++ TurboModule"]
---

# React Native 공유 C++ TurboModule

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 공유 코드와 플랫폼 연결

pure C++ TurboModule은 플랫폼 독립 로직을 C++로 한 번 구현하고 Android/iOS에서 공유한다. C++ 업무 구현은 공유하지만 빌드 시스템, 헤더 노출과 모듈 등록은 플랫폼별로 필요하다. Android/iOS 전용 API 자체를 C++로 바꾸면 자동 공유된다는 뜻은 아니다.

흐름은 Spec 작성, Codegen 설정, C++ 구현, 플랫폼 등록, JavaScript 호출이다. 앱 루트에 `specs/`, `shared/`, `android/`, `ios/`가 함께 있는 구성을 전제로 한다.

## Spec과 생성 계약

`specs/NativeSampleModule.ts`에 다음과 같은 메서드를 선언한다.

```ts
import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  readonly reverseString: (input: string) => string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeSampleModule');
```

`codegenConfig.name`은 `AppSpecs`, `type`은 `modules`, `jsSrcsDir`은 `specs`로 설정한다. 모듈 Spec 파일의 `Native` 접두사를 유지한다.

## C++ 구현

`shared/NativeSampleModule.h`에서 `<AppSpecsJSI.h>`를 include한다. 생성된 `NativeSampleModuleCxxSpec<NativeSampleModule>`을 상속하는 클래스를 선언한다.

```cpp
namespace facebook::react {
class NativeSampleModule
    : public NativeSampleModuleCxxSpec<NativeSampleModule> {
 public:
  NativeSampleModule(std::shared_ptr<CallInvoker> jsInvoker);
  std::string reverseString(jsi::Runtime& rt, std::string input);
};
}
```

- 생성 Spec의 클래스와 함수 선언에 맞춘다.
- 생성자는 `CallInvoker`를 받아 JS와 통신할 기반을 전달한다.
- `.cpp`에서는 생성 base class를 초기화하고 메서드를 구현한다.
- 예제의 문자열 역순은 `std::string(input.rbegin(), input.rend())`다.

예제의 `std::string` 역순을 Unicode 문자 단위 역순으로 일반화하지 않는다. 실제 입력 인코딩과 사용자 문자 단위 처리가 필요하면 별도의 계약이 필요하다.

## Android 빌드 연결

`android/app/src/main/jni/CMakeLists.txt`를 만든다.

```cmake
cmake_minimum_required(VERSION 3.13)
project(appmodules)
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE
  ../../../../../shared/NativeSampleModule.cpp)
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC
  ../../../../../shared)
```

기본 RN CMake 구성을 포함한 다음 앱의 추가 소스와 include 디렉터리를 연결한다. 위 상대 경로는 `jni/` 위치에서 앱 루트의 `shared/`로 올라가는 구조를 전제로 한다.

앱의 `android/app/build.gradle` 내 `android` 블록에 위치를 연결한다.

```groovy
externalNativeBuild {
    cmake {
        path "src/main/jni/CMakeLists.txt"
    }
}
```

### Android 런타임 등록

사용하는 RN 버전에 맞는 `default-app-setup/OnLoad.cpp`를 기반으로 앱의 `jni/OnLoad.cpp`를 만든다. 0.87 입문은 GitHub `v0.87.0`의 파일을 가져오는 방식이다. 다른 버전 파일을 섞지 않는다.

1. `NativeSampleModule.h`를 include한다.
2. `cxxModuleProvider(name, jsInvoker)`에서 `NativeSampleModule::kModuleName`과 요청명을 비교한다.
3. 맞으면 `std::make_shared<NativeSampleModule>(jsInvoker)`를 반환한다.
4. 나머지는 `autolinking_cxxModuleProvider(name, jsInvoker)`로 넘긴다.
5. 기본 OnLoad의 나머지 등록 흐름을 보존한다.

fallback을 제거하면 다른 autolinked C++ 모듈을 찾지 못할 수 있다.

## iOS 빌드 연결과 provider

1. `ios/`에서 `bundle install`, `bundle exec pod install`을 수행한다.
2. CocoaPods `.xcworkspace`를 연다.
3. `shared/` 폴더를 Xcode 프로젝트에 추가하여 소스와 헤더가 target에서 보이게 한다.
4. `NativeSampleModuleProvider.h/.mm`를 만든다. `.mm`는 ObjC++를 위한 확장자다.
5. 헤더는 `<ReactCommon/RCTTurboModule.h>`를 import하고 `NSObject <RCTModuleProvider>`를 선언한다.
6. provider의 `getTurboModule:`에서 C++ 객체를 만들고 `params.jsInvoker`를 전달한다.

```objc
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeSampleModule>(params.jsInvoker);
}
```

`codegenConfig.ios.modules.NativeSampleModule.className`을 `NativeSampleModuleProvider`로 연결한다. provider 이름과 모듈 조회명은 서로 다른 역할이다. iOS 설정 키는 [[RN-Codegen#iOS 설정 키의 문서 불일치]]를 참고한다.

설정 변경 후 `bundle exec pod install`을 다시 실행하고 Xcode에서 빌드한다. 헤더를 추가하는 것만으로 JavaScript 조회명이 등록되지는 않는다.

## JavaScript 접근과 재사용 경계

import한 Spec의 `reverseString(value)`를 호출하면 등록된 C++ 구현을 사용한다. 입문 예제는 Spec을 직접 import하지만, 앱 코드에서는 별도 wrapper로 입력 준비, 사용 가능한 모듈 확인과 반환 처리 책임을 모을 수 있다.

공유 모듈 확인 항목은 Android CMake 링크, iOS target membership, 조회명/provider 매핑, Codegen 버전과 fallback 보존이다. C++ 소스 변경은 양쪽 네이티브 앱을 재빌드하여 확인한다.

## 출처

- [React Native, Cross-Platform Native Modules (C++)](https://reactnative.dev/docs/the-new-architecture/pure-cxx-modules)
- [React Native, Using Codegen](https://reactnative.dev/docs/the-new-architecture/using-codegen)

## 관련 문서

- [[RN-Turbo-Native-Modules]]
- [[RN-Native-Module-Advanced]]
- [[RN-Codegen]]
- [[RN-Native-Module-Libraries]]
