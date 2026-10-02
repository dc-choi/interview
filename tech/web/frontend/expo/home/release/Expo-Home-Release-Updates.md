---
tags: [expo, react-native, release]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo OTA 업데이트의 채널과 호환성"]
---

# Expo OTA 업데이트의 채널과 호환성

## Binary와 update

EAS Update는 JavaScript와 assets를 게시한다. native library/config/SDK가 바뀌면 기존 binary의 기능은 바뀌지 않으므로 새 build와 runtime compatibility가 필요하다. 업데이트는 installed build의 platform/runtimeVersion/channel 조건에 맞게 전달한다.

```sh
eas update:configure
# 설정을 포함한 새 native build를 만든 후
eas update --channel production --environment production
```

configuration을 완료했다는 것만으로 기존 installed 앱이 update 설정을 갖게 되지 않는다. 이미 configured build가 있는지 실제 app config, eas.json과 artifact를 확인한다. production channel은 eas.json의 build profile에 연결하고 preview와 구분한다.

## 적용 확인

기본 흐름은 처음 launch에서 download하고 다음 launch에서 적용하므로 앱을 완전히 종료/재실행 두 번 하여 확인할 수 있다. 그러나 startup/check/download 정책, network 상태와 custom reload logic에 따라 timing이 다르다. 화면이 달라졌다는 관찰과 실제 update ID/runtime를 함께 확인한다.

native incompatibility를 OTA로 우회하지 않는다. rollout, rollback과 update adoption/crash health는 EAS Update reference에서 별도로 확인한다. asset 크기는 download latency와 적용 성공률에 영향을 준다.

## 자동 배포

```yaml
name: Send updates
on:
  push:
    branches: ['main']
jobs:
  send_updates:
    type: update
    params:
      channel: production
```

`.eas/workflows/send-updates.yml`과 project integration을 구성한다. manual run은 `eas workflow:run send-updates.yml`이다. main 변경마다 native compatibility가 유지되는지 gate하고 검증되지 않은 branch를 production으로 자동 게시하지 않는다.

update로 interpretation code를 바꾸더라도 store가 허용하는 목적/기능/security 경계를 따라야 한다. 오래된 policy excerpt를 현재 전체 정책으로 사용하지 않고 최신 Apple/Google 정책을 확인한다.

## 출처

- [Expo Documentation, Send over-the-air updates](https://docs.expo.dev/deploy/send-over-the-air-updates)

- [Expo Documentation, Using environment variables](https://docs.expo.dev/eas/environment-variables/usage)

## 관련 문서

- [[Expo-Home-Development-Sharing]]
- [[Expo-Home-Review-Previews]]
- [[Expo-Home-Monitoring]]
