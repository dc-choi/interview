---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Metro bundle, asset과 worker"]
---

# Expo Metro bundle, asset과 worker

## Bundle 분리

Production 웹 export는 async import를 기준으로 chunk를 나눈다. entry bundle에 `@expo/metro-runtime`이 필요하며 Router에는 기본 포함된다. async bundle들이 공유하는 의존성은 초기 공통 chunk로 합쳐질 수 있고 splitting heuristic은 직접 설정할 수 없다.

외부 source map을 만들면 bundle과 map에 대응하는 debugId를 추가한다. inline map 또는 source map 미생성에는 같은 주석이 붙지 않는다. Hermes bytecode 처리 이후까지 bundle/map의 일치가 유지되는지 오류 수집 업로드 과정에서 확인한다.

`EXPO_USE_METRO_REQUIRE=1`은 사람이 읽을 수 있고 결정적인 string module ID를 사용한다. legacy RAM bundle을 지원하지 않는다.

## Runtime import 예외

`import(/* @metro-ignore */ './module.js')`는 Metro dependency graph에서 해당 import를 제외한다. 서버 runtime이 직접 읽을 수 있도록 실제 출력 파일을 올바른 위치에 제공해야 한다. Hermes native bundle에는 일반적으로 이런 runtime import가 없으므로 적용하지 않는다. webpackIgnore 주석도 인식하지만 앱 코드에는 Metro 형식을 우선한다.

## Asset 타입

Native import의 asset은 numeric ID다. 웹/서버 이미지는 uri와 선택적 width/height 객체, 다른 asset은 URL 문자열일 수 있다. 웹에서는 String(asset)으로 public URL을 얻을 수 있지만 함수 직렬화가 안 되는 RSC 환경은 예외다.

API route에서 이미지 asset은 요청 origin을 기준으로 asset.uri를 URL로 해석해 가져올 수 있다. native의 숫자 asset ID를 서버 URL이라고 처리하지 않는다.

## Web Worker

Worker bundling은 alpha이며 웹용이다. `new Worker(new URL('./worker', window.location.href))`처럼 분석 가능한 표현을 쓰고 Router 또는 @expo/metro-runtime을 구성한다. `EXPO_NO_METRO_LAZY=1`과 함께 사용할 수 없다.

Worker는 main bundle 공통 모듈에 의존할 수 없어 필요한 모듈 사본을 자체 bundle에 포함한다. 변수를 사용한 constructor 표현은 bundling 분석이 안 되므로 public의 미리 변환된 파일을 직접 참조하는 방식과 구분한다.

React Native에는 이 Worker API가 제공되지 않는다. 브라우저 worker와 Reanimated worklet은 별도 실행 모델이다. Worker 사용 후 메시지 계약과 수명 관리를 앱에서 처리한다.

## 기존 native 프로젝트 연결

Prebuild를 쓰지 않는 앱은 Metro 파일만 추가해도 끝나지 않는다. native build script가 `expo export:embed`, 개발 실행이 `expo start`를 사용하도록 Gradle/Xcode를 연결해야 한다. custom entry 사용 시 개발과 production의 entry 해석을 모두 맞춘다.

현재 Markdown reference에는 일부 native patch snippet이 비어 있다. 이를 근거로 전체 Gradle/Xcode patch를 검증했다고 판단하지 않는다. 해당 SDK의 실제 native template, 공식 설치 안내와 최종 native project를 대조한다.

## 출처

- [Expo Documentation, metro.config.js](https://docs.expo.dev/versions/latest/config/metro)

## 관련 문서

- [[Expo-Configuration-Reference]]

- [[Expo]]
