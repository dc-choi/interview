---
tags: [react-native, mobile, quality]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native release 오류와 source map"]
---

# React Native release 오류와 source map

React Native 0.87 문서 기준이다.

배포 번들은 함수명이 축약되고 stack trace에 bytecode offset이 표시될 수 있다. Symbolication은 해당 빌드의 source map으로 이를 원래 파일, 함수와 줄 위치에 대응시키는 과정이다.

## 플랫폼별 source map

Android는 문서 기준 기본 활성화다. Hermes 설정을 바꿨다면 `android/app/build.gradle`에서 출력 옵션을 확인한다.

```groovy
react {
    hermesFlags = ["-O", "-output-source-map"]
}
```

iOS는 문서 기준 기본 비활성화다. Xcode의 Bundle React Native code and images build phase에서 다른 export보다 앞에 원하는 출력 위치를 설정한다.

```sh
export SOURCEMAP_FILE="$(pwd)/../main.jsbundle.map"
```

그 뒤 실제 빌드 로그의 bundle과 source map 출력 경로를 확인한다. 빌드 과정에는 Metro packager map과 최종 map이 여러 개 생길 수 있으므로 아무 `.map` 파일이나 사용하지 않는다.

## stack trace 복원

Android release 예시 경로다. variant와 빌드 도구가 다르면 실제 최종 출력 경로에 맞춘다.

```sh
npx metro-symbolicate \
  android/app/build/generated/sourcemaps/react/release/index.android.bundle.map \
  < stacktrace.txt
```

`adb logcat -d` 출력을 pipe로 전달할 수도 있다. 입력을 터미널에서 기다리게 두지 않고 파일 redirection이나 pipe로 전달한다. 명령이 바로 성공 종료하지만 결과가 없으면 입력 전달부터 확인한다.

## 산출물 보관 기준

source map은 crash가 발생한 앱과 정확히 대응해야 한다. 같은 commit이어도 빌드 설정, 의존성, 번들 또는 업데이트 산출물이 달라졌으면 대응을 다시 확인한다. 작은 소스 변경도 offset을 크게 바꿀 수 있다.

운영에서는 앱 버전과 build 식별자, commit, 배포 bundle, 최종 source map을 함께 대응시키는 것이 실용적이다. 이는 재현 가능성을 위한 운영 적용안이며 별도의 업로드 시스템을 요구하는 것은 아니다.

## 확인 순서

1. crash 앱의 release/build 식별자와 플랫폼을 확보한다.
2. 그 산출물의 최종 map을 찾는다.
3. 원본 stack trace를 symbolicate한다.
4. 복원된 위치가 실제 빌드 소스와 대응하는지 확인한다.
5. 네이티브 crash라면 JS source map만으로 조사하지 않고 native symbol 도구를 사용한다.

## 출처

- [React Native, Debugging Release Builds](https://reactnative.dev/docs/debugging-release-builds)

## 관련 문서

- [[React-Native-Native-Debugging]]
- [[React-Native-Hermes]]
