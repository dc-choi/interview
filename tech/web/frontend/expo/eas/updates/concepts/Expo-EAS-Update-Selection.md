---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update의 build, channel과 branch selection"]
---

# EAS Update의 build, channel과 branch selection

앱 binary는 고정 native layer와 교체 가능한 update layer로 나뉜다. build에는 platform, runtimeVersion, channel이 들어간다. update는 platform/runtimeVersion을 대상으로 하며 EAS branch는 시간 순서의 update 목록이다. Git branch와 이름을 맞출 수 있지만 같은 객체는 아니다.

## 선택 계약과 pointer

build와 update의 platform/runtimeVersion은 정확히 일치해야 한다. channel은 branch를 가리키며 기본적으로 같은 이름의 branch와 연결된다. branch의 단순 최신 항목이 아니라 해당 build와 호환하는 최신 update를 선택한다. channel→branch pointer 변경으로 기존 build의 배포 대상을 바꿀 수 있다.

```sh
eas channel:edit production --branch version-2.0
eas channel:edit staging --branch version-3.0
```

version-2.0을 staging에서 검증한 후 production을 연결하고 staging은 다음 branch로 이동하는 전략이다. 기존 build channel을 바꾸는 native rebuild와 server pointer 변경을 구분한다.

## Manifest, assets와 launch

native expo-updates가 manifest를 받아 parse/validate하고 필요한 JS/images/fonts 중 device에 없는 assets만 다운로드한다. manifest만 받은 상태는 실행 준비 완료가 아니다. 모든 필수 asset과 manifest가 fallbackToCacheTimeout 전에 준비되면 해당 launch에 실행할 수 있다. timeout 뒤라면 기존 cache/embedded를 실행하고 background download를 완료해 다음 launch에 적용한다.

현재 SDK 기본 timeout은0이므로 시작마다 network 완료를 기다린다는 보장으로 설명하지 않는다. 새 update가 없으면 가장 최근 다운로드한 호환 update, 없으면 binary embedded update를 사용한다. cache와 선택 정책, failed update 기록도 실행에 영향을 준다.

## 출처

- [Expo Documentation, How EAS Update works](https://docs.expo.dev/eas-update/how-it-works)

## 관련 문서

- [[Expo-EAS-Update-Channels]]
- [[Expo-EAS-Update-Download]]
- [[Expo-EAS-Update-Runtime]]
