---
tags: [aws, gamelift, multiplayer, spot, scaling]
status: done
verified_at: 2026-10-13
category: "Infrastructure - AWS"
aliases: ["Amazon GameLift Servers", "게임 세션 배치와 Spot 운영"]
---

# Amazon GameLift Servers의 세션 배치와 운영

GameLift Servers는 멀티플레이 게임 서버의 호스팅과 세션 생명주기를 관리한다. 게임 클라이언트 화면을 전송하는 [[GameLift-Streams|GameLift Streams]]와 구분한다.

## 매치 생성과 서버 배치

매치메이커는 함께 플레이할 사용자를 정하고, placement queue는 그 세션을 실행할 fleet과 위치를 고른다. FlexMatch나 자체 매치메이커를 연결할 수 있으며, queue에는 여러 fleet 또는 alias를 목적지로 둔다.

`StartGameSessionPlacement`로 요청한 뒤 배치 완료를 별도 상태로 처리한다. 생성 요청의 수락이 플레이 가능한 서버 준비 완료를 뜻하지 않는다. Queue event를 SNS나 EventBridge로 받아 상태를 저장하고 클라이언트에 알리는 구조는 반복적인 상태 조회를 줄이는 선택지다.

배치 요청량이 많으면 AWS는 이벤트 알림 사용을 권고한다. SNS를 쓰는 고부하 배치 시스템에서는 발행 한도가 더 낮은 FIFO topic의 throttling으로 알림이 유실될 수 있어 Standard topic을 권고한다. EventBridge에는 배치 이벤트가 자동 발행되며, 소비할 대상과 rule은 별도로 구성한다.

이를 적용할 때는 이벤트 전환으로 모든 API의 호출 한도 문제가 해결됐다고 판단하지 않는다. 배치 상태 조회, fleet 정보 조회와 세션 검색의 호출량을 따로 측정하고, 자주 바뀌지 않는 정보의 갱신 주기와 사용자 요청당 외부 호출 수를 조정한다.

## Anywhere와 FleetIQ의 운영 책임

2026-10-13 공식 문서 대조 기준이다. 자체 서버를 활용한다는 공통점만으로 두 방식을 같은 호스팅 모델로 취급하지 않는다.

| 방식 | 맡길 범위 | 직접 관리할 범위 |
|---|---|---|
| Anywhere fleet | 등록한 compute를 GameLift Servers와 연결해 세션 호스팅에 사용 | compute 공급과 관리, 서버 설치와 프로세스 실행, compute 등록과 해제, 인증 토큰 갱신 |
| 독립 FleetIQ | EC2 Spot 활용을 위한 배치 최적화와 일부 Auto Scaling group 속성 관리 | 서버 AMI, launch template과 확장 설정, EC2와 Auto Scaling 자원 운영 |

Anywhere는 로컬 개발 장비나 자체 서버를 등록해 반복 개발에 쓰거나 관리형 fleet과 혼합하는 선택지다. GameLift Servers가 Anywhere fleet 리소스를 만들었다고 게임 서버 소프트웨어까지 배포된 것은 아니다. GameLift Servers Agent로 등록과 토큰 관리 작업을 자동화할 수 있다.

FleetIQ에서는 game server group 생성으로 대응하는 Auto Scaling group이 만들어진다. 운영자가 자원에 직접 접근하고 설정을 바꿀 수 있지만, FleetIQ도 최적화를 위해 일부 속성을 주기적으로 갱신한다. 따라서 사용자 설정과 FleetIQ가 관리하는 설정의 경계를 확인한다.

## 평균 지연과 개별 플레이어의 상한

2026-10-09 공식 placement API와 latency policy 문서 대조 기준이다.

`PlayerLatencies`에 위치별 플레이어 지연을 밀리초로 전달하면 배치 판단에 사용할 수 있다. AWS는 실제 UDP 경로 측정에 GameLift Servers의 UDP ping beacon을 안내한다. 서버와 가까운 리전을 추정하는 것과 플레이어 장비에서 측정하는 것을 구분한다.

평균 지연이 낮은 위치라도 일부 플레이어의 지연은 클 수 있다. Queue의 player latency policy는 요청에 포함된 플레이어 중 상한을 넘는 사람이 있는 위치를 배치 후보에서 제외한다. 기다린 시간에 따라 상한을 단계적으로 완화하는 정책도 가능하다.

운영에서는 배치 성공률과 대기 시간뿐 아니라 개별 플레이어의 지연 분포를 함께 비교한다. 허용 지연을 낮추면 이용 가능한 용량이 있어도 배치가 어려워질 수 있다. 상한과 완화 시점은 게임의 플레이 품질과 대기 허용 시간을 기준으로 정한다.

