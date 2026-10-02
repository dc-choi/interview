---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update staging에서 production까지"]
---

# EAS Update staging에서 production까지

여러 binary version이 동시에 운영되므로 channel과 runtime별로 hotfix 대상을 식별한다. 단순 release process는 channel과 같은 이름의 branch를 유지하며 staging/production/preview channel을 사용한다. channel 이름만으로 runtime을 정하지 않는다.

## Build와 staging 구성

EAS Build의 production/staging/preview profile에 channel을 지정하고 preview는 internal distribution으로 설정한다. appVersion policy를 쓰면 version(예:1.0.0)을 runtime으로 사용하며 buildNumber/versionCode는 포함하지 않는다. native 변경 시 app version을 올려 새 build를 만든다. production 제출 시 같은 runtime의 staging build도 유지하면 store testing track에서 hotfix를 검증할 수 있다.

원문의 비EAS staging 설명에서 preview를 지정한 부분은 profile 이름과 일관되지 않으므로 실제 staging channel로 native header를 맞춘다. fingerprint를 experimental이라고 한 deployment guide와 현재 runtime/API 설명의 범위 차이는 구분하며 [[Expo-EAS-Update-Runtime]]의 실제 policy 계산을 확인한다.

## 검증한 artifact의 승격

```sh
eas update --channel staging --message "Hotfix candidate" --environment production
eas update:republish --destination-channel production
```

staging과 production에 같은 environment/code signing을 사용하면 이미 검증한 bundle을 republish하여 exact artifact를 승격할 수 있다. 위 staging 명령의 production environment는 이 전략을 위한 선택이다. 서로 다른 backend/environment가 필요하면 같은 commit이어도 새 export 결과가 다를 수 있으므로 production 결과를 다시 검증한다. channel 이름과 EAS environment를 명시적으로 선택한다.

internal preview는 빠른 배포에, TestFlight/Play testing track은 store에 가까운 staging 검증에 유용하다. 새 native version에는 compatible staging build도 새로 만든다. publish는 서비스에서 사용 가능하게 만드는 것이며 모든 device에 즉시 적용되는 것은 아니다.

## 위험 제한과 대안

rollout으로 일부 사용자부터 확대하고 error/adoption을 관찰한다. rollback을 준비하며 기존 binary의 update 지원도 유지한다. channel/branch가 release process와 맞지 않으면 Expo Updates Protocol을 구현한 custom service를 사용할 수 있다. protocol-level selection은 platform/runtime이며 EAS channel/branch는 그 위의 서비스 개념이다.

## 출처

- [Expo Documentation, Deploy updates](https://docs.expo.dev/eas-update/deployment)

## 관련 문서

- [[Expo-EAS-Update-Patterns]]
- [[Expo-EAS-Update-Rollouts]]
- [[Expo-EAS-Update-Rollbacks]]
- [[Expo-EAS-Update-Download]]
