---
tags: [network, realtime, game, authority, prediction, simulation]
status: done
verified_at: 2026-11-02
category: "Web - 실시간"
aliases: ["게임 상태 권위와 예측", "Game State Authority and Prediction"]
---

# 게임 상태의 판정 권한과 클라이언트 예측

온라인 게임의 상태 동기화는 최종 결과를 누가 결정하는지, 어떤 정보를 전송하는지, 응답을 기다리는 동안 무엇을 보여 주는지로 나누어 설계한다. 서버 판정과 클라이언트 예측은 함께 사용할 수 있으며, 결정적 시뮬레이션은 같은 명령에서 같은 상태를 재현하기 위한 별도 조건이다.

## 서버가 판정하고 클라이언트가 먼저 보여 준다

서버 권위 모델에서는 클라이언트가 이동과 공격 같은 입력을 보내고 서버가 최종 상태를 계산한다. 클라이언트가 주장한 위치나 보상 획득 결과를 그대로 정본으로 받아들이지 않는다. 이 경계는 클라이언트의 상태 조작을 제한하지만 모든 종류의 부정행위를 막는다는 보장은 아니다. [Roblox의 서버 권위 모델](https://create.roblox.com/docs/projects/server-authority)

매번 서버의 응답을 받은 뒤 움직임을 표시하면 왕복 지연이 입력 반응에 드러난다. 클라이언트 예측은 자신의 입력을 로컬 시뮬레이션에도 적용해 결과를 먼저 표시한다. 이는 다른 플레이어의 미래 입력을 알아내는 예측이 아니다.

1. 클라이언트가 입력을 서버에 보내면서 로컬 상태를 갱신한다.
2. 서버가 계산한 상태가 도착하면 해당 시점의 예측과 비교한다.
3. 불일치하면 서버 상태를 기준으로 되돌리고, 이후 입력을 다시 시뮬레이션한다.

예를 들어 로컬에서는 전진했지만 같은 시점에 서버가 기절 효과를 적용했다면 예측이 틀릴 수 있다. 서버의 판정과 맞추는 보정은 정상적인 실행 과정이다. 이전 시점부터 여러 틱을 다시 계산하므로 재시뮬레이션의 CPU 비용도 고려한다. Unity Netcode for Entities 1.3.0-pre.4 문서는 불일치가 없어도 서버 스냅샷을 받을 때 재시뮬레이션한다고 설명한다. 따라서 보정 오류 횟수만으로 이 비용을 추정하지 않는다. [Unity의 예측 실행 설명](https://docs.unity.cn/Packages/com.unity.netcode%401.3/manual/prediction-high-level-explanation.html)

## 상태 대신 명령을 공유하는 결정적 시뮬레이션

유닛이 많은 게임에서 모든 유닛의 위치와 상태를 계속 보내면 전송량이 커진다. 각 참여자가 같은 초기 상태에서 같은 명령을 같은 시뮬레이션 순서로 실행한다면 명령을 공유하는 방식으로 전송량을 줄일 수 있다. Age of Empires 개발 사례는 명령 실행을 뒤의 통신 턴으로 예약해 전달 시간을 확보했다. 이 통신 턴은 화면 렌더링 프레임과 구분했다.

같은 난수 seed만으로 결정성이 완성되지는 않는다. 난수 소비와 코드 실행 경로도 맞아야 하며 로컬 설정이나 기기별 실행 조건이 시뮬레이션 분기를 바꾸지 않아야 한다. 그래픽이나 효과음의 무관한 난수 사용이 게임 상태 계산에 영향을 주는지도 확인한다. 이 설명은 해당 개발 사례의 설계 교훈이며 모든 RTS나 현재 엔진이 같은 구조를 쓴다는 뜻은 아니다. [개발자의 네트워크 설계 기록](https://www.gamedeveloper.com/programming/1500-archers-on-a-28-8-network-programming-in-age-of-empires-and-beyond)

## 선택할 때 확인할 조건

다음은 위 원리에서 도출한 설계 점검 제안이다.

| 질문 | 확인할 경계 |
|---|---|
| 누가 결과를 확정하는가 | 클라이언트 입력과 서버 판정, 보상이나 상태의 저장 권한 |
| 지연을 어디서 감당하는가 | 서버 응답 대기, 로컬 예측, 보정 때의 화면 변화 |
| 무엇을 전송하는가 | 상태 전송량과 명령 전송량, 필요한 동기화 주기 |
| 같은 입력이 같은 결과를 만드는가 | 초기 상태, 명령 순서, 난수 소비와 실행 경로 |
| 장애를 어떻게 관측하는가 | 예측 불일치, 재시뮬레이션 비용, 명령 지연과 상태 불일치 |

문서의 설계 원리를 대조했으며 실제 게임, 엔진 설정이나 네트워크 장애 실험은 수행하지 않았다. 로컬 예측 결과를 영속 데이터로 확정하는 시점과 재접속 후 상태 복구는 별도 계약으로 확인한다.

## 출처

- [Roblox, Server authority model](https://create.roblox.com/docs/projects/server-authority)
- [Unity, Netcode for Entities 1.3.0-pre.4, Client prediction](https://docs.unity.cn/Packages/com.unity.netcode%401.3/manual/prediction-high-level-explanation.html)
- [1500 Archers on a 28.8: Network Programming in Age of Empires and Beyond — Game Developer, Paul Bettner](https://www.gamedeveloper.com/programming/1500-archers-on-a-28-8-network-programming-in-age-of-empires-and-beyond)

## 관련 문서

- [[실시간(Realtime)|실시간 통신]]
- [[Realtime-Sync-Recovery|실시간 동기화와 재연결 복구]]
