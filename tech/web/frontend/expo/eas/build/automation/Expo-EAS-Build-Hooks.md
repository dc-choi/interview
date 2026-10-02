---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Build lifecycle hook"]
---

# EAS Build lifecycle hook

## Hook 실행 순서

package.json script에 EAS 전용 hook 이름을 선언하면 기본 build 과정의 해당 시점에 실행한다.

| Hook | 시점 |
| --- | --- |
| `eas-build-pre-install` | JS 의존성 설치 전 |
| `eas-build-post-install` | Android는 의존성 설치와 필요한 Prebuild 후, iOS는 여기에 pod install까지 완료한 뒤 |
| `eas-build-on-success` | build 성공 뒤 |
| `eas-build-on-error` | build 실패 뒤 |
| `eas-build-on-complete` | 종료 시점, EAS_BUILD_STATUS로 finished/errored 판별 |
| `eas-build-on-cancel` | 취소 시점 |

플랫폼별 분기는 EAS_BUILD_PLATFORM을 확인한다. native 파일 변경을 post-install에 무조건 두면 이미 실행된 단계가 있어 원하는 영향을 못 줄 수 있다. 필요한 입력이 만들어지는 시점과 소비하는 시점을 기준으로 hook을 선택한다.

Custom build는 이 lifecycle hook을 자동 실행하지 않는다. 필요하면 custom step에서 명시적으로 호출한다. on-success에서 외부 배포를 연결하면 build 성공이 실제 변경 동작을 유발하므로 실행 권한과 실패 처리까지 별도로 관리한다.

## 출처

- [Expo Documentation, Build lifecycle hooks](https://docs.expo.dev/build-reference/npm-hooks)

## 관련 문서

- [[Expo-EAS-Build-Automation]]

- [[Expo]]
