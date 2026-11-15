---
tags: [infrastructure, aws, neptune, graph-database, cost, finops]
status: done
verified_at: 2026-11-15
category: "Infrastructure - AWS"
aliases: ["Neptune Cost Optimization", "Neptune 비용 최적화", "Amazon Neptune I/O-Optimized"]
---

# Amazon Neptune Database 비용 최적화

Neptune Database는 라이선스 비용 없이 쓴 자원만큼 과금한다. 비용을 줄이는 순서는 청구서에서 가장 큰 항목을 먼저 찾고, 그 항목에 맞는 방법을 적용한 뒤, 일정 주기로 다시 보는 것이다. 이 문서의 가격과 제약은 2026-11-15 AWS 공식 가격 페이지와 사용자 가이드 기준이며 리전과 시점에 따라 달라진다.

## 과금 항목

| 항목 | 과금 단위 | 비고 |
|---|---|---|
| 인스턴스 | on-demand는 시간 단위, serverless는 NCU 초 단위 | Multi-AZ 비용은 primary와 각 replica 인스턴스 비용의 합. 1 NCU는 약 2GB 메모리 |
| 스토리지 | GB-month | 여러 AZ에 복제되지만 한 벌만 과금 |
| I/O | 100만 요청 단위(Standard) | I/O-Optimized는 I/O 과금 없음 |
| 백업 | GB-month | 클러스터 스토리지의 100%까지 추가 비용 없음 |
| 데이터 전송 | GB | 같은 AZ의 EC2와 Neptune 사이, Multi-AZ 복제 트래픽은 무료 |

구매 방식은 on-demand와 serverless이고, 약정 할인으로 1년 동안 시간당 사용 금액을 약정하는 Database Savings Plans가 있다. 적용 대상 사용량은 Database Savings Plans 가격 페이지에서 확인한다. 표는 주요 항목만 담았다. Neptune notebook은 SageMaker notebook 서비스로 청구되고, T3와 T4g 인스턴스는 unlimited 모드라 기준을 넘는 CPU credit이 따로 과금된다.

## 어디에 쓰는지 먼저 본다

AWS Cost Explorer에서 서비스 필터를 Neptune으로 두고 group by를 usage type으로 바꾸면 인스턴스, 스토리지, I/O 중 어느 항목이 큰지 보인다. group by를 resource로 바꾸면 클러스터별 지출이 보여 여러 워크로드 중 어디부터 손댈지 정할 수 있다. 다만 이 리소스 단위 보기는 Cost Management 설정에서 해당 서비스의 일 단위 리소스 데이터를 켜야 하고, 최근 14일만 다루며 켠 뒤 최대 48시간 뒤에 보인다. 더 긴 기간은 태그 체계나 비용 보고서로 나눈다([[AWS-Cost-Allocation-Tags|비용 할당 태그]]).

## 인스턴스 비용

AWS 영상은 대부분의 워크로드에서 가장 큰 항목이라고 안내한다. 실제 비중은 앞의 Cost Explorer 분석으로 확인한다.

- **최신 엔진과 인스턴스 세대**: 엔진 버전과 인스턴스 세대가 바뀌면 같은 처리량을 더 작은 인스턴스로 감당할 수 있는지 측정한다. 세대별 가격과 성능 차이는 가격 페이지와 발표 시점에 따라 달라지므로 현재 리전 가격으로 계산한다.
- **쓰지 않는 클러스터 정지**: 정지한 동안에는 인스턴스 시간이 과금되지 않고 클러스터 스토리지, 수동 스냅샷과 보존 기간 안의 자동 백업만 과금된다. 주 40시간만 켜 두는 개발, 테스트 클러스터라면 주 168시간 대비 인스턴스 시간이 약 76% 준다. 다만 정지 7일이 지나면 Neptune이 유지보수를 위해 자동으로 다시 시작하므로, 일정 기반 정지는 시작과 정지를 반복하는 자동화(예: 태그와 EventBridge)로 둔다. 정지 중에는 구성 변경, 인스턴스 추가와 제거를 할 수 없고 개별 인스턴스만 정지할 수도 없다.
- **크기 조정**: `CPUUtilization`과 `BufferCacheHitRatio`로 과대 인스턴스를 찾는다. AWS 지표 문서는 캐시 적중률이 99.9 아래면 더 큰 인스턴스로 데이터를 메모리에 더 담는 것을 검토하라고 안내하므로, 인스턴스를 줄일 때는 적중률과 읽기 I/O 요금이 함께 나빠지지 않는지 측정한다.
- **serverless 검토**: 부하가 간헐적이면 NCU 단위 serverless가 provisioned보다 싼지 CloudWatch 지표로 비교한다.
- **아키텍처 대안**: 데이터가 자주 바뀌지 않고 같은 쿼리가 반복되면 결과 캐시로 인스턴스 부하를 줄인다. 1~2 hop 조회처럼 단순한 접근 패턴이 큰 비중이면 DynamoDB나 ElastiCache 같은 키-값 저장소로 옮기는 것을 검토한다. 캐시는 무효화 비용이 따른다([[Cache-Invalidation|Cache invalidation]]).

