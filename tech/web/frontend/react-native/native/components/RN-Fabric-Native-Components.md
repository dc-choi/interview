---
tags: [react-native, native, fabric, components]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Fabric Native Component 구현"]
---

# React Native Fabric Native Component 구현

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## Fabric 컴포넌트의 구성

Fabric Native Component는 플랫폼의 View를 React 컴포넌트로 노출한다. typed props와 이벤트를 선언하고 Codegen 인터페이스에 맞춰 Android ViewManager 또는 iOS ComponentView를 연결한다. 아래 WebView는 연결 구조를 설명하는 예제이며 완성된 브라우저 보안/탐색 구현은 아니다.

예제 폴더는 `specs/`, `android/app/src/main/java/com/webview/`, `ios/`다. Android는 `WebView`, iOS는 `WKWebView`를 사용한다.

## 1. 컴포넌트 Spec

파일 이름은 `<이름>NativeComponent.ts` 또는 `.js`여야 한다. `NativeComponent` 접미사는 탐색 조건이다.

```ts
import type {CodegenTypes, HostComponent, ViewProps} from 'react-native';
import {codegenNativeComponent} from 'react-native';

export type LoadEvent = {result: 'success' | 'error'};
export interface NativeProps extends ViewProps {
  sourceURL?: string;
  onScriptLoaded?: CodegenTypes.BubblingEventHandler<LoadEvent> | null;
}

export default codegenNativeComponent<NativeProps>(
  'CustomWebView',
) as HostComponent<NativeProps>;
```

- supporting type은 이벤트 payload를 선언한다.
- `NativeProps extends ViewProps`는 View의 공통 props와 커스텀 props를 연결한다.
- `codegenNativeComponent`의 이름은 네이티브 구현을 찾는 등록명이다.
- `BubblingEventHandler`와 direct event는 네이티브 이벤트 등록 방식과 일치해야 한다.

## 2. Codegen 구성

`codegenConfig`에서 `name: AppSpec`, `type: components`, `jsSrcsDir: specs`, Android Java package `com.webview`를 지정한다. iOS 설정 레퍼런스 형태에서는 `ios.components.CustomWebView.className: RCTWebView`로 매핑한다.

