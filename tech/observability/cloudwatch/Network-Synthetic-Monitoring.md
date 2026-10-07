---
tags: [observability, aws, cloudwatch, network, synthetic-monitoring]
status: done
verified_at: 2026-10-07
category: "관측가능성(Observability)"
aliases: ["Network Synthetic Monitor", "네트워크 합성 모니터링"]
---

# Network Synthetic Monitor

Amazon CloudWatch Network Synthetic Monitor는 VPC 서브넷에서 목적지 IP로 시험 트래픽을 보내 왕복 지연과 패킷 손실을 측정한다. 실제 사용자 트래픽을 관찰하는 방식과 달리 능동 probe를 사용하며, 대상 자원에 별도 에이전트를 설치하지 않는다.

## 측정 단위와 해석

probe는 출발 서브넷, 목적지 IP와 프로토콜 등의 조합이다. monitor는 여러 probe를 묶고 CloudWatch에 지표를 게시한다.

| 항목 | 확인할 내용 |
| --- | --- |
| ICMP | Echo request에 대한 echo reply로 측정한다 |
| TCP | 지정 포트의 SYN에 대한 SYN+ACK으로 측정한다 |
| 왕복 지연(RTT) | 집계 구간의 평균 왕복 시간이며 단위는 마이크로초다 |
| 패킷 손실 | 보낸 패킷 중 응답을 받지 못한 비율이다 |
| 집계 간격 | monitor별 30초 또는 60초이며 같은 monitor의 probe에 함께 적용된다 |

TCP probe 성공은 HTTP 응답 내용이나 업무 처리의 성공을 검사한 결과가 아니다. 이 구분은 측정 프로토콜에서 도출한 해석이다. 사용자 요청의 성공률과 지연은 [[Application-Performance-Monitoring|APM]] 지표와 함께 확인한다.

## NHI의 범위와 한계

Network Health Indicator(NHI)는 AWS 관리 네트워크 구간에서 성능 저하를 관찰했는지 나타내는 통계 기반 지표다. `100`은 저하를 관찰했다는 뜻이고 `0`은 관찰하지 못했다는 뜻이다. `0`을 전체 경로 정상의 증명으로 해석하지 않는다.

- Direct Connect 경로에서는 AWS 자원부터 Direct Connect 위치까지의 AWS 관리 구간을 대상으로 한다.
- 2026-09-10부터 Transit Gateway 리전 간 피어링을 지나는 경로도 지원한다. 이때는 Transit Gateway 피어링 연결까지의 AWS 구간을 나타낸다. 출시 공지의 지원 범위에서 AWS GovCloud와 중국 리전은 제외된다.
- Cloud WAN을 중간 라우팅으로 사용하는 Direct Connect attachment에서는 NHI가 정확하지 않으므로 성능 문제 판단에 사용하지 않는다.
- monitor 생성, probe 추가 또는 재활성화 뒤에는 분석 자료 수집으로 NHI가 몇 시간 지연될 수 있다.

RTT와 손실 측정이 가능하다는 사실만으로 해당 연결에 NHI도 제공된다고 가정하지 않는다. 애플리케이션 지연, 경로 지표와 NHI를 함께 비교해 조사 범위를 좁힌다.

## 운영 점검

다음은 측정 방식과 서비스 제약을 적용한 점검 절차다.

1. 실제 워크로드가 사용하는 출발 서브넷과 목적지를 고른다. 여러 가용 영역이면 각 경로의 대표성을 확인한다.
2. 목적지가 선택한 probe에 응답하는지와 방화벽 규칙을 확인한다. TCP probe의 출발 포트는 `1024–65535` 범위에서 바뀌므로 선택한 목적지 포트에 대한 이 트래픽을 허용해야 한다.
3. 손실과 지연의 기준선을 관찰하고 CloudWatch 경보를 설정한다. 장애 대응과 우회 절차는 별도로 설계한다. 서비스 자체는 자동 네트워크 failover를 제공하지 않는다.
4. monitor와 서브넷의 소유 계정이 같은지 확인한다. IPv4와 IPv6 목적지는 같은 monitor에 혼합하지 않고 나눈다.
5. probe 수에 따른 과금을 확인한다. 목적지로 `169.254.0.0/16`과 `10.0.0.2` 같은 예약 또는 AWS 내부 주소를 사용하지 않는다.

## 출처

- [AWS, Using Network Synthetic Monitor](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/what-is-network-monitor.html)
- [AWS, How Network Synthetic Monitor works](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html)
- [Amazon CloudWatch now supports network health indicator for TGW inter-Region peering using synthetic monitors — AWS](https://aws.amazon.com/about-aws/whats-new/2026/09/cloudwatch-network-monitoring-tgw-support/)

## 관련 문서

- [[CloudWatch|CloudWatch]]
- [[Network-Traffic-Monitoring|네트워크 트래픽 모니터링]]
- [[Application-Performance-Monitoring|APM]]
