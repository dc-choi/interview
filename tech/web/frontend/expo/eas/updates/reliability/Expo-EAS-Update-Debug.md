---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update 설정, network와 launch 진단"]
---

# EAS Update 설정, network와 launch 진단

업데이트가 보이지 않으면 build→channel→branch→platform/runtime→manifest→assets→launch 순서로 실제 값을 확인한다. EAS Build를 쓰지 않으면 Deployments에 build 정보가 없어도 EAS Update 사용 실패를 뜻하지 않는다. 직접 native config와 channel/branch를 확인한다.

## 증상과 설정 확인

| 증상 | 확인과 조치 |
| --- | --- |
| 잘못된 channel/runtime | binary 설정을 확인하고 맞게 rebuild |
| 잘못되거나 없는 branch | channel:edit으로 pointer 설정 |
| 호환 update 없음 | platform/runtime이 같은 update를 해당 branch에 publish |
| 설정은 맞지만 이전 코드 실행 | launch crash, local failed 기록과 recovery 확인 |
| Failed to load all assets | manifest 수신 후 필수 asset download 실패, 크기/network/CDN 도달성 확인 |

package.json의 expo-updates, app config runtimeVersion/updates.url/projectId/enabled를 확인한다. prebuild 결과뿐 아니라 최종 binary에 다른 build step이 변경한 값도 확인한다. bare project는 native 설정을 직접 관리하며 EAS Build가 모든 프로젝트에서 무조건 prebuild한다는 원문 문장을 일반화하지 않는다.

iOS simulator artifact를 풀어 .app의 Expo.plist에서 EXUpdatesRequestHeaders/expo-channel-name, EXUpdatesRuntimeVersion/EXUpdatesURL을 읽는다. AndroidManifest의 해당 meta-data도 비교한다. channel:list/view, branch:view와 update:view의 실제 runtime/platform을 대조한다.

## Manifest와 network 검사

```text
https://u.expo.dev/<projectId>?runtime-version=1.0.0&channel-name=production&platform=android
```

이 진단 URL 또는 실제 native request로 manifest를 확인한다. query 없는 URL은 필수 headers 누락 오류를 낼 수 있다. Proxyman/Charles 등으로 TLS certificate를 설정한 test device에서 u.expo.dev와 assets.eascdn.net 요청을 관찰한다. Expo-Runtime-Version/expo-channel-name/Expo-Platform과 asset download 결과를 확인한다. 원문은200/304만 예시하지만 paused/no-update의204와 protocol response도 구분한다.

asset 실패는 큰 payload, poor network, 특정 region의 CDN 차단/제한 등이 원인일 수 있다. local logs와 재현 조건을 확인하며 사용자의 IP 수집을 무조건 전제로 하지 않는다. dist/assetmap과 Dashboard asset 목록에서 필요한 assets를 비교한다.

## Release-like native debug

기본 debug는 Metro를 사용한다. EX_UPDATES_NATIVE_DEBUG=1로 release처럼 Updates를 활성화하고 desired channel을 native 설정에 넣는다. iOS는 이 값으로 pods를 다시 설치하고 Debug에도 JS bundling이 수행되도록 FORCE_BUNDLING을 맞춘다. Android는 debug build, EAS profile은 assembleDebug 또는 iOS Debug+simulator와 channel/env를 명시한다. dev client의 일반 preview와 구분한다.

## 실행 상태와 mitigation

Updates constants/useUpdates/readLogEntriesAsync/check/fetch의 오류로 실행 bundle과 download 단계를 확인한다. environment 누락이면 embedded는 정상이어도 OTA가 crash할 수 있으므로 --environment와 build/update 값의 일치를 확인한다. 안전한 이전 group을 republish하면 새 group으로 제공되지만 이미 받은 client와 offline 사용자 때문에 crash가 길게 남을 수 있다. error rate 감소와 채택 분포를 함께 본다. 실제 앱 실행/네트워크 검사 결과를 이 문서화 검증과 혼동하지 않는다.

## 출처

- [Expo Documentation, EAS Update debugging](https://docs.expo.dev/eas-update/debug)

## 관련 문서

- [[Expo-EAS-Update-Recovery]]
- [[Expo-EAS-Update-Trace]]
- [[Expo-EAS-Update-Standalone]]
- [[Expo-SDK-Updates-API]]
