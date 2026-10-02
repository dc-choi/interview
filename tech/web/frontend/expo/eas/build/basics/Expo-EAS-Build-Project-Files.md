---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 프로젝트 초기화와 upload 범위"]
---

# EAS 프로젝트 초기화와 upload 범위

## Build configure

`eas build:configure`는 프로젝트를 EAS에 초기화하고 대상 플랫폼을 고른 뒤 eas.json을 만든다. 설정이 없을 때 eas build도 이 흐름을 실행한다. Expo 프로젝트의 android.package와 ios.bundleIdentifier가 없으면 첫 build에서 입력받는다. 이 ID는 각 스토어의 앱 식별자이므로 이름 변경처럼 가볍게 바꾸지 않는다.

기존 native 프로젝트는 native 설정을 사용한다. `cli.requireCommit: true`가 있으면 변경 commit을 요구할 수 있으므로 실제 수정 내용을 먼저 검토한다. Configure 성공과 build 성공은 별도다.

## Monorepo

EAS CLI는 저장소 root가 아니라 **앱 디렉터리 root**에서 실행한다. 앱마다 eas.json과 credentials.json을 둔다. 내부 workspace 패키지의 선행 build가 필요하면 app의 postinstall 등 올바른 단계에서 준비한다. 해당 script의 cwd와 의존 순서를 확인한다.

Workspace package manager 지원과 모든 third-party monorepo 도구 호환은 같은 의미가 아니다. Metro와 Autolinking이 같은 native dependency를 가리키는지 함께 확인한다.

## easignore

`.easignore`를 프로젝트 root에 둔다. 이 파일이 있으면 .gitignore보다 우선하며 두 파일이 자동으로 합쳐지는 것으로 가정하지 않는다. 기존 .gitignore의 필요한 제외 규칙을 복사한 뒤 build에 불필요한 docs/coverage 등을 추가한다.

`!generated-file.json`처럼 마지막에 예외를 두어 소스 관리에 없는 필수 파일을 업로드할 수 있다. 단, 다른 경로의 비밀값을 함께 재포함하지 않도록 최종 archive를 확인한다.

CNG로 native 디렉터리를 재생성하는 프로젝트라면 android/ios 제외가 가능하다. 수동 native 수정이 정본인 프로젝트에서 이를 제외하면 변경을 잃은 build가 만들어질 수 있다. native 디렉터리의 업로드 여부는 관리 방식에 따라 결정한다.

## 출처

- [Expo Documentation, Build configuration process](https://docs.expo.dev/build-reference/build-configuration)
- [Expo Documentation, Set up EAS Build with a monorepo](https://docs.expo.dev/build-reference/build-with-monorepos)
- [Expo Documentation, Ignore files via .easignore](https://docs.expo.dev/build-reference/easignore)

## 관련 문서

- [[Expo-EAS-Build-Basics]]

- [[Expo]]
