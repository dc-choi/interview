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

## 백엔드 API와 실제 플레이 연결

2026-10-13 공식 상호작용 가이드 기준으로, 관리형 EC2와 Anywhere 구성의 백엔드는 클라이언트를 대신해 GameLift Servers API로 세션을 요청한다. 세션이 준비되면 클라이언트는 전달받은 주소와 포트로 게임 서버 프로세스에 직접 연결한다. 백엔드를 Lambda로 구성하더라도 실제 플레이 연결까지 Lambda가 유지하는 구조는 아니다.

- `ProcessReady()`는 서버 프로세스가 세션을 호스팅할 준비가 됐다는 통지다. 새 세션의 초기화 뒤에는 `ActivateGameSession()`을 호출해 플레이어 연결 준비를 알린다.
- 선택적으로 player session을 사용하면 백엔드가 만든 예약은 `RESERVED` 상태다. 서버는 연결 시 `AcceptPlayerSession()`으로 ID를 검증하며, 제한 시간 안에 수락하지 않으면 `TIMEDOUT`으로 바뀌고 슬롯이 다시 열린다.
- 연결 종료를 감지하면 `RemovePlayerSession()`으로 알려 슬롯을 반환한다. 게임 세션 전체 종료와 플레이어 한 명의 이탈을 같은 작업으로 처리하지 않는다.

운영 점검 제안: 매치 요청 성공, 세션 활성화, 플레이어 예약과 실제 접속을 각각 관측한다. 매칭 API가 정상이어도 게임 서버의 주소, 포트 접근이나 player session 검증에서 접속이 실패할 수 있다. 실제 네트워크와 부하 시험을 수행한 기록은 아니다.

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

## 컨테이너 배포와 활성 세션 보호

2026-10-14 `DeploymentConfiguration` API 대조 기준. 컨테이너 fleet의 배포는 게임 세션 보호 설정과 함께 검토한다.

- `WITH_PROTECTION`은 game session protection을 존중하며, 보호된 활성 세션을 중단시키는 작업을 그 세션이 끝날 때까지 미룬다. 이 값만으로 모든 세션이 보호된다고 가정하지 않는다.
- `IGNORE_PROTECTION`은 세션 보호 여부와 관계없이 활성 게임을 포함한 실행 중 task를 중지할 수 있다.
- `MinimumHealthyPercentage`는 배포 중 유지할 정상 task의 최소 수준이다. 플레이어 접속 성공률이나 확보된 예비 용량의 보장으로 읽지 않는다.
- `ImpairmentStrategy`는 배포 실패 시 처리 방식을 정한다. `ROLLBACK`은 마지막 성공 배포로 되돌리는 전략이고, `MAINTAIN`은 디버깅을 위해 일부 비정상 컨테이너를 유지하는 선택지다.

운영 점검 제안: 새 빌드 배포 속도와 진행 중 매치의 종료 대기를 별도로 관측한다. 보호 정책, 실제 세션 상태와 배포 결과를 함께 확인하며, 이미지를 올린 사실만으로 플레이 중단이 없었다고 판정하지 않는다.

## 호스팅 전환은 매치 경계와 지역 단위로 나눈다

실행 중 매치를 유지하면서 다음 매치의 목적지를 바꾸는 전환을 검토할 수 있다. AWS의 2025-05-12 공개 이전 사례에서는 기존 백엔드 로직과 서버 빌드를 유지하기 위해 redirect layer와 server wrapper를 만들고, 매치 종료 뒤 업그레이드한 서버로 사용자를 옮겼다. 사전 검증 후 작은 지역부터 트래픽을 전환했으며 롤백 임계값, 알림과 모의 이전을 먼저 점검했다.

이를 적용할 때는 플레이어 연결, 지연과 jitter, 대기 시간, 매치 배치 성공률을 전환 전후로 비교하고 다음 지역으로 확대할 조건을 정한다(설계 제안). 이 사례의 전환 기간과 성과는 다른 게임의 완료 기한이나 무중단 보장이 아니다. 이 절과 컨테이너 배포 절만 추가 대조했으므로 기존 본문 전체의 검증일은 유지한다.

## 출처

- [Amazon GameLift Servers, DeploymentConfiguration](https://docs.aws.amazon.com/gameliftservers/latest/apireference/API_DeploymentConfiguration.html)
- [Apex Legends Migrates to Amazon GameLift Servers in Just 10 Days — AWS](https://aws.amazon.com/blogs/gametech/apex-legends-migrates-to-amazon-gamelift-servers-in-just-10-days/)
- [Amazon GameLift Servers, Game client/server interactions with Amazon GameLift Servers](https://docs.aws.amazon.com/gameliftservers/latest/developerguide/gamelift-sdk-interactions.html)
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
