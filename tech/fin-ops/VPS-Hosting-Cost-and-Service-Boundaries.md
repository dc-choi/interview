---
tags: [finops, vps, hosting, cost, bandwidth]
status: done
verified_at: 2026-11-04
category: "비용&운영(FinOps)"
aliases: ["VPS Hosting Cost and Service Boundaries", "VPS 비용과 운영 조건"]
---

# VPS 호스팅 비용과 운영 조건

호스팅 비용은 서버의 월 표시 가격뿐 아니라 같은 작업을 같은 품질로 처리하는 데 필요한 전체 구성으로 비교한다. vCPU 개수와 메모리가 같다는 사실만으로 성능, 장애 대응과 복구 조건까지 같다고 볼 수 없다.

## 사양표에서 구분할 자원

2026-11-04 Contabo 제품 문서 기준으로 Core VPS와 Performance VPS는 공유 vCPU를 사용한다. Performance VPS의 더 최신 CPU와 NVMe는 전용 코어 제공과 다른 조건이다. 전용 코어 제품은 Max Performance VPS(VDS)로 구분된다.

이를 비용 비교에 적용할 때는 다음을 기록한다. 아래는 비교 절차 제안이며 특정 공급자의 성능을 측정한 결과가 아니다.

| 비교 항목 | 확인할 조건 |
|---|---|
| CPU | 공유 또는 전용, 세대, 실제 작업의 지속 처리량 |
| 저장소 | 용량, 매체, 실제 읽기와 쓰기 지연 |
| 네트워크 | 전송량 정책, 포트 속도, 사용자와 서버 사이의 응답 지연 |
| 복구 | 백업 비용, 보관 범위, 복원에 걸리는 시간과 데이터 손실 범위 |
| 운영 | 패치, 모니터링, 장애 대응을 맡을 주체와 필요한 시간 |

사용자 수 하나로 서버 요구량을 정하지 않는다. 같은 일간 사용자 수라도 요청 빈도, 동시 접속, 이미지 전송량과 데이터베이스 작업이 다르면 필요한 구성이 달라진다.

## 전송량과 전송 속도는 다른 제한이다

Contabo의 트래픽 안내는 기본 전송량 상한을 두지 않는 대신 fair usage 정책을 적용한다. 사용량이 매우 높거나 다른 고객의 이용에 지장을 주면 공급자가 속도를 제한할 수 있고, 제품별 포트 속도도 다르다(2026-11-04 확인).

따라서 트래픽 포함이라는 표시는 어떤 부하에서도 같은 처리 속도를 보장한다는 뜻이 아니다. 전송량 제한, 초과 요금과 속도 제한은 각각 확인한다.

Amazon Lightsail도 번들 가격과 데이터 전송 허용량을 함께 제공한다. 공식 가격 예시는 허용량을 넘는 아웃바운드 전송으로 총 청구액이 늘어나는 경우를 보여 준다(2026-11-04 확인). 월 가격 표시만으로 청구 상한을 판단하지 않는다.

## 백업 제공과 복원 성공을 나눈다

Contabo의 Auto Backup은 Core VPS와 Performance VPS에 추가하는 기능이다. 서버 밖에 백업을 저장하며, 복원은 기존 VPS 데이터를 덮어쓰고 완료될 때까지 VPS를 사용할 수 없게 한다. 문서는 백업 실행과 접근 가능성을 설명하지만 복원 가능성을 보장하거나 고객 대신 복구하지는 않는다고 명시한다(2026-11-04 확인).

운영에 적용할 때는 백업이 존재하는지와 별개로 복원 절차, 데이터 정합성과 소요 시간을 시험한다. 월 비용에는 필요한 백업과 복구 시험 비용도 포함한다.

## 이전을 결정하기 전의 비교표

다음은 도입 검토용 제안이다.

1. 같은 리전 조건, 통화, 계약 기간과 세금 포함 여부로 견적을 맞춘다.
2. 서버 외에 저장소, 백업, 전송과 추가 운영 시간을 별도로 계산한다.
3. 같은 입력과 부하에서 성공 요청당 비용, 지연 분포와 오류율을 비교한다.
4. 장애 때 복원할 수 있는지와 이전 실패 시 돌아갈 경로를 확인한다.
5. SLA는 대상 자원, 측정 기간, 제외 조건과 보상 범위를 대조한다. 광고의 가용성 숫자만으로 공급자 우열을 판정하지 않는다.

특정 서버의 가격 배수, 한국과 해외 리전의 지연값, 공급자 간 품질 우열은 여기서 검증하지 않았다. 상품 설명 확인과 실제 서비스의 이전 적합성 판단은 구분한다.

## 출처

- [Contabo Product Documentation, VPS](https://docs.contabo.com/docs/servers-hosting/vps/)
- [Contabo Help, Are there any bandwidth or traffic limits at Contabo?](https://help.contabo.com/en/support/solutions/articles/103000271195-are-there-any-bandwith-limits-at-contabo-)
- [Contabo Product Documentation, VPS Auto Backup](https://docs.contabo.com/docs/servers-hosting/vps-auto-backup/)
- [AWS, Amazon Lightsail Pricing](https://aws.amazon.com/lightsail/pricing/)

## 관련 문서

- [[Cloud-Unit-Cost|클라우드 단위 비용]]
- [[AWS-Pricing-Estimation|AWS 비용 추정]]
- [[Egress-Cost|데이터 전송 비용]]
