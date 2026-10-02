---
tags: [react-native, native, codegen]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Codegen 동작과 설정"]
---

# React Native Codegen 동작과 설정

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## Codegen의 동작

Codegen은 typed JavaScript Spec에서 반복적인 연결 코드를 생성한다. 생성 파일을 수작업으로 구현할 수는 있지만, Spec과 네이티브 사이의 인터페이스를 직접 유지해야 한다. Codegen은 앱 빌드와 결합되어 있으며 `react-native` npm 패키지 안의 스크립트를 호출한다.

앱의 설정으로 지정한 폴더와 연결된 의존성에서 Spec을 탐색하고, C++ glue code와 Android Java, iOS Objective-C++ 코드를 생성한다. 수동 호출도 React Native 앱과 설치된 패키지를 전제로 한다.

| Spec 종류 | 파일명 조건 | 예시 |
| --- | --- | --- |
| TurboModule | `Native` 접두사 | `NativeLocalStorage.ts` |
| Fabric | `NativeComponent` 접미사 | `WebViewNativeComponent.ts` |

이름 조건은 단순 취향이 아니라 Codegen의 탐색 규칙이다. 파일이 있어도 규칙과 탐색 경로가 맞지 않으면 생성 대상에서 빠질 수 있다.

## package.json 설정

```json
{
  "codegenConfig": {
    "name": "AppSpecs",
    "type": "all",
    "jsSrcsDir": "specs",
    "android": {
      "javaPackageName": "com.example.specs"
    },
    "ios": {
      "modules": {
        "NativeLocalStorage": {
          "className": "RCTNativeLocalStorage",
          "unstableRequiresMainQueueSetup": false
        }
      },
      "components": {
        "CustomWebView": {
          "className": "RCTWebView"
        }
      }
    }
  }
}
```

| 항목 | 계약 |
| --- | --- |
| `name` | 생성 파일명과 코드 네임스페이스에 반영할 Spec 묶음 이름 |
| `type` | `modules`, `components`, `all` 중 생성 범위 |
| `jsSrcsDir` | Spec이 들어 있는 소스 디렉터리 |
| `android.javaPackageName` | Android 생성 Java 코드의 패키지 이름, 선택 항목 |
| `ios.modules[이름].className` | ObjC 구현 클래스 또는 pure C++ 모듈의 `RCTModuleProvider` 클래스 |
| `unstableRequiresMainQueueSetup` | JavaScript 실행 전에 UI thread에서 모듈을 초기화할지 지정 |
| `conformsToProtocols` | `RCTImageURLLoader`, `RCTURLRequestHandler`, `RCTImageDataDecoder` 구현을 선언 |
| `ios.components[이름].className` | 해당 네이티브 컴포넌트의 ObjC 구현 클래스 |

iOS와 Android 하위 설정은 선택 항목이다. 필요한 플랫폼 구현 이름과 경로만 추가한다.

### iOS 설정 키의 문서 불일치

0.87의 Using Codegen 설정 레퍼런스는 `ios.modules`와 `ios.components`를 사용한다. 같은 버전의 TurboModule/C++/Fabric 입문 예제에는 `modulesProvider`와 `componentProvider`가 남아 있다. 이 문서는 설정 레퍼런스의 형태를 기준으로 적었다. 이전 예제를 가져올 때 두 형태를 혼합하지 않고, 실제 사용하는 RN 버전의 Codegen 스크립트와 생성 provider를 대조한다. 이 정리에서는 구형 키의 런타임 호환 여부를 확인하지 않았다.

## Android에서 수동 실행

프로젝트의 `android/`에서 실행한다.

```sh
./gradlew generateCodegenArtifactsFromSchema
```

RNGP가 앱과 연결된 node module의 설정을 읽고 각 프로젝트의 생성 디렉터리에 산출물을 만든다.

- 앱: `android/app/build/generated/source/codegen/`
- 라이브러리: `node_modules/<dependency>/android/build/generated/source/codegen/`

### Android 산출물의 역할

| 위치/파일 | 역할 |
| --- | --- |
| `java/<javaPackageName>/Native...Spec.java` | TurboModule이 구현할 추상 클래스 |
| `java/com/facebook/react/viewmanagers/*ManagerInterface.java` | Fabric ViewManager 인터페이스 |
| 같은 폴더의 `*ManagerDelegate.java` | ViewManager 호출을 처리하는 delegate |
| `jni/<name>.h`, `<name>-generated.cpp` | C++ 모듈 인터페이스와 연결 코드 |
| `jni/CMakeLists.txt` | 생성 C++ 코드를 네이티브 빌드에 연결 |
| `jni/react/renderer/components/<name>/` | 컴포넌트 Props, Events, ShadowNodes, States와 descriptors |
| `schema.json` | 생성 과정에 사용한 스키마 |

`type: modules`이면 컴포넌트 renderer 디렉터리가 생기지 않는다. `components`이면 모듈 전용 산출물을 기대하지 않는다.

## iOS에서 수동 실행

앱 루트에서 설치된 RN의 스크립트를 실행한다.

```sh
node node_modules/react-native/scripts/generate-codegen-artifacts.js \
  --path . \
  --outputPath ios/ \
  --targetPlatform ios
```

`--path/-p`는 앱 루트, `--targetPlatform/-t`는 `android`, `ios`, `all`, `--outputPath/-o`는 생성 출력 경로다. `path`와 플랫폼은 필수다. iOS의 통상 빌드/CocoaPods 흐름에서도 Codegen을 호출한다.

### iOS 산출물의 역할

예제 명령의 산출물은 `ios/build/generated/ios/` 아래에 생긴다.

- `<name>/<name>.h`: iOS TurboModule 인터페이스.
- `<name>/<name>-generated.mm`: ObjC++ 모듈 연결 코드.
- `<name>JSI.h`, `<name>JSI-generated.cpp`: C++ 모듈 인터페이스와 연결 코드.
- `FBReactNativeSpec` 계열: RN 코어가 사용하는 생성 인터페이스.
- `RCTModulesConformingToProtocolsProvider` 계열: protocol 구현 모듈의 provider.
- `react/renderer/components/<name>/`: Props, EventEmitters, ComponentDescriptors, ShadowNodes, States, `RCTComponentViewHelpers.h`.

설정 `name`을 바꾸면 include와 생성 클래스명을 함께 바꾼다. 오래된 생성 파일이 새 Spec처럼 보이지 않도록 설치와 생성 과정을 다시 수행한다.

## 출처

- [React Native, What is Codegen?](https://reactnative.dev/docs/the-new-architecture/what-is-codegen)
- [React Native, Using Codegen](https://reactnative.dev/docs/the-new-architecture/using-codegen)

## 관련 문서

- [[RN-Codegen-CLI]]
- [[RN-Codegen-Types]]
- [[RN-Turbo-Native-Modules]]
- [[RN-Fabric-Native-Components]]
- [[RN-Android-Build]]
