---
tags: [react-native, mobile, performance]
status: done
verified_at: 2026-10-09
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 네이티브 빌드 시간"]
---

# React Native 네이티브 빌드 시간

React Native 0.87 문서 기준이다.

빌드 최적화는 개발 반복 시간을 줄이는 작업이다. 실행 중 FPS 개선과 별도로 측정한다. 먼저 의존성 다운로드, Gradle configuration, native compile 중 시간을 쓰는 단계를 확인한다.

## 개발용 Android ABI 제한

개발 기기에 필요한 ABI만 빌드하면 불필요한 native compile을 줄일 수 있다.

```sh
npx react-native run-android --active-arch-only
```

CLI가 기기 또는 emulator의 ABI를 감지했는지 출력을 확인한다. 직접 Gradle을 실행할 때는 프로젝트 `android/`에서 다음처럼 지정한다.

```sh
./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

여러 ABI는 쉼표로 나열하고, 로컬 `gradle.properties`에서도 `reactNativeArchitectures`를 설정할 수 있다. release에서는 배포 대상 ABI가 빠지지 않도록 개발용 제한을 제거하거나 별도 설정으로 관리한다. 문서의 절감률 예시는 모든 프로젝트의 보장값이 아니다.

## Gradle configuration cache

React Native 0.79부터 지원하는 configuration cache는 `.gradle`을 평가하는 configuration 단계를 다음 빌드에서 재사용한다. task output을 재사용하는 build cache와 역할이 다르다.

```properties
org.gradle.configuration-cache=true
```

앱과 플러그인의 호환성을 확인하고 첫 실행과 반복 실행을 나눠 측정한다. 캐시를 켰다는 사실만으로 모든 task가 생략되는 것은 아니다.

## Gradle task output 재사용

Android 빌드에서는 configuration cache와 별도로 task output을 재사용할 수 있다. Gradle 9.8.1 문서 기준이며, 실제 적용은 프로젝트의 Gradle과 플러그인 버전에서 확인한다.

| 구분 | 재사용하는 것 | 확인할 경계 |
|---|---|---|
| Configuration cache | 설정 단계에서 계산한 빌드 상태 | 설정 입력 변경과 플러그인 호환성 |
| `UP-TO-DATE` | 같은 작업공간에 남아 있는 task output | 입력과 출력이 이전 실행 이후 바뀌지 않았는가 |
| `FROM-CACHE` | local 또는 remote build cache에 저장한 task output | task 구현과 선언한 입력 등이 캐시 키와 맞는가 |

`FROM-CACHE`는 다른 사람이 만든 결과라는 뜻이 아니다. 자신이 이전에 만든 local cache에서도 복원할 수 있다. build cache는 다운로드한 의존성 보관소와도 다르다.

`org.gradle.caching=true` 또는 실행 옵션 `--build-cache`로 켠다. 먼저 변경 없는 연속 빌드에서 output을 갖는 task가 `UP-TO-DATE`가 되는지 확인한다. 그다음 산출물을 지운 빌드에서 cacheable task의 `FROM-CACHE`와 전체 소요 시간을 함께 본다. `clean`만으로 build cache까지 비워지는 것은 아니다. task output cache를 쓰지 않는 기준 실행은 `clean`과 `--no-build-cache`를 함께 사용하고, configuration cache와 compiler cache의 사용 여부도 별도로 기록해 비교한다.

- 입력 누락은 잘못된 결과 재사용으로, 같은 입력에서 달라지는 출력은 후속 task의 cache miss로 이어질 수 있다. 시각이나 절대경로처럼 결과에 섞이는 값부터 확인한다.
- 공유 remote cache에는 신뢰할 수 있는 CI job만 쓰고 개발자와 다른 job은 읽도록 권한을 분리하는 구성을 검토한다. 캐시 속도를 위해 검증되지 않은 산출물의 쓰기 권한을 넓히지 않는다.
- hit 비율만으로 효과를 판단하지 않는다. 어떤 task를 생략했는지, 복원에 든 시간과 전체 빌드 시간이 함께 줄었는지 비교한다.

## Maven mirror

`exclusiveEnterpriseRepository`는 지정한 repository만으로 의존성을 가져오도록 한다. 조직 mirror가 이미 있고 필요한 artifact를 모두 제공할 때 선택한다. 외부 fallback이 자동 유지된다고 생각하면 누락 artifact로 빌드가 실패할 수 있다.

## Compiler cache

`ccache`는 compiler 호출과 중간 결과를 재사용해 반복 C++/Objective-C 빌드 비용을 줄인다. macOS에서는 `brew install ccache`로 설치할 수 있으며 실제 설치는 프로젝트 환경에 맞춰 수행한다.

iOS는 Podfile의 `react_native_post_install` 호출에 `:ccache_enabled => true`를 설정한다. Android/iOS 둘 다 변경 전후 `ccache -s`로 hit/miss를 확인한다. 누적 통계라면 `ccache --zero-stats` 뒤 측정한다. `ccache --clear`는 캐시 삭제이므로 성능 조사 중 무심코 실행하지 않는다.

CI에서는 다음 조건을 확인한다.

- 반복 checkout의 timestamp 차이 때문에 cache hit가 줄 수 있다. `compiler_check`의 `content` 선택을 검토한다.
- clean build와 캐시 재사용 검증을 함께 해 오염된 cache가 오류를 숨기지 않게 한다.
- OS, compiler와 build option이 다른 산출물을 혼용하지 않는다.
- ABI별 job 분할이 이미 충분한지 확인한 뒤 공유 cache를 추가한다.

큰 조직의 반복 빌드에는 `sccache` 등의 분산 cache가 후보지만 네트워크와 운영 비용을 추가한다. 현재 병목이 다운로드인지 compilation인지 확인한 뒤 선택한다.

## 이해 확인

- configuration cache와 compiler cache 중 어떤 것이 현재 병목을 줄이는가?
- 개발 ABI 제한이 release에 남았는지 어디서 검증할 것인가?
- cache hit는 높은데 전체 빌드가 느리다면 어느 단계를 다시 측정할 것인가?

## 출처

- [React Native, Speeding up your Build phase](https://reactnative.dev/docs/build-speed)
- [Gradle, Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)
- [Gradle, Solving common problems](https://docs.gradle.org/current/userguide/common_caching_problems.html)
- [Gradle, Gradle on CI / CD Systems](https://docs.gradle.org/current/userguide/gradle_on_ci.html)

## 관련 문서

- [[React-Native-Performance]]
- [[React-Native-JavaScript-Loading]]
