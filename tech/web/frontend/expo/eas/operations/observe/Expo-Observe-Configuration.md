---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Observe 설정과 수집 제어"]
---

# Observe 설정과 수집 제어

## 설정은 병합하지 않는다

Observe.configure()는 이전 설정 전체를 교체한다. 옵션을 나눠 여러 번 호출하면 앞의 설정을 잃는다. navigation integration은 root mount 전에 정하고 mount 뒤 활성/비활성 전환은 오류를 낸다.

| 옵션 | 의미 |
| --- | --- |
| environment | 데이터 분류 태그. 기본 NODE_ENV, 없으면 production이다. debug 판정을 바꾸지 않는다. |
| dispatchInDebug | 기본 false. native debug 또는 __DEV__인 실행의 전송을 허용한다. |
| dispatchingEnabled | false이면 pending 기록을 버리고 전송하지 않는다. 다시 true여야 재개한다. |
| sampleRate | 0~1, 범위를 벗어나면 clamp한다. installation ID 기반의 일관된 표본이다. |
| errorHandlingEnabled | 자동 JS 오류 포착만 제어한다. 수동 reportError와 native crash까지 끄는 옵션이 아니다. |

표본 밖 installation은 전송 대기 기록을 계속 쌓지 않는다. environment=production이라도 debug 전송 조건과 sampleRate를 통과해야 한다.

## Custom endpoint와 서버 제어

app config의 extra.eas.observe.endpointUrl은 native 구성에 들어가므로 새 prebuild/build가 필요하다. OTLP HTTP JSON을 `<endpoint>/<projectId>/v1/metrics`, `<endpoint>/<projectId>/v1/logs`로 보낸다. 수신기가 표준 경로만 지원하면 project ID prefix를 처리할 adapter가 필요하다.

Dashboard에서 account/project ingestion을 끄면 서버가 새 기록을 받지 않는다. 이미 저장된 데이터는 남으며 client 자체의 계측 중단과 같은 동작으로 취급하지 않는다.

## SDK 58 network trace 경계

networkTraces는 SDK 58 이상 기능이므로 SDK 57 기준 앱에 적용했다고 가정하지 않는다. 기본은 꺼져 있고 활성화한 객체의 enabled 기본값은 true다. hosts를 생략하면 전체, 빈 배열이면 없음, 항목은 대소문자를 무시한 정확한 host 매칭이다. subdomain을 자동 포함하지 않는다.

설정은 다음 요청부터 적용되고 이전 기록은 전송될 수 있다. native에 설정을 보존하므로 다음 launch 초기에 이전 설정이 잠시 쓰일 수 있다. trace도 event 사용량에 포함된다.

URL의 basic credentials와 알려진 일부 AWS/Google 서명 필드만 제거한다. 임의 query token과 개인정보까지 모두 지워지는 것으로 가정하지 않는다. 수집할 host와 URL 구조를 먼저 제한한다.

## 출처

- [Expo Documentation, Configure EAS Observe](https://docs.expo.dev/eas/observe/configuration)

## 관련 문서

- [[Expo-Observe]]

- [[Expo]]
