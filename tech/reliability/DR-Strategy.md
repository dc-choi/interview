---
tags: [reliability, disaster-recovery, multi-region, rto, rpo, high-availability, data-center]
status: done
verified_at: 2026-11-02
category: "안정성엔지니어링(Reliability)"
aliases: ["DR Strategy", "재해 복구 전략", "Disaster Recovery", "multi-region DR", "pilot light", "warm standby"]
---

# DR 전략 (Disaster Recovery)

DR은 **정의한 재해 범위에서 서비스를 복구하는 계획**이다. AZ 장애와 리전 전체 장애는 복구 자원과 데이터의 경계가 다르다. Multi-AZ 구성만으로 리전 장애 복구까지 증명되지는 않는다. 선택은 결국 **RTO, RPO를 비용과 맞바꾸는** 문제다. 모든 서비스가 active-active일 필요는 없다.

## 4가지 전략 — 싸고 느림에서 비싸고 빠름까지

| 전략 | RTO | RPO | 비용 | 설명 |
|---|---|---|---|---|
| **Backup & Restore** | 수 시간 | 수 시간 | 최저 | 다른 리전에 백업만. 재해 시 복원, 재프로비저닝 |
| **Pilot Light** | 수십 분 | 분 | 낮음 | DB만 DR 리전에 복제(최소 가동), 나머지는 꺼둠 → 재해 시 기동 |
| **Warm Standby** | 분 | 초 | 중간 | 축소된 전체 스택이 DR에 상시 가동 → 재해 시 스케일업 |
| **Multi-site Active/Active** | ~0 | ~0 | 최고 | 여러 리전이 동시에 트래픽 처리. 가장 복잡 |

표의 시간은 전략의 상대적 차이를 이해하는 예시이며 제품 SLA나 달성 보장이 아니다. 실제 RTO/RPO는 데이터 크기, 복제 방식, 의존성, 탐지와 전환 절차로 달라진다. Active/Active도 삭제와 논리 손상이 여러 리전에 퍼지면 이전 백업으로 복구해야 하므로 RPO 0을 보장하지 않는다.

핵심 직관: **데이터를 미리 복제해 둘수록 RPO가 줄고(손실↓), 컴퓨팅을 미리 띄워 둘수록 RTO가 준다(복구↓)**. 둘 다 미리 할수록 비싸진다.

## 구성 요소

- **데이터 복제**: 크로스 리전 Read Replica 승격, **Aurora Global Database**, S3 CRR, DynamoDB Global Table. Aurora의 계획된 switchover는 정상 클러스터를 먼저 동기화해 RPO 0을 제공하지만, 비계획 failover는 장애 당시 리전 간 복제 지연만큼 손실이 생길 수 있다. DB 승격 시간과 전체 서비스 복구 시간도 구분한다. [[RDS-Aurora]], [[RDS-Migration-Scenarios]]
- **트래픽 전환**: Route 53 헬스체크 기반 DNS failover. **TTL을 낮춰둬야** 전환이 빠르다([[RDS-Zero-Downtime-Migration|엔드포인트 전환]]).
- **재프로비저닝**: 인프라를 코드로(IaC) 두어 DR 리전에 동일하게 재현. 수동 구성은 재해 때 못 따라간다.
- **런북 + 정기 DR 드릴**: 절차 문서화 + 주기적 실제 전환 훈련. 안 돌려본 DR은 작동하지 않는다.

## 전략 선택

비즈니스가 요구하는 RTO/RPO, 중단과 손실의 비용 및 운영 역량으로 정한다. 결제나 주문이라는 도메인 이름만으로 Warm Standby 이상을 필수로 정하지 않는다. 선택한 전략이 실제 거래 복구와 정합성 목표를 충족하는지 드릴로 확인한다.

## 트래픽 전환 경로도 장애를 견뎌야 한다

