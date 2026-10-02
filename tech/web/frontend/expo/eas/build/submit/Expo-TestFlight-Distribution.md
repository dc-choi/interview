---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["TestFlight 내부와 외부 테스트"]
---

# TestFlight 내부와 외부 테스트

## 테스트 대상 구분

TestFlight는 App Store용으로 서명한 build를 사용한다. EAS `distribution: internal`의 ad hoc 배포와 다르다. App Store Connect processing을 마친 build에 그룹과 테스터를 연결한다.

2026-10-01 Expo 문서 기준 내부 테스터는 App Store Connect 팀원 최대 100명, 외부 테스터는 최대 10,000명이다. Build는 업로드 뒤 90일간 테스트할 수 있고 테스터당 최대 30기기를 안내한다. 서비스 한도와 역할 권한은 운영 시 Apple의 현재 정책도 확인한다.

## 내부 그룹

App Store Connect에서 내부 그룹을 만들고 허용된 팀원을 추가한다. 내부 테스트는 공개 사용자 초대 경로가 아니다. 이미 업로드한 build를 그룹에 추가할 수 있으므로 그룹 변경만으로 새 native build를 만들 필요는 없다.

```sh
eas submit --platform ios --groups "QA Team" --what-to-test "로그인과 결제 복원 확인"
```

CLI의 groups 옵션은 내부 그룹 대상이다. 각 사용자의 App Store Connect 역할과 앱 접근 권한을 확인한다. 처리 시간이나 이메일 도착을 고정된 시간으로 보장하지 않는다.

## 외부 그룹과 Beta Review

내부 그룹을 준비한 뒤 외부 그룹과 beta 정보를 설정한다. 테스트 설명, 피드백 연락 수단, 필요한 심사용 계정과 What to Test를 제공하고 Beta App Review 조건을 충족한다. 외부 테스트의 앱 버전 첫 build는 심사가 필요할 수 있다.

승인 뒤 이메일/CSV 또는 public link로 초대할 수 있다. Public link는 기기/OS 조건과 허용 인원을 설정할 수 있다. 링크 공개 범위와 테스트 데이터의 노출 범위를 함께 판단한다.

EAS Workflow의 `type: testflight`는 build_id, internal_groups, external_groups, changelog를 받는다. external_groups가 있으면 submit_beta_review의 기본값이 true다. 먼저 TestFlight 정보를 구성하고 원치 않는 심사 제출이 일어나지 않도록 job 설정을 확인한다.

## 암호화와 종료

usesNonExemptEncryption=false는 앱과 포함된 라이브러리의 실제 암호화 사용이 면제 조건에 맞을 때만 설정한다. Missing Compliance 표시를 없애기 위한 임의의 값이 아니다.

공개 App Store 출시와 TestFlight 배포는 분리된다. 테스트를 끝내려면 해당 build를 만료시킨다. 공개 출시만으로 기존 TestFlight 테스트가 즉시 끝나는 것으로 가정하지 않는다.

## 출처

- [Expo Documentation, Distribute an iOS app with TestFlight](https://docs.expo.dev/submit/testflight)

## 관련 문서

- [[Expo-EAS-Submit]]

- [[Expo]]
