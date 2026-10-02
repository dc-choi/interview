---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update 배포 패턴과 운영 비용"]
---

# EAS Update 배포 패턴과 운영 비용

배포 방식은 production/test binary 수, 검증 환경, update branch의 환경/버전 기준을 함께 정한다. 검증 강도와 속도뿐 아니라 오래된 binary의 hotfix, branch/pointer bookkeeping 비용이 달라진다.

## Two-command와 persistent staging

Two-command는 production build만 만들고 dev client에서 검증한 뒤 production branch로 publish한다. 절차는 짧지만 release 전용 test 환경이 없어 자동 download/recovery와 native 동작을 검증하기 어렵다. 원문의 Expo Go 선택은 custom native library와 최신 SDK support 한계 안에서만 읽는다.

Persistent staging은 production/staging build와 영구 Git/EAS branches를 유지한다. staging merge→test track update→production merge를 통해 release pace를 development와 분리한다. 과거 version은 이전 commit으로 찾아야 하며 production merge에서 새 export하므로 staging과 정확히 같은 artifact가 아닐 수 있다. 같은 env/signing의 republish 전략으로 이를 보완할 수 있다.

## Platform-specific flow

ios-staging/ios-production/android-staging/android-production별 build/channel을 만들고 publish의 --platform도 제한한다. 플랫폼별 출시 시점을 독립적으로 제어하지만 공통 hotfix에 두 publish가 필요하며 environment와 runtime 관리가 늘어난다. channel 이름에 ios가 있다고 다른 platform export를 자동으로 막는 것으로 가정하지 않는다.

## Branch promotion flow

version-1/version-2 같은 version branch를 staging channel에서 검증한 뒤 production-rtv-1 같은 runtime별 channel로 연결한다. 같은 runtime의 새 release는 pointer만 새 branch로 이동하고 새 native runtime이 필요하면 staging/production binary와 production-rtv-2를 만든다. 기존 binary는 이전 runtime channel을 계속 사용하여 store upgrade 전까지 이전 update stream을 받는다.

이 guide의 정확한 flow는 runtime을 수동 관리하고 자동 policy를 지원하지 않는다고 설명한다. 이를 channel pointer API 자체가 appVersion/fingerprint와 작동하지 않는다는 일반 금지로 확대하지 않는다. exact artifact 승격과 과거 version 보존에 유리하지만 runtime별 channel과 branch 연결을 계속 관리해야 한다. Git branch 보존과 EAS update 보존은 별도 운영 책임이다.

## 출처

- [Expo Documentation, Alternative deployment patterns](https://docs.expo.dev/eas-update/deployment-patterns)

## 관련 문서

- [[Expo-EAS-Update-Deployment]]
- [[Expo-EAS-Update-Selection]]
- [[Expo-EAS-Update-GitHub-Previews]]