2026-10-13 Amazon Application Recovery Controller(ARC) 공식 문서 확인 기준. 복구 대상이 준비되어 있어도 전환에 필요한 관리 API가 응답하지 않으면 복구가 지연될 수 있다. 리소스를 생성하는 제어 계층과, 미리 구성한 경로를 전환하는 데이터 계층을 나눠 설계한다.

ARC의 routing control은 Route 53 헬스체크 상태를 바꾸는 on/off 스위치다. 이 헬스체크를 각 애플리케이션 복제본의 DNS 레코드에 미리 연결해 두면 routing control 상태 변경으로 트래픽을 전환할 수 있다. 스위치 자체가 서비스 응답 시간이나 TCP 연결을 관측하는 것은 아니므로, 장애 탐지와 전환 결정은 별도 모니터링에 근거한다.

| 단계 | 준비와 확인 |
|---|---|
| 평시 구성 | 클러스터, routing control, 헬스체크와 DNS 연결을 준비한다. 리소스 생성과 삭제는 제어 계층 작업이다. |
| 전환 실행 | 5개 리전에 걸친 클러스터 데이터 계층의 API로 상태를 조회하고 바꾼다. `ListRoutingControls`, `UpdateRoutingControlState`를 CLI나 SDK에서 호출한다. |
| 호출 경로 장애 | 클러스터 엔드포인트 5개와 routing control ARN을 사전에 확보한다. 선택한 엔드포인트가 응답하지 않으면 다른 엔드포인트로 재시도한다. 장애 중 `DescribeCluster` 호출이나 콘솔 접근에 의존하지 않도록 준비한다. |
| 클라이언트 복귀 | DNS TTL과 이미 열린 연결의 재사용 시간을 함께 확인한다. 상태 변경 성공과 모든 요청의 새 리전 도착은 다른 사건이다. |

DNS 응답이 바뀌어도 기존 연결은 재연결 전까지 장애 리전에 요청을 보낼 수 있다. 따라서 DR 드릴에서는 API 성공 시각뿐 아니라 새 연결과 재사용 연결의 요청 성공 시각도 측정하는 절차를 권한다. 이 절은 전환 경로의 설계 기준이며 특정 서비스의 복구 시간을 보장하지 않는다.

## Region switch의 계획 평가와 실제 복구를 구분한다

부분 검증(2026-10-16): ARC Region switch 공식 문서를 대조했다. Region switch는 애플리케이션의 리전 전환 절차를 plan, workflow, step과 execution block으로 구성한다. 블록을 순차 또는 병렬로 실행할 수 있으므로 트래픽 전환뿐 아니라 자원 확장 등 복구 작업의 순서를 표현할 수 있다. 앞 절의 routing control은 트래픽 전환 수단이고, Region switch는 여러 복구 작업을 조정하는 기능이다.

- **평시 평가:** plan 생성과 변경 때, 이후 정상 운영 중 30분마다 IAM 권한, 리소스 설정과 실행 용량 등을 검사한다. 경고는 콘솔, API 또는 EventBridge로 확인한다. 이 평가만으로 실제 애플리케이션 복구를 검증했다고 보지 않는다.
- **전환 실행:** 비활성화할 리전에 의존하지 않도록 리전별 데이터 계층을 제공한다. 복구 대상 리전에서 실행할 경로와 권한을 사전에 준비한다.
- **복구 시간:** plan 실행 시간에 지정한 리전별 CloudWatch 애플리케이션 상태 알람이 정상으로 돌아올 때까지의 추가 시간을 합쳐 actual recovery time을 계산한다. 알람이 어떤 업무 상태를 관측하는지가 결과의 의미를 결정한다.

설계 검토 제안: DB 전환 전에 필요한 쓰기 차단과 승인, 트래픽 전환 전에 필요한 용량 및 애플리케이션 준비 조건을 의존성으로 적는다. 독립된 작업만 병렬화하고 핵심 조회와 쓰기의 성공을 별도로 시험한다. Plan evaluation 통과를 실제 전환 시험이나 업무 정합성 검증으로 대신하지 않는다. 이번 확인은 문서 계약에 한정하며 실제 리전 장애 전환은 실행하지 않았고 기존 절의 검증일은 유지한다.