## 스토리지 비용: 삭제해도 청구액이 줄지 않는다

Neptune 스토리지는 클러스터 볼륨이 존재하는 동안 할당된 최대치인 high water mark로 과금된다. `g.V().drop()`처럼 데이터를 지워도 할당 공간은 그대로이며, Neptune은 빈 공간을 이후 쓰기에 재사용할 뿐이다. 예외도 있다. 지운 데이터가 쓰던 dictionary 항목은 남으며 dictionary garbage collection을 켜야 정리되고, 내부 로그 공간은 별도 high water mark를 가져 로그에만 재사용된다. 현재 high water mark는 `VolumeBytesUsed` 지표로 본다(현재 사용량이 아니라 볼륨이 존재하는 동안 할당된 최대치).

- **처음부터 덜 넣는다**: 탐색, 필터에 쓰지 않고 결과로도 반환하지 않는 속성은 그래프에 넣지 않는다.
- **만료 데이터 정리**: 노드와 엣지에 만료 속성을 두고 주기적으로 배치 삭제하면 같은 볼륨 안에서 공간을 재사용해 high water mark의 증가를 늦출 수 있다. 이미 커진 청구액을 줄이지는 않는다. 데이터 전체를 한 transaction으로 지우면 큰 내부 로그가 생겨 그래프 데이터에 쓸 공간을 영구히 줄일 수 있으므로 작은 배치로 나누고 배치 사이에 간격을 둔다. 일시적인 속성 키와 값은 dictionary에 남으므로 가능한 한 피한다.
- **공간 회수**: 쓰지 않는 할당 공간이 크면 online index rebuild로 인덱스를 조각 모음하거나, 데이터를 내보내 새 클러스터에 다시 적재한다. Online index rebuild는 엔진 1.5.0.0 이상과 provisioned writer가 필요하고 Serverless writer에서는 지원하지 않으며, `VolumeBytesUsed`가 100TB를 넘는 클러스터에서는 바로 실패하고 재구성 대상의 약 25%까지 작업 공간을 쓴다. 조건이 맞지 않으면 export와 reload를 쓴다. 스냅샷 생성과 복원은 원래 볼륨 이미지를 유지하므로 할당 공간을 줄이지 않는다.

## I/O 비용

Standard 구성에서 쓰기 I/O는 쓰기를 내구성 있게 만들기 위해 transaction log를 storage 계층에 보낼 때만 소비되고 4KB 단위로 센다. 1,024바이트 로그 레코드도 1 I/O이며, 4KB보다 작은 동시 쓰기의 로그는 엔진이 묶어 하나로 보낼 수 있다. 수정된 페이지 자체는 storage로 보내지 않는다.

- 쓰기 I/O를 줄이려면 쿼리당 배치 크기를 키우고, 클라이언트에서 병렬 쿼리를 보내 엔진이 동시 쓰기를 묶을 기회를 만든다.
- 2026-11-15 기준 FAQ와 가격 페이지에는 읽기 I/O의 산정 단위가 없다. AWS 영상은 storage 계층에서 페이지를 읽을 때 읽기 I/O가 생긴다고 설명한다. 과금된 읽기 I/O는 클러스터 볼륨 단위로 모든 인스턴스를 합친 `VolumeReadIOPs`로 측정하고, 반복 조회는 결과 캐시로 줄인다.

