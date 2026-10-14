---
tags: [performance, scalability, capacity-planning, load-test, spike, case-study]
status: done
category: "성능&확장성(Performance&Scalability)"
aliases: ["Capacity Planning", "캐퍼시티 플래닝", "트래픽 스파이크 대비"]
---

# Capacity Planning — 예측 가능한 트래픽 스파이크 대비

캐퍼시티 플래닝은 예상 부하에 대해 시스템의 가용량을 계측하고, 부족분을 미리 확보하는 활동이다. 신년 자정, 대형 이벤트, 방송 노출처럼 시점이 정해진 스파이크는 갑작스러운 장애와 달리 준비 기간이 있다 — 길게는 6개월 전부터 사이클을 돌린다. 이 스파이크는 램프업 없이 한순간에 수 배로 뛰는 스텝(step) 형태로 온다.

## 대비 사이클

1. **계측** — 현재 시스템의 실제 가용량을 부하 테스트(BMT)로 다시 잰다.
2. **계획** — 과거 트래픽 패턴 기록으로 올해 예상치와 부족분을 산정한다.
3. **개선** — 부족한 컴포넌트를 확장하거나 최적화한다.
4. **검증** — 개선분을 실제 스파이크 형태로 재테스트한다.
5. **회고** — 결과와 특이사항을 기록해 다음 사이클의 입력으로 만든다.

## 계측 — 매번 다시 잰다

작년에 버텼다는 사실은 올해의 근거가 못 된다. 데일리 릴리스로 코드가 끊임없이 바뀌므로 가용량도 계속 변하기 때문이다. 매 사이클 재계측이 필수다.

- 대시보드를 먼저 준비하고, 실 트래픽 라우팅을 단계적으로 늘리며 모니터링한다.
- 이상 징후가 보이면 즉시 라우팅 트래픽을 줄인다. 재시도 메커니즘이 설계에 있으면 테스트 중에도 요청 유실을 막을 수 있다.
- 부하 생성기와 행사 전 임시 시험 환경처럼 중단돼도 다시 돌리면 되는 자원은 Spot 인스턴스로 비용을 줄일 수 있다. Spot은 실행 시점이 유연하고 중단을 견디는 작업에 맞는다. 중지나 종료로 회수되기 2분 전에 통지되지만 최선 노력 방식이며, 최대 절전 모드로 회수되면 2분 전 경고가 없다(2026-10-14 EC2 문서 대조). 운영 제안: 생성기가 중단된 구간의 측정값은 버리고 다시 잰다.

### 램프업의 함정 — 스파이크는 스텝으로 온다

| 시나리오 | 형태 | 드러나는 실패 모드 |
|---|---|---|
| 램프업(점진 증가) | 평상시 → 목표 TPS까지 서서히 | 처리량 한계, 리소스 포화 |
| 스텝(순간 급증) | 평상시 → 한 번에 수 배 | 순간 커넥션 폭증 → 힙 메모리 급증 → Full GC → 응답 지연 → 큐 적체 → 유실 |

램프업만 테스트하면 목표 TPS를 버티는 것은 확인해도, 순간 급증이 유발하는 커넥션 폭증과 Full GC는 발견하지 못한다. 두 시나리오를 모두 테스트해야 하며, 예측 가능한 스파이크 대비에서는 스텝 시나리오가 본게임이다.

## 계획 — 과거 패턴이 자산이다

- 사이클마다 트래픽 패턴, 특이사항, 개선 필요 사항을 기록으로 남기고, 모든 팀과 컴포넌트의 내용을 통합 문서화한다. 이 기록이 다음 해 예상치 산정의 근거가 된다.
- 패턴은 세그먼트별로 다르다. 예를 들어 국가별로 텍스트 메시지 위주인 곳과 이미지, 동영상 위주인 곳은 부하의 성격 자체가 다르므로 컴포넌트별 대비도 달라진다.
- 예상치는 운영팀 혼자 정하지 않는다. AWS Games Industry Lens GAMEOPS03-BP05는 과거 동시 접속, 참여 지표와 판매 데이터를 근거로 판매, 마케팅 담당자와 함께 다가올 행사의 수요를 추정하라고 권한다(2026-10-14 대조).
- 커머스 행사라면 기간과 예상 방문자 수에 더해 유입 경로(앱 푸시, 광고, SNS)와 그 실행 시각을 받는다. 행사 시작, 매일 같은 시각의 상품 공개와 푸시 발송 직후에 요청이 계단처럼 몰릴 수 있으므로 이 시각들을 스텝 시나리오의 입력으로 삼는다(아래 커머스 사례).