## 단일 AZ 배치 클러스터의 재생성과 작업 재개

2026-10-10 Amazon EMR 공식 문서 대조 기준, EMR on EC2의 개별 클러스터는 한 AZ에 존재한다. Instance fleets에 여러 AZ의 subnet을 후보로 지정해도 생성할 AZ의 용량 선택 폭을 넓히는 것이며, 한 클러스터의 노드를 여러 AZ에 분산하는 설정은 아니다. 다른 AZ의 클러스터로 복구하는 설계와 리전 전체 장애에 대비하는 설계를 구분한다.

Bootstrap action은 인스턴스 시작 뒤 EMR 애플리케이션 설치와 데이터 처리 전에 실행되며, 나중에 추가한 노드에도 실행된다. 이를 이용해 필요한 소프트웨어와 설정을 재현할 수 있다. 실패한 bootstrap은 인스턴스 종료를 일으키고 실패 수에 따라 클러스터 종료로 이어질 수 있으므로, 복구용 스크립트 자체도 시험 대상이다.

이 동작에서 도출한 복구 점검 제안은 다음과 같다.

1. 운영 중 수동 변경한 설정과 라이브러리를 재생성 절차에 반영한다. 새 클러스터가 생성됐다는 사실과 필요한 실행 환경이 재현됐다는 사실을 구분한다.
2. 입력, 중간 상태, 최종 결과를 나눠 보존 위치와 재계산 범위를 정한다. 클러스터 재생성만으로 중단된 작업이 이어지거나 결과 중복이 방지된다고 가정하지 않는다.
3. 클러스터 생성 시간에 bootstrap, 작업 재제출, 결과 정합성 확인까지 더해 복구 시간을 측정한다. 원래 AZ로 복귀할 때도 작업 인계와 용량을 다시 확인한다.

## 백업 복사, 복원 작업과 서비스 검증을 나눈다

부분 검증(2026-10-14): AWS Backup의 리전 간 복사, 복원 메타데이터와 restore testing validation을 대조했다. 기존 절의 검증일은 유지한다.

백업을 DR 리전에 복사해 두는 작업과 애플리케이션을 다시 서비스하는 작업은 다르다. AWS Backup의 리전 간 복사 지원은 리소스와 리전별로 확인해야 한다. 특히 RDS의 사용자 정의 option group은 그대로 전달되지 않으며, persistent option을 쓰면 대상 리전에 같은 option group을 미리 준비해야 하는 조건이 있다.

복원 자동화는 `GetRecoveryPointRestoreMetadata`로 백업의 복원 설정을 조회하고, 리소스별로 필요한 값을 검토한 뒤 `StartRestoreJob`을 호출하는 흐름으로 설계할 수 있다. DR 리전의 서브넷과 보안 그룹 등 대상 환경에 맞는 설정, IaC와 실행 경로의 가용성을 별도로 확인한다.

Restore testing의 복원 작업이 `COMPLETED`가 되면 EventBridge로 별도 검증 워크플로를 실행할 수 있다. 이 워크플로가 데이터 조회나 애플리케이션 health check를 수행하고 `PutRestoreValidationResult`로 결과를 기록한다. 복원 완료 상태 자체가 업무 동작의 검증 결과는 아니다. 기록한 validation status는 변경할 수 없으므로 검사 결과를 모은 뒤 보고한다.

운영 검증 제안: DR 리전에서 백업 접근, 리소스 복원, 애플리케이션 연결, 핵심 업무 조회와 트래픽 전환까지 시험한다. AWS Backup은 복원 시간 SLA를 제공하지 않으므로, 복원 작업 시간과 전체 서비스 복구 시간을 각각 측정해 RTO 충족 여부를 판단한다.

