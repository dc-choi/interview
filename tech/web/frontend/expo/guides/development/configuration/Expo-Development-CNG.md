---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo CNG와 Prebuild의 생성 계약"]
---

# Expo CNG와 Prebuild의 생성 계약

## 생성 입력과 유지할 원본

Continuous Native Generation은 native 프로젝트를 평생 수동 유지하는 대신 필요한 시점에 표준 템플릿과 사용자 정의에서 재생성하는 방식이다. 유지할 원본은 app config, 의존성, config plugin과 native module이다. Expo Prebuild는 이 패턴을 Android/iOS에 구현한다.

생성은 app config, CLI 인자, 설치된 Expo SDK에 대응하는 template, package autolinking과 lifecycle subscriber를 조합한다. 추가 target과 entitlement의 signing은 EAS Credentials와 연결할 수 있다. web은 브라우저 런타임을 사용하므로 native Prebuild가 필요 없다.

## 명령과 부작용

```sh
npx expo prebuild --clean
npx expo prebuild --platform ios
npx expo prebuild --skip-dependency-update react-native,react
npx expo prebuild --no-install
```

| 옵션/동작 | 계약 |
| --- | --- |
| 기본 `prebuild` | `android/`, `ios/` 생성 또는 기존 파일에 변경 누적 |
| `--clean` | 기존 native 디렉터리를 삭제하고 새로 생성 |
| `--platform` | 지정 플랫폼만 생성 |
| `--skip-dependency-update` | 지정 npm 패키지의 버전 변경 생략 |
| `--no-install` | 설치 생략, 생성 결과를 빠르게 확인 |
| `--npm`, `--yarn`, `--pnpm` | lockfile 추론 대신 package manager 선택 |
| `--template` | template tarball 사용, 기본 modifier의 가정과 호환성 책임 |

Prebuild는 native 폴더 외에도 package scripts의 `expo start --android/--ios`를 `expo run:android/ios`로 바꾸고 dependencies를 갱신할 수 있다. template의 React/React Native 버전과 다르면 경고한다. 의존성이 변경되면 lockfile로 추론한 manager로 재설치한다.

## clean을 권장하는 이유

clean 없는 반복 생성은 빠르지만 멱등성이 없는 plugin이나 dangerous modifier의 정규식 변경이 겹치면 결과가 달라질 수 있다. clean은 생성 입력에서 시작하는 재현성을 높이지만 수동 편집을 삭제한다. 미커밋 변경 경고는 CI에서 생략되며 `EXPO_NO_GIT_STATUS=1`로 끌 수 있다. 경고를 끈 것이 손실 방지를 보장하지 않는다.

native 폴더는 Git 또는 EAS 업로드에서 제외해 생성 산출물로 취급한다. 앱 고유 Swift/Kotlin 코드는 삭제되는 폴더 밖의 local module에 두고 설정 수정은 plugin으로 표현한다.

## EAS와 로컬 실행의 경계

- EAS Build 업로드에 native 폴더가 없으면 Prebuild 후 컴파일한다.
- native 폴더가 있으면 수동 변경 보호를 위해 자동 Prebuild를 하지 않는다.
- 로컬 `run:android/ios`도 폴더가 없을 때 해당 플랫폼을 생성한다. 다음 실행에서 config를 변경했으면 별도 clean 생성과 재빌드를 수행한다.
- `.gitignore` 또는 `.easignore`의 `/android`, `/ios`가 클라우드의 생성 여부에 영향을 준다.

## 라이브러리 통합 방식

JS 전용 패키지는 별도 native 설정이 없다. native 코드만 있으면 autolinking으로 충분할 수 있다. 권한 메시지, target 등 설정 부작용이 있으면 config plugin이 필요하다. AppDelegate/MainApplication 같은 런타임 hook은 native subscriber/lifecycle listener로 entry point 직접 수정을 줄일 수 있다.

CNG는 선택 사항이다. 기존 native 프로젝트를 수동 관리하면서 Expo SDK, CLI와 EAS를 사용할 수 있다. Prebuild를 채택하지 않은 프로젝트에 명령을 그대로 실행하면 사용자 정의를 덮어쓸 수 있다. CNG는 native 프로젝트 전체를 관리하므로 기존 brownfield 앱 전체에 그대로 적용하는 방식은 적합하지 않다. 별도 생성 프로젝트를 만든 뒤 기존 앱에 통합할 수 있다.

## 적용 조건과 한계

SDK 업그레이드는 package/config/plugin 변경 후 native 재생성으로 단순화되지만 plugin 호환성까지 자동 보장하지 않는다. native 파일을 바로 편집하는 실험은 빠를 수 있으나 CNG로 돌아오려면 변경을 module/plugin으로 옮겨야 한다. community package에 plugin이 없으면 직접 작성하거나 외부 plugin을 검증한다. 기본 template 대체는 `@expo/prebuild-config`가 template 구조에 갖는 문서화되지 않은 가정 때문에 유지 비용이 커질 수 있다.

## 출처

- [Expo Documentation, Continuous Native Generation (CNG)](https://docs.expo.dev/workflow/continuous-native-generation)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
