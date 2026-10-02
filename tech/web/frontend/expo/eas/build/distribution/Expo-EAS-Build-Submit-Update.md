---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Build와 Submit, Update 연결"]
---

# EAS Build와 Submit, Update 연결

## 자동 제출

`eas build --auto-submit`은 성공한 build를 EAS Submit으로 전달한다. 기본적으로 build와 같은 이름의 submit profile을 찾는다. 다른 profile은 `--auto-submit-with-profile=<name>`으로 지정한다. build profile의 env로 app.config를 평가하므로 variant의 bundle ID와 제출 대상이 맞는지 확인한다.

자동 제출은 스토어의 공개 release와 같지 않다. iOS 기본 경로는 TestFlight이며 App Store 심사는 별도다. Android는 track과 releaseStatus에 따라 내부 시험, 초안, staged rollout 또는 production 공개가 달라진다. production/completed 구성을 무해한 업로드로 취급하지 않는다.

Android의 draft/completed/inProgress/halted는 각각 초안/완료 배포/단계 배포/중단 상태다. track은 internal/alpha/beta/production이다. rollout과 상태 조합은 submit schema와 해당 스토어 조건을 대조한다. EAS Submit 자체는 스토어 설명 등 metadata를 갱신하지 않는다.

## Build channel과 runtime

Build profile의 channel은 바이너리가 요청할 update 채널을 native 설정에 반영한다. preview profile은 staging channel, production은 production channel처럼 구분할 수 있다. profile 이름과 channel 이름은 반드시 같아야 하는 것은 아니다.

Native API가 바뀌면 같은 JS가 실행될 수 있는지 다시 판단해야 한다. native dependency 추가/제거와 native config 변경은 runtimeVersion 재평가 대상이다. channel이 같아도 runtime이 맞지 않는 update를 실행하면 crash가 날 수 있다.

runtimeVersion이 설정된 update는 Expo Go에서 열 수 없다. 호환되는 development build로 미리 본다. build profile의 env는 `eas update`에 자동 적용되지 않으므로 update bundling에도 동일한 의도와 값의 환경을 선택한다. 서버 비밀을 JS bundle에 넣지 않는다.

## 출처

- [Expo Documentation, Automate submissions](https://docs.expo.dev/build/automate-submissions)
- [Expo Documentation, Using EAS Update](https://docs.expo.dev/build/updates)

## 관련 문서

- [[Expo-EAS-Build-Distribution]]

- [[Expo]]