## 입주형 데이터센터 사례: 2022년 판교 데이터센터 화재

클라우드 리전이 아니라 여러 사업자가 입주한 SK C&C 데이터센터 건물 하나가 전력을 잃은 사례로, 카카오와 네이버는 이 시설의 입주사였다. 아래 사실은 2022-12-06 과학기술정보통신부(과기정통부) 조사 결과 발표, 2023-03-30 과기정통부 디지털서비스 안정성 강화 방안과 카카오 공식 자료(2022-12-07, 2024-01-11) 기준이다. 발화 원인은 발표 시점에 관계 기관이 정밀 조사 중이었으며 이 절에서 다루지 않는다.

- **전력 상실 경위:** 2022-10-15 15시 19분경 SK C&C 판교 데이터센터 지하 3층 배터리실에서 화재가 났다. 리튬이온 배터리와 일부 UPS의 물리적 분리가 불완전해 화재 열기 등이 UPS에 영향을 준 것으로 추정됐고, 해당 UPS가 작동을 멈추면서 일부 전원 공급이 끊겼다. 이 부분 정전과 별도로, 배터리 상단에 포설된 전력선이 화재로 손상된 상태에서 살수 진압 때 누전 등 2차 피해가 우려돼 전체 전력을 차단했다. 2차 피해가 우려되는 구역이나 차단 스위치를 단시간에 식별하지 못해 선별 차단은 하지 못했다.
- **복구 시간:** 완전 진화는 소방당국 확인 기준 당일 23시 45분이었다. 전력은 진압 뒤 순차적으로 다시 공급돼 10월 19일 5시경 복구를 마쳤다. 카카오는 장애 복구에 127시간 33분이 걸려 10월 20일 23시경 전체 서비스를 정상화했다. 발표된 두 시각으로 계산한 약 42시간은 전력 복구 완료와 카카오 전체 정상화 사이의 간격이며 원인별 지연 시간이 아니다.
- **네이버와의 대비:** 네이버는 데이터센터 간 이중화로 서비스 자체는 중단되지 않았으나, 다른 데이터센터로 전환하는 과정 등에서 상품리뷰 미노출, 일부 기사 댓글 이용 불가 등 일부 기능에 오류가 났다. 주요 서비스와 기능 대부분은 정상화에 약 20분에서 12시간이 걸렸다. 이 기능 오류 대부분은 다른 기능보다 복구 우선순위가 낮았고 복구 데이터의 무결성 확인 등이 필요해 복구에 시간이 걸렸다. 카카오의 127시간 33분은 장애 복구 전체에 걸린 시간이라 두 수치의 집계 범위는 같지 않다.
- **장애 확대와 복구 지연 원인:** 카카오는 서비스 기능을 5개 레이어로 나눠 판교와 다른 데이터센터를 Active-Standby로 이중화했으나 Standby 시스템이 제대로 동작하지 못했다. Standby 서버를 Active로 만드는 권한관리 기능인 운영 및 관리도구가 판교 안에서만 이중화되어 있어 복구가 지연됐고, 이미지와 동영상 송수신 시스템 등 데이터센터 간 이중화되지 않은 일부 구성 요소도 복구에 상당한 시간이 걸린 원인이 됐다. 장애 범위 쪽에서는 카카오톡과 다음 등 대부분 서비스의 핵심 기능이 판교에 집중되어 있어 대부분 서비스가 즉각 영향을 받았고, 여러 서비스의 구동 초기 단계부터 필요한 카카오인증 같은 핵심 기능도 판교에 집중되어 영향이 여러 서비스 전반으로 넓어졌다. 이 밖에 장애 탐지, 전파와 복구의 단계별 체계화와 자동화가 미흡했고, 일부 서버와 네트워크 오류에 대비한 훈련은 했으나 1개 데이터센터 전체가 일시에 불능이 되는 대형 재난상황에는 대비가 부족했다. 카카오가 2022-12-07 개발자 컨퍼런스에서 발표한 원인 분석(비상대책위원회 원인조사 소위원회의 제3자 관점 분석)도 데이터센터와 운영 관리 도구들의 이중화 미흡, 가용 자원 부족 등을 주요 원인으로 꼽았다.
- **2022-12-06 정부 요구:** SK C&C에는 배터리와 기타 전기설비의 물리적 공간 분리와 배터리실 전력선 재배치 또는 대안 조치, 재난 발생 구역의 개별 전력 차단과 현장에 직접 진입하지 않고 전력을 차단하는 방안, 재난 대응 시나리오와 세부 훈련 계획에 따른 모의훈련 등을 요구했다. 카카오에는 운영 및 관리도구의 데이터센터 간 Active-Active 등 매우 높은 수준의 다중화, 핵심 기능의 분산과 다중화 수준을 높이는 방안, 데이터센터 전소나 네트워크 마비 등 최악의 상황에 대비한 훈련 계획과 모의훈련 등을, 네이버에는 주 데이터센터 전소 등을 가정한 모의훈련 등을 요구했다.
- **2023-03-30 강화 방안:** 과기정통부의 디지털서비스 안정성 강화 방안에는 배터리실 안 UPS 등 다른 전기설비 설치와 전력선 포설 금지, UPS 등의 전력차단구역을 세분화해 개별 설비, 설비 그룹, 층 순으로 단계별 차단하는 방안, 설비에 접근해 직접 차단하기 어려울 때를 대비한 원격 전력 차단과 UPS를 거치지 않는 우회 공급(바이패스) 체계, 주전력과 UPS 동시 장애에 대비한 예비 전력설비 이중화, 배터리 계측 주기 단축과 화재 확산 방지 기준 등이 들어갔다. 장애 확산을 막기 위한 핵심 서비스와 기능의 물리적, 공간적 분산 권고도 포함됐다. 발표 기준으로 집적정보 통신시설 보호지침 세부기준 개정을 추진할 계획이었고, 이후 시행된 조문은 대조하지 않았다.
- **카카오의 이후 발표와 신규 데이터센터:** 카카오는 2022-12-07 데이터센터, 데이터와 서비스, 플랫폼과 운영 도구의 이중화, 모니터링 시스템 다중화와 운영관리도구 삼중화 등을 개선 사항으로 발표했다. 이 발표 시점에 안산 데이터센터는 이미 시공 중이었다. 카카오가 2024-01-11 소개한 카카오 데이터센터 안산(2024년 1월 가동)은 UPS실과 배터리실을 방화 격벽으로 분리해 배터리실 화재가 나머지 시설 작동에 영향을 주지 않도록 설계했고, EPS, UPS와 배터리를 하나로 묶은 섹터를 4개 두었다. 이 설계가 판교 화재 뒤 바뀐 것인지는 확인한 두 카카오 자료에 명시되어 있지 않다. 2024-01-11 자료는 배터리실 화재 때 가스 진화가 실패하면 화재 발생 구간을 차단하고 냉각수를 채운다고 적지만, 그 구간이 4개 섹터 중 하나인지와 나머지 섹터로 전력 공급을 이어 가는지는 적지 않았다.

