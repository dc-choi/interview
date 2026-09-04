---
tags: [web, mobile, react-native, expo, eas]
status: done
verified_at: 2026-09-04
category: "웹&네트워크(Web&Network)"
aliases: ["Expo", "Expo Framework", "엑스포"]
---

# Expo: React Native 개발과 배포 플랫폼

Expo는 React Native 앱의 개발, 네이티브 설정, 빌드와 배포를 하나의 도구 체인으로 묶은 프레임워크다. 별도의 앱 기술이 아니라 React Native 위에서 동작하며, React Native 공식 문서도 새 앱에는 Expo 같은 프레임워크 사용을 권장한다.

핵심은 Expo Framework와 Expo Application Services(EAS)를 구분하는 것이다. Expo SDK와 CLI는 무료 오픈 소스이고 로컬에서 사용할 수 있다. EAS는 빌드, 스토어 제출과 업데이트를 대신 처리하는 선택적 클라우드 서비스다.

## 구성 요소 구분

| 구성 요소 | 역할 | 운영에서의 위치 |
|---|---|---|
| Expo SDK | 카메라, 파일, 보안 저장소 등 React Native용 라이브러리 모음 | 필요한 패키지만 선택해 사용 |
| Expo CLI | 프로젝트 실행, 네이티브 프로젝트 생성과 로컬 빌드 도구 | 로컬 개발의 기본 도구 |
| Expo Go | 미리 정해진 네이티브 모듈을 담은 학습, 빠른 실험용 앱 | 학습과 초기 프로토타입에 적합 |
| Development Build | 프로젝트가 요구하는 네이티브 코드와 개발 도구를 포함한 전용 앱 | 실제 제품 개발의 기본 실행 환경 |
| EAS Build | Android와 iOS 바이너리의 클라우드 빌드 | 선택 사항 |
| EAS Submit | 빌드 결과의 앱스토어 제출 자동화 | 선택 사항 |
| EAS Update | 호환되는 네이티브 런타임에 JavaScript와 에셋을 배포 | 스토어 배포의 보완 수단 |

Expo Go는 네이티브 구성이 고정돼 있어 임의의 네이티브 라이브러리나 설정을 넣을 수 없다. 실제 출시를 목표로 한다면 초기에만 Expo Go를 쓰고 곧바로 Development Build로 전환하는 편이 안전하다.

## 현재 기술 기준선

2026-09-04 공식 문서 기준이다. 도입 시에는 다시 확인해야 한다.

| 항목 | 기준 |
|---|---|
| 최신 안정 SDK 계열 | Expo SDK 57 |
| React Native, React | React Native 0.86, React 19.2.3 |
| 최소 Node.js | 22.13.x |
| 최소 운영체제 | Android 7 이상, iOS 16.4 이상 |
| React Native 아키텍처 | SDK 55부터 New Architecture만 지원 |

SDK 57 초기에 Hermes v1을 사용하면서 `react-native-worklets` 또는 `react-native-reanimated`를 가져오는 앱의 메모리 증가 회귀가 `expo@57.0.9`에서, 개발 모드 앱 시작 시간 회귀가 `expo@57.0.17`에서 수정됐다. 새 프로젝트는 특정 초기 버전을 고정하기보다 최신 안정 패치를 적용하고 `npx expo-doctor@latest`로 의존성 호환성을 확인한다.

## 권장 개발 흐름

1. `create-expo-app`으로 프로젝트를 만든다.
2. 기기 기능과 네이티브 의존성이 생기기 전에 Development Build를 만든다.
3. Expo 호환 패키지는 `npx expo install`로 설치해 SDK와 맞는 버전을 선택한다.
4. 네이티브 설정은 app config와 config plugin으로 선언하고 CNG가 Android와 iOS 프로젝트를 생성하게 한다.
5. 필요한 경우 Kotlin, Swift 코드나 외부 네이티브 라이브러리를 추가한다.
6. 실제 기기에서 두 플랫폼의 release build를 검증한다.
7. 빌드, 제출과 OTA 업데이트 중 필요한 EAS 서비스만 선택한다.

Expo를 사용해도 네이티브 코드 접근이 막히지 않는다. Development Build에서는 네이티브 라이브러리를 추가할 수 있고, Expo Modules API로 Kotlin과 Swift 모듈도 작성할 수 있다. 단, CNG를 사용하면서 생성된 `android/`, `ios/` 파일을 직접 고치면 다음 prebuild에서 변경이 덮어써질 수 있으므로 config plugin이나 로컬 Expo Module로 변경을 표현하는 것이 기본이다.

## 빌드와 배포 선택지

