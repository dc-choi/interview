---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update preview 환경 선택"]
---

# EAS Update preview 환경 선택

production 전에 production과 가까운 환경에서 검증한다. development build는 developer가 PR/branch별 compatible update를 Extensions, Dashboard/Orbit로 열기 쉽다. expo-updates가 포함된 development build와 Expo account login이 필요하다.

## Development launcher와 group URL

Extensions→Login 후 프로젝트의 최신 updates가 표시된다. Open으로 실행하고 branch 이름을 눌러 전체 목록을 본다. Dashboard update details→Preview는 QR 또는 Open with Orbit를 제공한다. manually constructed URL은 아래 형식이다.

```text
<app-scheme>://expo-development-client/?url=https://u.expo.dev/<projectId>/group/<groupId>
```

원문은 scheme 부분을 slug로 설명하지만 실제 native build에 등록된 scheme을 사용한다. groupId는 platform별 update ID와 다르며 이 URL은 특정 group preview다. 원문의 끝 설명처럼 channel 자체를 변경하는 기능으로 해석하지 않는다. Launcher의 Enter URL Manually 또는 QR로 연다.

## Preview/production build

비개발자는 internal distribution/TestFlight/Play testing track의 preview build와 channel을 사용한다. runtime이 자주 바뀌지 않으면 신뢰하는 tester에게 channel surfing UI를 제공할 수 있다. production 일부 사용자 preview는 문제 update에서 override를 해제할 UI에 접근하지 못할 위험이 있어 보고/복구할 수 있는 사람으로 제한한다. persistent staging build를 유지하는 전략도 있다.

development launcher가 update를 실행한 결과는 release의 자동 check/download/recovery가 같은 방식으로 동작한다는 증거가 아니다. 새 native dependency에는 launcher가 아니라 새 compatible build가 필요하다.

## 출처

- [Expo Documentation, Preview updates](https://docs.expo.dev/eas-update/preview)
- [Expo Documentation, Preview updates in development builds](https://docs.expo.dev/eas-update/expo-dev-client)

## 관련 문서

- [[Expo-EAS-Update-Channel-Surfing]]
- [[Expo-EAS-Update-Deployment]]
- [[Expo-EAS-Update-GitHub-Previews]]
