---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Push token 수명과 진단 기준"]
---

# Push token 수명과 진단 기준

## 서비스와 데이터

현재 FAQ는 Expo Push Service 전송이 무료이며 project당 초당600 한도를 설명한다. HTTPS로 Google/Apple에 전달된다. content는 전달에 필요한 memory/queue에 일시 보관하며 database에 영구 저장하지 않는다고 설명하지만 서비스 debugging 때 직원이 내용을 볼 수 있는 경우가 있다. 민감한 업무 본문 대신 식별자와 서버 조회를 사용하는 정책을 고려한다.

best effort delivery와 receipt 성공은 사용자 기기 수신/읽기 보장이 아니다. provider 정책, network, device state와 permission이 모두 영향을 준다.

## Token과 credentials

ExpoPushToken은 보통 app upgrade에서 유지된다. Android reinstall에서는 바뀔 수 있으며 iOS reinstall에서도 유지될 수 있다. app applicationId 또는 legacy experience identity가 바뀌면 달라질 수 있다. 고정 만료일은 없지만 DeviceNotRegistered를 받으면 더 이상 보내지 않고 다음 app registration을 기다린다.

APNs key나 FCM credential rotation과 token registration은 별개다. APNs key를 revoke하면 key를 공유하는 app들이 영향을 받는다. 새 key/credential과 provisioning을 확인하고 필요한 경우 native binary를 재빌드한다.

## 실패 위치 좁히기

| 현상 | 우선 확인 |
|---|---|
| 모든 remote 실패 | ticket/receipt의 details.error와 project credentials |
| local은 성공, remote 실패 | FCM/APNs/Expo send, native token과 credential |
| development만 성공 | production signing/entitlement/Firebase credential |
| Android 가끔 지연 | priority, ttl, Doze/제조사 battery settings |
| iOS aps-environment 오류 | entitlement/capability, signing profile, push setup |
| Android 흰/회색 사각 icon | white foreground + transparent background notification icon |
| iOS token 지연 | APNs registration/network 상태, 앱은 정상 진행 |

local notification 성공은 presentation/client 경로 일부를 확인할 뿐 모든 remote logic이 올바르다는 증거는 아니다. Expo Go SDK52 이전에는 Expo credentials로 테스트됐으므로 그때의 성공을 현재 production credentials proof로 사용하지 않는다.

## iOS registration 지연

token API가 network/APNs 문제로 오래 대기할 수 있다. 앱을 계속 사용할 수 있도록 push 기능만 pending/disabled 처리하고 재시도한다. capability와 안정적인 internet, APNs connectivity를 우선 확인한다. FAQ의 SIM, device restart, hotspot 해제 등 community 사례는 특정 환경의 관찰이며 보편적인 해결책이나 필수 설치 조건이 아니다. local Xcode와 TestFlight를 교체했다면 environment/token/signing 차이도 확인한다.

## 출처

- [Expo Documentation, Push notifications troubleshooting and FAQ](https://docs.expo.dev/push-notifications/faq)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