다음은 위 사실에서 도출한 적용 제안이다.

1. 직접 운영하거나 입주한 데이터센터라면 재해 범위를 건물, 전력 계통과 방화 구획 단위로 정의한다. 진압을 위한 전체 전력 차단처럼 대응 조치가 장애 범위를 넓힐 수 있으므로 시설의 전력 차단 단위와 절차를 미리 확인한다. 클라우드 사용자는 AZ 아래의 건물과 전력 계통을 직접 정하지 않으므로 AZ와 리전 경계를 기준으로 삼는다.
2. 서비스 이중화와 별도로 Standby를 Active로 올리는 권한, 운영 도구와 모니터링이 어느 장애 범위에 있는지 의존성 목록에 적는다. 승격 도구를 장애 범위 밖에 두는 일은 앞의 트래픽 전환 경로 절과 같은 전환 경로의 가용성 문제이고, 승격 없이도 남은 쪽이 기존 자원과 상태로 처리를 이어 가게 하는 일은 [[N-1-Capacity-Headroom|정적 안정성]] 문제다.
3. 전력 복구, 시스템 기동, 데이터 무결성 확인과 서비스 정상화 시각을 나눠 기록하고, 주 데이터센터 전체 손실을 가정한 드릴로 RTO를 측정한다.

## 흔한 함정