## 비용보다 먼저 측정할 것

AWS의 개발 지침은 실제 클라이언트 트래픽으로 최대 플레이어 부하를 만들고 CPU, 메모리와 인스턴스당 서버 프로세스 또는 컨테이너 수를 측정하도록 안내한다. 서버 내부 봇만 실행한 결과는 네트워크 부하를 포함하지 못한다.

다음은 이를 운영에 적용한 판단 기준이다. 평균 CPU만 보고 밀도를 높이지 말고 초기화 피크, 응답 지연과 세션 실패를 함께 본다. 비용은 인스턴스 가격뿐 아니라 수용 가능한 세션 수와 예비 용량을 포함해 비교한다.

## Spot fleet의 실패 경계

2026-10-07 공식 문서 기준이다.

- GameLift Servers는 인스턴스 타입과 위치별 중단 가능성을 평가하고 부적합한 위치에 새 세션을 배치하지 않는다.
- Spot을 쓸 때는 placement queue를 구성한다. 여러 타입과 위치를 조합하고 On-Demand fleet을 백업으로 포함하는 것이 공식 권고다.
- 세션 보호는 관리형 축소 과정에서 활성 세션을 기다리도록 하는 장치다. AWS의 Spot 회수 자체를 막는 보장은 아니다.
- 중단 알림을 `onProcessTerminate()`로 처리하되, 알림보다 회수가 먼저 일어날 가능성도 대비한다.

On-Demand 목적지를 두었다는 것만으로 즉시 대체할 용량이 생기지는 않는다. 예비 용량, 확장 소요 시간과 실제 배치 실패를 함께 확인한다. 긴 세션일수록 실행 중 용량 중단의 영향도 함께 평가한다.

## 비정상 세션의 개별 종료

2026-10-13 API 기준으로 `TerminateGameSession`은 `ERROR` 상태가 아닌 진행 중 세션의 종료를 요청한다. EC2, Container와 Anywhere fleet에서 사용할 수 있고, 게임 서버에는 server SDK 5.x 이상 통합이 필요하다.

- `TRIGGER_ON_PROCESS_TERMINATE`: `OnProcessTerminate()` callback을 통해 정상 종료 절차를 시작한다. 게임 서버 코드가 `ProcessEnding()`을 호출해야 종료가 성공적으로 마무리된다.
- `FORCE_TERMINATE`: 정상 종료 절차를 거치지 않고 서버 프로세스를 즉시 중지하도록 요청한다. Anywhere fleet에서는 GameLift Servers Agent로 배포한 경우에만 사용할 수 있다.

성공 응답은 종료 시작을 뜻한다. 세션이 `TERMINATING`에서 `TERMINATED`로 전이했는지 확인한다. 운영 적용 시 강제 종료 전에 플레이어 통지와 결과 저장이 필요한지 판단하고, 정상 종료 callback이 멈춘 경우와 종료 요청 자체가 실패한 경우를 구분한다. 세션 하나의 문제에 fleet 전체 교체를 기본 복구 수단으로 삼지 않는다.

## 출처

- [Amazon GameLift Servers, Set up event notification for game session placement](https://docs.aws.amazon.com/gameliftservers/latest/developerguide/queue-notification.html)
- [Amazon GameLift Servers, Amazon GameLift Servers Anywhere fleets](https://docs.aws.amazon.com/gameliftservers/latest/developerguide/fleets-intro-anywhere.html)
- [Amazon GameLift Servers, How Amazon GameLift Servers FleetIQ works](https://docs.aws.amazon.com/gameliftservers/latest/fleetiqguide/gsg-howitworks.html)
- [Amazon GameLift Servers, TerminateGameSession](https://docs.aws.amazon.com/gameliftservers/latest/apireference/API_TerminateGameSession.html)
- [Amazon GameLift Servers, Create a player latency policy](https://docs.aws.amazon.com/gameliftservers/latest/developerguide/queues-design-latency.html)
- [Amazon GameLift Servers, StartGameSessionPlacement](https://docs.aws.amazon.com/gameliftservers/latest/apireference/API_StartGameSessionPlacement.html)
- [Development phase steps for successful launches on Amazon GameLift Servers — AWS](https://aws.amazon.com/blogs/gametech/development-phase-steps-for-successful-launches-on-amazon-gamelift-servers/)
- [Amazon GameLift Servers, Reduce game hosting costs with Spot fleets](https://docs.aws.amazon.com/gameliftservers/latest/developerguide/fleets-spot.html)

## 관련 문서

- [[GameLift-Streams|GameLift Streams]]
- [[Auto-Scaling|EC2 Auto Scaling]]
- [[compute|AWS 컴퓨팅 서비스]]