0.87의 Fabric 입문 예제에는 구형 `componentProvider` 표기가 남아 있다. [[RN-Codegen#iOS 설정 키의 문서 불일치]]를 참고하고 사용하는 버전의 생성 provider를 확인한다.

이 예제는 New Architecture용이다. 두 아키텍처를 모두 지원하는 배포 구현은 별도 호환 단계가 필요하다.

## Android View 구현

1. `android/`에서 `./gradlew generateCodegenArtifactsFromSchema`를 실행한다.
2. 생성된 `CustomWebViewManagerInterface`, `CustomWebViewManagerDelegate`를 확인한다.
3. Android `WebView`를 상속한 `ReactWebView`를 만든다.
4. constructor마다 공통 초기화 함수를 호출한다.
5. 내부 layout을 맞추고 `WebViewClient`의 `onPageFinished`에서 load 이벤트를 발행한다.

### 이벤트 전달 흐름

1. native view의 `ReactContext`를 얻는다.
2. `UIManagerHelper.getSurfaceId`로 surface ID를 얻는다.
3. `getEventDispatcherForReactTag(context, viewId)`로 해당 View dispatcher를 얻는다.
4. `Arguments.createMap()`으로 `{result: ...}` payload를 만든다.
5. RN `Event`를 상속하여 surfaceId, viewId, 이벤트명과 데이터를 제공한다.
6. dispatcher가 존재할 때 `dispatchEvent`한다.

`onPageFinished` 이벤트를 웹페이지 내부의 모든 script 완료 보장으로 해석하지 않는다. 이름보다 실제 native callback의 의미를 API 계약으로 정의한다.

## Android ViewManager와 패키지

`ReactWebViewManager`는 `SimpleViewManager<ReactWebView>`를 상속하고 생성 인터페이스를 구현한다.

- 생성 delegate를 저장하고 `getDelegate()`에서 반환한다.
- `getName()`은 `CustomWebView`로 Spec 등록명과 맞춘다.
- `createViewInstance`에서 새 native view를 만든다.
- 생성된 `setSourceURL` 계약에 맞춰 prop 변경을 native view에 반영한다.
- nullable URL의 처리와 invalid 입력 처리 방식을 정한다.
- bubbling 이벤트는 `getExportedCustomBubblingEventTypeConstants`에서 `bubbled`, `captured` 이름을 JS prop에 연결한다.
- direct 이벤트는 별도의 direct event 등록 메서드를 사용한다.

원문은 Spec의 `sourceURL`과 일부 Android annotation의 `sourceUrl` 표기가 다르다. 구현에서는 대소문자까지 같은 prop 이름을 사용하고 생성 인터페이스를 기준으로 대조한다.

`ReactWebViewPackage`는 `BaseReactPackage`에서 `createViewManagers`, `getModule`, `getReactModuleInfoProvider`를 구현하여 ViewManager와 등록 메타데이터를 제공한다. 앱 내부 패키지는 `MainApplication.getPackages()` 목록에 추가한다. 매니저 이름과 JS 등록명이 다르면 View를 찾을 수 없다.

## iOS ComponentView

1. `ios/`에서 `bundle install`, `bundle exec pod install`로 Codegen을 실행한다.
2. `.xcworkspace`를 연다.
3. `RCTWebView.h`와 `RCTWebView.mm`를 target에 추가한다.
4. `RCTWebView`는 `RCTViewComponentView`를 상속한다.
5. 생성 `ComponentDescriptors.h`, `EventEmitters.h`, `Props.h`, `RCTComponentViewHelpers.h`를 import한다.
6. 생성된 `RCTCustomWebViewViewProtocol`과 `WKNavigationDelegate`를 구현한다.

### props, layout과 이벤트

- `init`에서 `WKWebView`를 생성하고 delegate를 설정한 뒤 subview로 추가한다.
- `updateProps:oldProps:`에서 생성된 `CustomWebViewProps`를 읽고 URL이 바뀌었을 때 요청을 갱신한다.
- URL 변환과 유효성 검사 뒤 native request를 만든다.
- `layoutSubviews`에서 내부 WebView frame을 component bounds와 맞춘다.
- `didFinishNavigation`에서 생성된 typed EventEmitter로 결과 이벤트를 보낸다.
- `componentDescriptorProvider`는 생성 `CustomWebViewComponentDescriptor`의 provider를 반환한다.

WebView 예제만 `WebKit.framework` 링크가 필요하다. Xcode target의 General, Frameworks/Libraries/Embedded Content에서 추가한다. WebKit을 사용하지 않는 컴포넌트에 이 절차를 강제하지 않는다.

## JavaScript 사용과 배포 주의

Spec export를 import하여 `<WebView sourceURL={...} onScriptLoaded={...} style={...} />`로 사용한다. 크기를 지정하지 않은 native view는 보이지 않을 수 있으므로 부모 크기와 layout을 함께 맞춘다.

생성 코드는 RN 버전별 결과다. 라이브러리에 포함한다면 `peerDependencies`로 지원 범위를 제한하고 실제 앱 조합을 빌드한다. 예제 복제 후 UI 표시만 확인하지 말고 props 갱신, invalid URL, 이벤트 payload, 재사용과 unmount 시 자원 정리도 확인한다.

## 출처

- [React Native, Native Components](https://reactnative.dev/docs/fabric-native-components-introduction)
- [React Native, Using Codegen](https://reactnative.dev/docs/the-new-architecture/using-codegen)

## 관련 문서

- [[RN-Codegen]]
- [[RN-Codegen-Types]]
- [[RN-Native-Component-Advanced]]
- [[RN-Legacy-Android-Components]]
- [[RN-Legacy-iOS-Components]]