- **DR을 한 번도 드릴 안 함** — 진짜 재해 때 처음 돌려보다 실패
- **리전 간 설정 드리프트** — DR 리전 구성이 운영과 어긋나 전환 실패
- **상태 데이터 미복제** — 컴퓨팅만 이중화하고 DB/캐시/세션을 안 옮김
- **DNS TTL이 높음** — 전환해도 옛 리전으로 트래픽이 한참 감
- **리전별 의존성 누락** — KMS 키, Secrets, ACM 인증서는 리전마다 따로 필요
- **복제본을 백업으로 오해** — 잘못된 쓰기나 삭제도 복제되므로 이전 시점의 독립 백업과 복원 경로를 유지한다.
- **전환 후 쓰기 충돌** — 옛 리전의 쓰기를 차단하고 새 writer, DNS 캐시와 연결 풀을 확인한다. 복귀(failback) 때도 변경 데이터를 정합하게 합치는 절차를 별도로 검증한다.
- **복구 리전의 용량 부족** — 서비스 quota, 실제 확보 가능한 용량과 스케일업 의존성을 사전에 확인한다.
- **전환 도구가 같은 장애 범위에 있음** — Standby를 Active로 올리는 권한관리 기능(운영 및 관리도구)이 주 데이터센터 안에서만 이중화되어 있으면 서비스를 이중화해도 전환이 늦어질 수 있다. 위 판교 사례에서 카카오 복구 지연의 핵심 원인으로 지목됐다.

## 면접 체크포인트

- AZ 장애 복구와 리전 장애 복구의 범위 차이
- 4가지 전략과 RTO/RPO/비용 트레이드오프, 데이터 복제와 컴퓨팅 상시화가 각 복구 목표에 미치는 영향
- Aurora Global Database의 RPO/RTO와 크로스 리전 복제본 승격
- Route 53 헬스체크 failover와 TTL의 역할
- DR 드릴과 설정 드리프트, 리전별 KMS/Secrets 의존성
- 데이터센터 전체 손실(화재와 전력 차단)에서 전환 권한과 운영 도구의 위치가 복구 시간을, 핵심 기능의 집중이 장애 범위를 키우는 경로

## 출처

2026-11-02에는 판교 사례 절의 경위, 복구 시간, 네이버와의 대비, 장애 확대와 복구 지연 원인, 정부 요구와 강화 방안, 카카오의 이후 발표와 안산 데이터센터 설계, 흔한 함정과 면접 체크포인트에 더한 판교 관련 문장만 과기정통부 발표(대한민국 정책브리핑 게재)와 카카오 공식 자료에 대조했다. 발화 원인의 조사 결과, 이후 시행된 보호지침 조문과 각 사업자 대책의 이행 여부는 확인하지 않았고 AWS 관련 절은 다시 대조하지 않았다.

2026-10-13에는 ARC routing control의 데이터 계층, 엔드포인트 재시도와 기존 연결의 전환 지연을 대조했다. 앞선 절들의 검증 기준일은 유지하며 실제 AWS 환경에서 장애 전환을 실행한 결과는 아니다.

2026-10-10에는 EMR의 AZ 선택과 bootstrap 실행 계약을 추가 대조하고, 기존 전략 비교와 Aurora switchover/failover 설명이 공식 문서와 상충하지 않음을 확인했다. 작업 재개 점검은 이 계약에서 도출한 설계 제안이며 실제 복구 시간을 측정한 결과가 아니다.