| 방식 | 장점 | 제약 |
|---|---|---|
| Expo CLI 로컬 빌드 | Expo 계정 없이 가능, 빌드 환경을 직접 통제 | Android Studio와 Xcode 등 네이티브 도구가 필요하고 iOS 빌드는 macOS가 필요 |
| EAS Build 클라우드 | 네이티브 도구 설치 부담을 줄이고 빌드 환경을 표준화 | 계정, 네트워크, 요금제와 서비스 가용성에 의존 |
| `eas build --local` | EAS 서버와 가까운 과정을 로컬에서 재현 | Expo 인증과 프로젝트 등록이 필요하고 캐시 등 일부 클라우드 기능은 미지원 |
| 자체 CI와 네이티브 IDE | 공급자와 파이프라인을 직접 선택 | 인증서, 도구 버전과 빌드 머신을 직접 운영 |

따라서 Expo 도입이 EAS 사용을 강제하지는 않는다. 프레임워크는 유지하면서 빌드만 로컬이나 자체 CI로 옮길 수 있고, 생성된 네이티브 프로젝트를 Android Studio와 Xcode에서 일반 React Native 앱처럼 다룰 수도 있다.

## EAS Update의 경계

EAS Update는 JavaScript 번들, 스타일과 이미지 같은 비네이티브 부분을 호환되는 앱 바이너리에 배포한다. `runtimeVersion`은 업데이트와 이미 설치된 네이티브 코드의 호환 경계를 나타낸다.

- JavaScript 로직, 문구, 스타일과 에셋 변경은 호환되는 런타임에 OTA로 전달할 수 있다.
- 네이티브 코드, 네이티브 의존성, 권한이나 SDK가 바뀌면 새 바이너리를 빌드하고 스토어 배포 절차를 거쳐야 한다.
- 점진 배포와 이전 업데이트 재배포를 지원하지만, 업데이트 전 검증과 중단 기준은 팀이 설계해야 한다.
- 롤백은 로컬 영속 데이터를 되돌리지 않는다. 새 업데이트가 사용자 기기의 데이터를 이전 버전과 호환되지 않게 바꿨다면 과거 업데이트로 돌아가는 대신 fix-forward가 필요할 수 있다.
- OTA 업데이트는 앱스토어 정책과 네이티브 심사를 우회하는 수단으로 간주하면 안 된다.

## 장점

- React와 TypeScript 경험을 Android와 iOS 앱 개발에 재사용하고 일부 코드를 웹과 공유할 수 있다.
- 라우팅, 기기 API, 네이티브 설정과 빌드 도구의 기본 조합을 직접 조립하는 비용이 줄어든다.
- React Native와 Expo SDK 버전 조합을 공식 도구가 관리해 초기 환경 구성이 단순하다.
- Development Build를 사용하면 외부 네이티브 라이브러리와 직접 작성한 네이티브 코드까지 수용할 수 있다.
- EAS Build, Submit과 Update를 선택하면 빌드부터 배포까지 한 흐름으로 운영할 수 있다.
- EAS를 사용하지 않는 로컬 빌드와 자체 CI 경로가 있어 단계적으로 도입하거나 이탈할 수 있다.

## 비용과 한계

- Expo는 네이티브 지식을 제거하지 않는다. 플랫폼별 권한, 서명, 스토어 정책과 네이티브 장애를 다룰 역량은 여전히 필요하다.
- 각 Expo SDK는 특정 React Native 버전에 연결된다. SDK와 네이티브 라이브러리 호환성 검증, 정기 업그레이드를 운영 업무로 잡아야 한다.
- 최소 OS 버전이 서비스 대상 기기보다 높다면 현재 SDK를 바로 선택할 수 없다.
- EAS를 선택하면 빌드 대기열, 사용량 과금과 외부 서비스 장애를 운영 위험으로 받아들여야 한다.
- EAS가 관리하는 서명 자격 증명은 암호화되지만 제3자에게 보관을 맡기는 신뢰 결정이다. 필요하면 로컬 자격 증명을 사용하고 별도로 백업, 회전 절차를 둔다.
- EAS Update의 종단간 코드 서명은 Production과 Enterprise 요금제에서만 제공된다. 업데이트 무결성 요구를 요금제 선택과 함께 검토해야 한다.
- 백그라운드 작업과 푸시 도달 시점 같은 모바일 동작은 운영체제 정책의 영향을 받는다. Expo가 플랫폼 자체의 제약을 없애지는 않는다.

## 비용 기준

2026-09-04 공개 가격 기준이며 실제 결제 전 다시 확인한다.

| 항목 | 비용 또는 포함량 |
|---|---|
| Expo Framework | 무료 오픈 소스 |
| EAS Free | 월 Android 15회와 iOS 15회 빌드, 낮은 우선순위, EAS Update 1,000 MAU |
| EAS Starter | 월 19달러와 추가 사용료, 빌드 크레딧 45달러, EAS Update 3,000 MAU |
| EAS Production | 월 199달러와 추가 사용료, 빌드 크레딧 225달러, 동시 빌드 2개, EAS Update 50,000 MAU |
| Apple Developer Program | 연 99달러 또는 지역 통화 |
| Google Play Console | 1회 25달러 등록비 |