### I/O-Optimized 전환 기준

확인된 차이는 과금 구조다. 읽기, 쓰기 I/O 요금이 없는 대신 인스턴스와 스토리지 단가가 높다(us-east-1 db.r5.large 가격 예시 기준 인스턴스 약 35%, 스토리지 약 125% 높음). 클러스터 안의 모든 인스턴스가 같은 구성으로 과금된다. 성능 영향은 출처마다 표현이 다르다. AWS 영상은 클러스터 성능과 관계없는 과금 구성이라고 설명하고, 사용자 가이드는 I/O 집약 워크로드에서 예측 가능한 비용과 낮은 I/O 지연, 일정한 처리량을 얻는다고 적는다. 전환 효과는 비용과 지연을 함께 측정한다.

- AWS는 I/O 지출이 전체 Neptune Database 지출의 25%를 넘으면 최대 40%를 절약할 수 있다고 안내한다. 쿼리와 아키텍처를 먼저 정리한 뒤에도 I/O 비중이 이 수준이면 실제 사용량으로 두 구성을 계산한다.
- AWS 영상은 스트리밍 적재처럼 쓰기가 많은 워크로드, 잦은 대량 적재, pool 모델의 멀티테넌트 클러스터를 대표 후보로 든다.
- 엔진 1.3.0.0부터 쓸 수 있고, Standard와 I/O-Optimized 사이 전환은 30일에 한 번만 가능하다.

같은 손익분기 판단은 Aurora에도 있다([[RDS-Operational-Pitfalls-Rare#Aurora I/O 과금 폭탄|Aurora I/O 과금]]).

## 운영 체크포인트

- 비용 최적화는 일회성 작업이 아니다. Cost Explorer로 큰 항목을 다시 찾고 같은 순서를 반복한다.
- 정지 일정은 7일 자동 재시작을 고려해 자동화한다.
- 데이터 삭제를 스토리지 절감 수단으로 보고하지 않는다. 회수는 index rebuild나 export와 reload로 한다.
- I/O-Optimized 전환은 30일 제약이 있으므로 한 달 이상의 실제 I/O 비중으로 판단한다.

## 출처

- [Amazon Neptune Pricing — AWS](https://aws.amazon.com/neptune/pricing/)
- [Amazon Neptune FAQs — AWS](https://aws.amazon.com/neptune/faqs/)
- [Amazon Neptune User Guide, Storage](https://docs.aws.amazon.com/neptune/latest/userguide/storage.html)
- [Amazon Neptune User Guide, Choosing storage types for Amazon Neptune](https://docs.aws.amazon.com/neptune/latest/userguide/storage-types.html)
- [Amazon Neptune User Guide, Stopping and starting an Amazon Neptune DB cluster](https://docs.aws.amazon.com/neptune/latest/userguide/manage-console-stop-start.html)
- [Amazon Neptune User Guide, Online index rebuild](https://docs.aws.amazon.com/neptune/latest/userguide/storage-index-rebuild.html)
- [Amazon Neptune User Guide, Monitoring Neptune using Amazon CloudWatch](https://docs.aws.amazon.com/neptune/latest/userguide/cw-metrics.html)
- [AWS Cost Management User Guide, Resource-level data at daily granularity](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-resource-daily.html)
- [Cost Optimization for Amazon Neptune Database — Amazon Web Services (YouTube)](https://www.youtube.com/watch?v=1gjNKIHqUCc)

## 관련 문서

- [[AWS-Cost-Optimization|AWS 비용 최적화]]
- [[AWS-Cost-Allocation-Tags|AWS 비용 할당 태그]]
- [[RDS-Operational-Pitfalls-Rare|RDS 드문 운영 함정 (Aurora I/O 과금)]]
- [[NoSQL-Overview|NoSQL 개요 (그래프 DB)]]
- [[GraphRAG-Retrieval|GraphRAG 검색 (Neptune Analytics)]]