## 가용량 판단과 확보 — Redis 예시

| 지표 | 의미 | 부족 시 대응 |
|---|---|---|
| IOPS | 초당 I/O 요청 횟수 | 클러스터 확장 또는 애플리케이션 최적화 |
| UsedMemory | 저장 데이터 크기 | 메모리 증설 |

가용량이 부족할 때의 대응은 크게 세 가지다.

1. **클러스터 분리** — 성격이 다른 데이터를 역할별로 별도 클러스터로 나눈다. 부하 분산과 장애 격리를 동시에 얻는다.
2. **애플리케이션 최적화** — 요청 자체를 줄인다. 행동 패턴 기반 악성 요청 필터링이 대표적 사례로, 비정상 스파이크를 걷어내면 실제 패턴이 보인다.
3. **노드 추가, 증설** — 가장 단순하지만 비용이 따른다. [[Traffic-Scaling-Playbook|증설 전 최적화 우선 원칙]]과 같은 축.

정책 정비도 확보 수단이다. TTL 미지정 데이터에 TTL을 부여하고 eviction 정책을 volatile-ttl로 바꾸면 메모리 한도 도달 시의 동작이 예측 가능해진다 — [[Redis-Memory-Eviction|Redis Eviction Policy]].

## 이벤트 시작 전에 확장 준비를 끝낸다

시각이 정해진 행사는 부하가 오른 뒤 확장을 시작하면 늦을 수 있다. 메트릭 전달과 확장 판단, 새 자원의 준비에 시간이 걸리기 때문이다. 예약 확장은 예측 가능한 수요에 맞춰 자원을 확보하는 방법이다. 이 구분은 2026-10-10 AWS Well-Architected의 REL07-BP03으로 대조했다.

다음은 이 원칙을 주문 서비스에 적용한 점검 예시다.