EAS Update의 사용량 과금은 MAU뿐 아니라 글로벌 엣지 대역폭도 계산한다. 예상 비용에는 압축된 업데이트 크기, 월 배포 횟수와 실제 다운로드 패턴을 함께 넣어야 한다.

Google Play의 2023-11-13 이후 생성된 개인 개발자 계정은 프로덕션 접근 신청 전에 최소 12명의 테스터가 14일 동안 연속으로 참여 등록 상태를 유지한 비공개 테스트를 완료해야 한다. 이는 Expo가 아니라 스토어의 배포 조건이다.

## 도입 판단 기준

### 잘 맞는 경우

- 새 React Native 앱을 한 팀이 Android와 iOS에 함께 제공한다.
- React와 TypeScript 경험을 활용하면서 네이티브 설정의 반복 작업을 줄이고 싶다.
- 사용하는 핵심 네이티브 라이브러리가 New Architecture와 현재 Expo SDK를 지원한다.
- 클라우드 빌드, 제출 자동화나 OTA 업데이트를 필요에 따라 선택하고 싶다.

### 먼저 검증해야 하는 경우

- 매우 오래된 Android나 iOS 버전을 반드시 지원해야 한다.
- 핵심 기능이 호환성이 확인되지 않은 네이티브 SDK나 대규모 플랫폼별 코드에 의존한다.
- 빌드 소스와 자격 증명을 외부 서비스에 보낼 수 없는 보안, 규제 조건이 있다.
- 이미 안정적인 네이티브 빌드와 배포 파이프라인이 있어 Expo의 이점이 작다.

## 최소 도입 검증

1. 지원할 최소 OS와 Expo SDK의 지원 범위를 대조한다.
2. 핵심 네이티브 의존성을 목록화하고 New Architecture 호환성을 확인한다.
3. 가장 어려운 기기 기능을 Development Build와 실제 Android, iOS 기기에서 먼저 검증한다.
4. 두 플랫폼의 release build와 스토어 내부 테스트까지 한 번 통과시킨다.
5. EAS Build, Submit과 Update를 각각 사용할지 결정하고 로컬 대체 경로를 남긴다.
6. `runtimeVersion`, 점진 배포, 롤백과 새 바이너리가 필요한 변경 기준을 문서화한다.
7. 서명 자격 증명의 소유자, 저장 위치, 백업과 회전 절차를 정한다.
8. 월 빌드 횟수, Update MAU, 압축된 업데이트 크기와 배포 횟수로 무료 한도와 예상 비용을 계산한다.

## 결론

Expo는 새 React Native 앱의 합리적인 기본 선택지다. 다만 성공 조건은 Expo Go를 제품 실행 환경으로 오해하지 않고, Development Build를 일찍 사용하며, 네이티브 호환성과 실제 스토어 배포를 초기에 검증하는 것이다. EAS는 편리한 선택지이지 Expo Framework의 필수 조건은 아니다.

## 출처

- [React Native](https://reactnative.dev/)
- [Expo Documentation, Expo SDK reference](https://docs.expo.dev/versions/latest/)
- [Expo Documentation, FAQ](https://docs.expo.dev/faq/)
- [Expo SDK 57 — Expo Changelog](https://expo.dev/changelog/sdk-57)
- [Expo Documentation, Develop an app with Expo](https://docs.expo.dev/workflow/overview/)
- [Expo Documentation, Introduction to development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Documentation, Add custom native code](https://docs.expo.dev/workflow/customizing/)
- [Expo Documentation, React Native's New Architecture](https://docs.expo.dev/guides/new-architecture/)
- [Expo Documentation, Run EAS Build locally with local flag](https://docs.expo.dev/build-reference/local-builds/)
- [Expo Documentation, Build your project for app stores](https://docs.expo.dev/deploy/build-project/)
- [Expo Documentation, EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [Expo Documentation, Runtime versions and updates](https://docs.expo.dev/eas-update/runtime-versions/)
- [Expo Documentation, Error recovery](https://docs.expo.dev/eas-update/error-recovery/)
- [Expo Documentation, End-to-end code signing with EAS Update](https://docs.expo.dev/eas-update/code-signing/)
- [Expo Documentation, Security](https://docs.expo.dev/app-signing/security/)
- [Expo Documentation, BackgroundTask](https://docs.expo.dev/versions/latest/sdk/background-task/)
- [Expo Documentation, Push notifications troubleshooting and FAQ](https://docs.expo.dev/push-notifications/faq/)
- [Expo Application Services pricing — Expo](https://expo.dev/pricing/)
- [Expo Documentation, Usage-based pricing](https://docs.expo.dev/billing/usage-based-pricing/)
- [Apple Developer, Membership Details](https://developer.apple.com/programs/whats-included/)
- [Google Play Console Help, Get started with Play Console](https://support.google.com/googleplay/android-developer/answer/6112435)
- [Google Play Console Help, App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465)

## 관련 문서

- [[Mobile-App-Architectures|모바일 서비스 아키텍처]]
- [[React|React]]
