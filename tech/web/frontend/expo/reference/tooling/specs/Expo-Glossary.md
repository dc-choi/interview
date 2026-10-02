---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 개발 용어와 경계"]
---

# Expo 개발 용어와 경계

## 앱과 runtime

| 용어 | 의미와 구분 |
| --- | --- |
| React Native | React 컴포넌트로 native UI를 만드는 기반. JS만 존재하는 웹 앱이라는 뜻이 아님 |
| Expo SDK | 기기/시스템 기능별 패키지 묶음. 패키지마다 지원 플랫폼과 권한이 다름 |
| Expo Go, Expo client | 미리 정해진 native 기능을 포함한 학습/실험용 앱. Expo client는 이전 이름 |
| Development build, custom dev client | expo-dev-client를 포함해 앱에 필요한 native 기능을 넣은 debug build |
| expo-dev-client | 개발 도구를 추가하는 라이브러리. 앱 바이너리 자체와 구분 |
| Standalone app, production build | 앱별 배포 바이너리. 개발 서버 없이 실행할 bundle을 포함할 수 있음 |
| Native runtime | JS engine과 native 기능을 갖춰 bundle을 실행하는 환경 |
| Native module | native 기능을 JS에 노출하는 모듈. 구식 NativeModules 접근과 현대 Expo Modules API를 구분 |
| Expo Modules API, Sweet API | expo-modules-core가 제공하는 Swift/Kotlin 모듈 정의 API. Sweet API는 같은 계열의 용어 |
| Hermes | React Native의 기본 JS engine. bytecode와 모바일 시작 성능에 초점 |
| JavaScriptCore, V8 | 다른 JS engine. 프로젝트/SDK별 지원과 debugging 구성은 별도 확인 |
| Fabric | React Native의 native view renderer |
| Yoga | native view의 Flexbox 기반 레이아웃 계산 라이브러리 |
| React Native Web | React Native primitive를 react-dom 위에서 제공하는 계층 |
| Expo Router | 파일 기반 route를 native/웹 화면 탐색에 연결 |
| React Navigation | React Native 내비게이션 라이브러리 |
| Android, iOS | 모바일 운영체제. iPadOS/tvOS 구분이 필요한 기능은 해당 플랫폼 reference를 확인 |
| Emulator, Simulator | 개발 PC의 가상 기기. Android는 Emulator, Apple 도구는 Simulator라는 이름을 사용 |
| Experience | 문맥에 따라 앱을 가리키는 표현. 별도 빌드 형식은 아님 |

## 생성과 native 관리

| 용어 | 의미와 구분 |
| --- | --- |
| App config, app.json | CLI/public manifest/native 생성의 입력. 동적 js/ts 파일도 사용 가능 |
| CNG | 입력으로 native 프로젝트를 재생성하는 접근 방식 |
| Prebuild | Expo에서 CNG를 실행하는 명령 단계 |
| Prebuild template | 설치 SDK에 대응하는 native 초기 프로젝트. 변경 시 Prebuild의 기본 가정을 확인 |
| Bare/managed workflow | 이전 분류명. 현재 판단은 native 파일을 생성하는지 직접 관리하는지로 명확히 함 |
| Config plugin | app config와 native 생성 동작을 확장하는 JS 함수 |
| Config mod | Info.plist/AndroidManifest 같은 native 파일에 적용할 modifier |
| Dangerous mod | 안정된 mod 추상화 밖 파일 변경. SDK 변경과 실행 순서에 취약 |
| Config introspection | 일부 native 변경 결과를 메모리에서 평가. 빌드/런타임 검증은 아님 |
| Expo module config | expo-module.config.json. 모듈 플랫폼/클래스 등 Autolinking 입력 |
| Autolinking | native module을 native package/build system에 자동 연결 |
| Expo/Community Autolinking | 서로 다른 모듈 검색/연결 체계. 현재 역할은 설치 SDK의 설정을 대조 |
| CocoaPods, Podfile | iOS native 의존성 관리와 구성 |
| Gradle | Android compile, packaging 등 build 작업 실행 |
| Apple capabilities | Apple 개발자 설정에서 앱에 허용하는 기능 |
| Auto capability signing | EAS가 entitlement에 맞춰 Apple capability를 동기화하는 기능 |
| Apple Developer Portal | 앱 서명/기능 설정을 관리하는 Apple 사이트 |

Prebuild는 선택 가능한 관리 방식이다. Expo 사용을 곧 모든 앱의 native 디렉터리 재생성 의무로 해석하지 않는다. 직접 관리하는 native 프로젝트에도 Expo Modules를 연결할 수 있다.

## 도구와 소스