- 행사 시작 시각과 확장 시작 시각을 구분하고, 부하 테스트로 확인한 준비 시간을 확보한다.
- API 서버뿐 아니라 연결된 DB와 작업 처리기의 가용량을 함께 확인한다. 서버 수 증가가 DB 커넥션 수 증가로 이어지는지도 시험한다.
- 연동된 시스템도 시험 범위에 넣는다. 전용선으로 이어진 기존 데이터센터의 재고, 회원 시스템처럼 서비스 밖의 구성 요소가 먼저 한계에 닿을 수 있다. GAMEOPS03-BP05는 상하위 계층의 장애를 흉내 내는 부하 테스트로 단일 장애 지점을 찾으라고 권한다.
- 행사 진입 페이지는 대부분의 사용자가 처음 도달하는 곳이라 부하가 먼저 몰린다. CDN 캐시로 응답할 수 있는 정적 구성 비중을 높이고 상품평이나 재고처럼 DB를 읽는 영역은 분리한다. CloudFront 문서 기준으로 캐시에서 바로 응답하는 비율을 높이면 오리진으로 가는 요청이 줄어든다.
- 확장에 중단이 따르는 계층은 행사 전에 크기를 정한다. Amazon RDS는 DB 인스턴스 클래스를 바꾸는 동안 중단이 생기므로(Multi-AZ 구성으로 줄일 수 있다) 행사 중 인스턴스 클래스 변경을 전제로 계획하지 않는다(2026-10-14 RDS 문서 대조).
- 로드밸런서도 트래픽에 따라 자동으로 확장하지만, ALB는 예정된 급증에 대비해 LCU 예약으로 최소 용량을 미리 확보할 수 있다 — [[ELB#LCU 예약으로 급증 전에 최소 용량 확보|ELB LCU 예약]]. NLB도 LCU 예약을 지원하지만 2026-10-14 문서 기준 지원 리전이 제한되고(서울 리전은 목록에 없다) AZ당 최소 2,750 LCU를 요청해야 한다.
- 목표 자원 수에 도달한 것과 실제 요청을 처리할 준비가 된 것을 구분한다. 준비가 끝난 상태에서 스텝 부하와 오류율을 확인한다.
- 최대 확장 한도와 행사 종료 뒤 축소 조건을 정한다. 모든 구성 요소가 같은 방식의 자동 확장을 지원한다고 가정하지 않는다.

### 할당량, 실제 용량과 준비 완료를 따로 확인한다

2026-10-14 AWS Games Industry Lens와 EC2 시작 오류 문서로 대조한 구분이다. 부하 테스트로 필요한 대수를 계산했어도 그 대수를 확보할 수 있는지는 별도 문제다.

- **계정 할당량:** `InstanceLimitExceeded`는 리전의 인스턴스 실행 한도에 도달한 경우다. 이벤트 전에 사용하는 서비스의 quota와 예상 사용량을 확인하고 필요한 증설을 요청한다.
- **실제 가용 용량:** `InsufficientInstanceCapacity`는 현재 요청을 충족할 On-Demand 용량이 부족한 경우다. 할당량 증설만으로 해소되지 않는다. 다른 AZ나 인스턴스 타입, 더 작은 요청 단위를 검토하되 성공을 보장하지는 않는다.
- **서비스 준비 완료:** 목표 대수 확보 뒤에도 실제 사용자 흐름을 실행해 각 계층과 구성 요소가 부하를 처리하는지 확인한다. 관리형 서비스 사용 자체를 목표 부하 검증의 대체물로 보지 않는다.

운영 적용 제안: 대체 인스턴스 타입을 허용할 때는 CPU 아키텍처와 메모리, 네트워크 요구를 먼저 확인하고 해당 구성으로 다시 계측한다. 총 대수뿐 아니라 AZ별 배치와 하위 저장소의 부하도 확인한다. 시작 오류 대응의 상세는 [[EC2-Operations#시작 실패: 계정 한도와 가용 용량을 구분한다|EC2 용량 부족 대응]]을 따른다.

### 요청 처리 능력과 자원 확장 능력을 나눠 검증한다

2026-10-14 AWS Well-Architected REL11-BP04와 REL11-BP05 대조 기준이다. 데이터 플레인은 일상적인 서비스 트래픽을 처리하고, 컨트롤 플레인은 자원의 생성과 변경 같은 관리 작업을 수행한다. 이미 준비된 서버의 처리량과 새로운 서버를 준비하는 능력은 같은 지표가 아니다.

다음은 이 구분을 부하 테스트에 적용한 검증 제안이다.

1. 준비된 자원으로 사용자 요청을 처리하는 시험과, 자원을 늘려 준비 완료까지 도달하는 시험을 분리한다. 두 시험의 오류율과 소요 시간을 각각 기록한다.
2. 자원 생성이나 배포가 지연될 때 기존 요청 처리에 미치는 영향을 확인한다. 새 자원이 추가되어야만 복구되는 경로를 식별한다.
3. 중요한 서비스는 AZ 장애 시 남은 자원만으로 부하를 감당할 수 있는지 검토한다. 장애 중 새 인스턴스를 확보할 수 있다고 가정하지 않고, 필요한 여유 용량과 유지 비용을 함께 판단한다.

이 원칙은 정상 수요 증가에 대한 자동 확장을 금지하지 않는다. 장애 시 즉시 복구를 새 자원 생성에 의존하는 정도를 줄이려는 기준이다. 앞의 이벤트 사전 확장과 장애 대비 여유 용량은 목적을 구분해 산정한다. 실제 환경에서 부하 테스트나 장애 시험을 수행한 기록은 아니다.

## 안전장치 — 실패를 전제로 설계

스파이크 대비의 나머지 반은 그래도 무너질 때를 위한 격리와 복구다.

- **재시도 설계** — 일시적 초과 상황에서 요청이 유실되지 않게 한다.
- **큐 역할별 분리** — 하나의 큐가 적체되어도 다른 역할의 처리에 영향이 번지지 않게 한다.
- **Circuit Breaker** — 불건강한 하위 서비스로의 요청을 자동 차단해 장애 전파를 막고 빠른 복구를 돕는다.
- **복구 우선 판단** — 적체가 심하면 일부를 버리고 빠르게 복구하는 것이 전체를 살리려다 오래 죽는 것보다 낫다. 완전성과 가용성의 트레이드오프를 사전에 합의해 둔다.

## 회고 — 다음 사이클의 입력

- 예상치 못한 문제가 발생했을 때 책임을 추궁하기보다 투명하게 공유하고 재발 방지 대책을 수립한다 — [[Failure-Tolerant-Culture|실패에 관대한 문화]]의 실전 적용.
- 회고 과정 자체에서 추가 개선점이 발견되기도 한다. 대응 기간의 지표를 함께 다시 보면 당시에는 못 본 패턴이 보인다.
- 회고 기록이 곧 내년 계획의 입력이므로, 사이클은 회고로 닫히고 회고로 다시 열린다.

## 사례 — LINE 메시징 서버의 신년 대응

각국이 자정을 맞는 순간 새해 인사 메시지가 몰리는 연례 스파이크에 대해 위 사이클을 6개월 전부터 돌린 사례.

- **HTTP 클라이언트 교체 (장애 이전)**: Apache HTTP 클라이언트가 특정 처리량 초과 시 성능이 저하되는 이슈(HTTPCLIENT-1809)가 있어, HTTP/2를 기본 지원하는 비동기 라이브러리(Armeria)로 순차 교체를 진행했다.
- **2019년 푸시 장애**: 위와 같이 Armeria로 전환한 푸시 발송 컴포넌트가 자정 기점의 순간 커넥션 폭증으로 힙 메모리가 급증하며 Full GC를 유발, 응답 지연으로 큐가 적체되어 푸시가 유실됐다. 램프업 BMT만 수행해 미리 발견하지 못한 케이스. 당시에는 적체된 일부 푸시를 버리고 빠른 복구를 택했고, 이후 커넥션 재활용(한정된 수만 생성), 알림 큐의 역할별 분리, Circuit Breaker 도입으로 개선한 뒤 스텝 시나리오 BMT를 추가해 재검증했다.
- **Redis 클러스터 개선**: 성격이 다른 데이터를 별도 클러스터로 분리해 기존 클러스터 IOPS를 1/4로 줄였고(무중단 작업 4~5일 소요), 악성 사용자 요청 필터링을 강화해 신년 패턴을 가리던 IOPS 스파이크를 제거했으며, TTL 미지정 데이터에 TTL을 부여하고 volatile-ttl로 전환했다.

## 사례 — 커머스 할인 행사 대응 (2017 발표 기준)

연 2회 대형 할인 행사를 AWS에서 치른 커머스의 기록이다.

- **스텝은 마케팅 일정이 만든다**: 요청은 행사 시작 시각과 매일 같은 시각의 상품 공개에 맞춰 계단처럼 몰렸고, 유입이 기대보다 적어 앱 푸시를 보내자 다시 치솟았다. 사업부에서 기간, 예상 고객 수와 광고 채널을 받아 규모를 산정하고, 진입 페이지에서 상품 상세, 주문, 결제로 이어지는 시나리오의 부하 시험과 원인 분석을 문제가 사라질 때까지 반복한 뒤 열었다.
- **DB는 증설로 풀리지 않았다**: 웹 계층은 자동 확장 그룹으로 늘었지만, 전년 행사에서는 미리 크게 잡아 둔 DB의 CPU가 100% 수준까지 올랐고 발표자는 튜닝과 사전 검증 부족을 원인으로 들었다. 발표 주간의 행사에서도 DB CPU가 높아졌는데, 인덱스 정비와 통계 갱신이 제대로 되지 않은 것이 원인이었고 통계를 갱신하자 CPU가 바로 내려갔다. 부하 시험 중에는 APM으로 느린 SQL을 찾아 인덱스와 통계부터 고쳤다 — [[DB-Incident-Triage|DB 장애 분류]].
- **중요한 행사는 미리 늘려 시작했다**: 동적 확장에 맡기지 않고, 시험으로 확인한 서버 대수로 자동 확장 그룹의 원하는 용량을 올려 두었다. 행사가 끝나면 방문자 수와 문제를 기록해 다음 행사의 규모 산정에 썼다.

## 면접 체크포인트

- "대규모 이벤트 트래픽을 어떻게 대비하나?" → 계측, 계획, 개선, 검증, 회고의 사이클. 작년 수치를 믿지 않고 재계측하는 이유(코드가 계속 바뀜)까지.
- "부하 테스트는 어떻게 설계하나?" → 램프업과 스텝을 구분. 순간 급증은 커넥션 폭증, Full GC 같은 별도 실패 모드를 유발하므로 램프업 통과가 스파이크 안전을 보장하지 않는다.
- "장애가 나면?" → 격리(큐 분리, Circuit Breaker)로 전파를 막고, 복구 우선 판단(일부 버리고 빠른 복구)의 트레이드오프를 설명.
- "가용량 부족이 보이면?" → 증설만이 답이 아니다. 분리, 요청 절감(필터링), 정책 정비, 증설의 순서로 검토.
- 행사 수요는 어떻게 추정하나 → 과거 기록에 판매, 마케팅의 행사 일정, 예상 방문자와 유입 경로를 더한다. 상품 공개와 푸시 발송 시각이 스텝의 시점이 될 수 있다.

## 관련 문서

- [[Traffic-Spike-Query-Types|예측 불가 트래픽 폭증 (Repetitive vs Unique Query)]] — 시점 예측이 불가능한 스파이크의 흡수 구조 (상보 관계)
- [[Load-Test-K6|성능 테스트 도구 (k6, JMeter)]]와 [[performance|성능 테스트 유형]] — 도구 실행 설정과 시나리오 유형
- [[Traffic-Scaling-Playbook|트래픽 스케일링 실전]] — 증설 없는 병목 최적화
- [[Notification-Broadcast-System|대규모 알림 시스템]] — 푸시 파이프라인의 스파이크 설계
- [[Scale-Up-vs-Out|Scale Up vs Scale Out]]
- [[Redis-Memory-Eviction|Redis Memory Eviction Policy]]
- [[Connection-Pool|Connection Pool 사이징]] — 커넥션 폭증의 방어선
- [[RCA-Postmortem|RCA와 포스트모템]] — 회고의 형식
- [[SRE|SRE]] — 예측 불가능한 스파이크(재난, 이슈)의 비상 대응 체계
- [[Failure-Tolerant-Culture|실패에 관대한 문화]] — 책임 추궁 없는 공유
- [[Auto-Scaling|EC2 Auto Scaling]] — scheduled action으로 행사 전 확장
- [[ELB|ELB]] — LCU 예약과 용량 산정
- [[DB-Incident-Triage|DB 장애 분류]] — 통계와 실행 계획 변화 확인

## 출처

- [LINE 메시징 서버가 새해 트래픽을 대비하는 방법 — LINE Engineering](https://engineering.linecorp.com/ko/blog/how-line-messaging-servers-prepare-for-new-year-traffic)
- [AWS Well-Architected Framework, REL07-BP03 Obtain resources upon detection that more resources are needed for a workload](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_adapt_to_changes_proactive_adapt_auto.html)
- [AWS Games Industry Lens, GAMEOPS03-BP05 Pre-scale infrastructure required to support peak requirements](https://docs.aws.amazon.com/wellarchitected/latest/games-industry-lens/gameops03-bp05.html)
- [AWS 공식 문서, Troubleshoot Amazon EC2 instance launch issues](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/troubleshooting-launch.html)
- [AWS Well-Architected Framework, REL11-BP04 Rely on the data plane and not the control plane during recovery](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_withstand_component_failures_avoid_control_plane.html)
- [AWS Well-Architected Framework, REL11-BP05 Use static stability to prevent bimodal behavior](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_withstand_component_failures_static_stability.html)
- [AWS기반 대규모 트래픽 견디기 (AWS Community Day) — Amazon Web Services Korea](https://www.youtube.com/watch?v=s-KWaV4f41Q)
- [AWS 공식 문서, Settings for DB instances](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ModifyInstance.Settings.html)
- [AWS 공식 문서, Capacity reservations for your Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/capacity-unit-reservation.html)
- [AWS 공식 문서, Capacity reservations for your Network Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/capacity-unit-reservation.html)
- [AWS 공식 문서, Spot Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
- [AWS 공식 문서, Increase the proportion of requests that are served directly from the CloudFront caches (cache hit ratio)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-hit-ratio.html)