2026-10-02에는 전략별 시간 예시의 한계, 백업과 복제의 구분 및 Aurora switchover/failover 계약을 대조했다. 특정 서비스가 표의 목표를 달성했다는 운영 검증은 아니다.

- [정부, SK C&C, 카카오 등에 한달내 원인 개선, 향후 계획 보고 요구 — 대한민국 정책브리핑, 과학기술정보통신부](https://www.korea.kr/news/policyNewsView.do?newsId=148909123)
- [디지털서비스 장애 원인 조사결과 발표 등 — 대한민국 정책브리핑, 과학기술정보통신부](https://www.korea.kr/briefing/policyBriefingView.do?newsId=156540855)
- [디지털서비스로 전주기적 재난관리 확대…상시 위기관리 강화 — 대한민국 정책브리핑, 과학기술정보통신부](https://www.korea.kr/news/policyNewsView.do?newsId=148913326)
- [카카오, 개발자 컨퍼런스 'if (kakao) dev 2022'에서 서비스 장애 재발방지 대책 발표 — 카카오](https://www.kakaocorp.com/page/detail/9843)
- [카카오 데이터센터 (2) 재해 대비책 — 카카오](https://www.kakaocorp.com/page/detail/10860)
- [YouTube, 동국시스템즈 IT 채널, 그날 카톡은, 불에 타서 멈춘 게 아닙니다](https://www.youtube.com/watch?v=rQVgQyZIHRQ) — 2026-10-23 공개(전사 메타데이터 기준) 쇼츠로 판교 사례 절의 계기다. 경위와 수치는 위 정부 발표와 카카오 자료로 대조했다. 화재가 난 섹터만 막고 나머지 섹터를 계속 가동한다는 설명은 2024-01-11 카카오 자료에 적혀 있지 않고, 장애 원인을 한 곳 집중 하나로 돌리는 해석은 정부 조사의 원인 목록보다 좁아 채택하지 않았다.
- [AWS — Region switch in ARC](https://docs.aws.amazon.com/r53recovery/latest/dg/region-switch.html)
- [AWS — About Region switch](https://docs.aws.amazon.com/r53recovery/latest/dg/region-switch-plans.html)
- [AWS — Creating backup copies across AWS Regions](https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html)
- [AWS — Restore a backup by resource type](https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-a-backup.html)
- [AWS — Restore testing validation](https://docs.aws.amazon.com/aws-backup/latest/devguide/restore-testing-validation.html)
- [AWS — Data and control planes for routing control](https://docs.aws.amazon.com/r53recovery/latest/dg/data-and-control-planes.html)
- [AWS — About routing control](https://docs.aws.amazon.com/r53recovery/latest/dg/routing-control.about.html)
- [AWS — Best practices for routing control in ARC](https://docs.aws.amazon.com/r53recovery/latest/dg/route53-arc-best-practices.regional.html)
- [AWS — Availability Zone flexibility for an Amazon EMR cluster](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-flexibility.html)
- [AWS — Create bootstrap actions to install additional software with an Amazon EMR cluster](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-bootstrap.html)
- [Amazon Aurora — Using switchover or failover in Amazon Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html)
- [AWS — Disaster recovery options in the cloud (4 strategies)](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)
- [AWS — Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html)

## 관련 문서

- [[Backup-Restore|백업과 복원 (RTO/RPO, PITR)]]
- [[RDS-Aurora|RDS / Aurora (Global Database, Multi-AZ)]]
- [[RDS-Migration-Scenarios|RDS 마이그레이션 (크로스 리전 복제본)]]
- [[RDS-Zero-Downtime-Migration|무중단 컷오버 (엔드포인트 전환, TTL)]]
- [[Route53|Route 53 (헬스체크 DNS failover)]]
- [[N-1-Capacity-Headroom|N-1 가용량 헤드룸 (정적 안정성, 복구 경로의 제어 기능 의존)]]
