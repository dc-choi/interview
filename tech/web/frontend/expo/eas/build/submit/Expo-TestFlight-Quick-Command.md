---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["npx testflight 통합 배포 명령"]
---

# npx testflight 통합 배포 명령

## 한 명령이 수행하는 범위

`npx testflight`는 최신 EAS CLI를 이용해 프로젝트 연결, iOS production build와 TestFlight 업로드를 이어 주는 interactive 경로다. bundle ID, 암호화 신고와 Apple 인증을 확인하고 필요한 certificate, provisioning profile과 App Store Connect API key를 생성하거나 재사용한다.

```sh
npx testflight
```

이미 연결된 프로젝트와 credential을 재사용할 수 있다. 후속 build에서는 buildNumber를 증가시키는 흐름을 제공한다. 명령 한 줄이어도 Apple 계정 로그인/2FA, 유료 developer membership과 올바른 앱 식별자가 필요하다.

## 자동화와 결과

ascAppId를 지정하면 앱 레코드 확인/생성 과정을 줄일 수 있지만 모든 인증 질문이 없어지는 것을 보장하지 않는다. CI에서는 명시적인 EAS build/submit 설정과 비대화형 credential 준비를 사용한다.

완료 후 App Store Connect에서 processing 결과와 내부 테스터 접근을 확인한다. 이 명령은 공개 App Store 심사와 출시를 자동 승인하지 않는다. 기존 artifact 제출이나 그룹 관리만 필요하면 해당 submit/TestFlight 절차를 직접 사용한다.

## 출처

- [Expo Documentation, npx testflight command](https://docs.expo.dev/build-reference/npx-testflight)

## 관련 문서

- [[Expo-EAS-Submit]]

- [[Expo]]