| 용어 | 의미와 구분 |
| --- | --- |
| Expo CLI, Local/Versioned Expo CLI | 프로젝트 expo와 함께 설치되는 @expo/cli. 과거 global expo-cli와 구분 |
| create-expo-app | Expo 앱 생성기. 오래된 create-react-native-app 표현과 구분해 현행 생성기를 사용 |
| create-expo-module | local/standalone native module 생성과 플랫폼 추가 도구 |
| Expo start, development server | 앱이 개발 bundle을 받는 서버, 기본 port 8081 |
| Expo install | SDK와 알려진 호환 버전을 선택하는 설치 도우미 |
| Expo Doctor | `npx expo-doctor`로 프로젝트 설정/의존성 검사 |
| Expo export | JS와 asset 출력. native compile이나 외부 배포 자체가 아님 |
| Entry point | 앱을 등록/시작하는 JS entry. Router 앱의 entry와 기본 AppEntry 경로를 구분 |
| Metro, Metro config | 모듈 해석과 bundle 생성기, metro.config.js 설정 |
| Babel | runtime이 처리할 수 있도록 JS 문법 등을 변환 |
| Platform extensions | Android는 .android/.native/공통, iOS는 .ios/.native/공통, 웹은 .web/공통 순서 |
| Watchman | Metro가 파일 감시/탐색에 사용할 수 있는 daemon |
| TypeScript | 정적 타입과 개발 도구를 제공하는 JS 확장 |
| Package manager | 의존성 설치/업그레이드/제거 도구 |
| npm, pnpm, Yarn, Bun | JS 패키지 관리자 선택지. Bun은 runtime 역할도 가짐 |
| Monorepo, package manager workspaces | 여러 패키지를 한 저장소에서 연결해 관리하는 구조와 도구 기능 |
| webpack | Expo에서 deprecated된 웹 bundler 경로 |
| Native directory | 문맥에 따라 android/ios 폴더 또는 라이브러리 목록 사이트 React Native Directory를 뜻하므로 구분 |
| Linking | 앱 URL을 여는 deep linking 또는 native 의존성 autolinking으로 의미가 다름 |
| Remote Debugging | JS를 외부 Chrome에서 실행하던 deprecated 방식. 현재 Hermes DevTools와 구분 |

## 배포, 관측과 보조 도구

| 용어 | 의미와 구분 |
| --- | --- |
| EAS, EAS CLI | Expo의 클라우드 서비스 묶음과 이를 조작하는 CLI |
| EAS Config | eas.json. app config와 다른 build/submit 등의 설정 |
| EAS Build | Android/iOS binary 생성 서비스 |
| EAS Update, updates | 호환 runtime에 JS/asset update를 전달하는 서비스와 작업. native 코드를 교체하지 않음 |
| Manifest | 앱 또는 update 실행에 필요한 metadata. AndroidManifest.xml과 구분 |
| Expo Fingerprint | native build에 영향을 주는 파일/구성의 hash로 호환성 판단을 돕는 도구 |
| Publish | 배포를 뜻하는 일반 표현. 실제 작업은 update/스토어/web 배포로 구분 |
| EAS Hosting | Router 웹/서버 출력 호스팅 |
| EAS Workflows | .eas/workflows YAML로 build/update/submit/test 등 작업 자동화 |
| EAS Metadata, Store config | App Store metadata 동기화 도구와 store.config.json |
| EAS Insights | 앱 사용/도달 등의 지표 서비스와 expo-insights |
| EAS Observe | production 성능/사용자 이벤트를 수집하는 서비스와 expo-observe |
| Expo Atlas | bundle 구성과 크기 분석 |
| Expo Orbit | EAS/로컬/Snack build 또는 update 설치/실행을 돕는 데스크톱 앱 |
| Expo MCP server | AI 도구가 Expo 프로젝트에 접근하는 원격 도구 서버 |
| VS Code Expo Tools | app/EAS/module/store config 편집과 진단을 돕는 확장 |
| Snack | 브라우저에서 Expo 예제를 만드는 개발 환경 |
| Expo FYI | 특정 문제를 설명하는 보조 해결 문서 모음 |
| Slug | Expo 계정 안에서 고유한 URL용 프로젝트 이름 |
| Meta, Software Mansion | React Native 생태계의 공개 기술/라이브러리 유지보수 조직. 개별 패키지 지원 여부는 별도 확인 |

같은 용어라도 오래된 문서의 실행 명령과 현재 도구가 다를 수 있다. 특히 Doctor 실행, managed/bare 구분, entry point와 deprecated 기능은 현행의 구체적인 CLI/reference를 우선한다.

## 출처

- [Expo Documentation, Glossary of terms](https://docs.expo.dev/more/glossary-of-terms)

## 관련 문서

- [[Expo-Specifications]]

- [[Expo]]
