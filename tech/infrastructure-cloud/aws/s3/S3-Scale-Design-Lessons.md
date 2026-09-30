---
tags: [infrastructure, aws, s3, object-storage, distributed-systems, storage, durability, formal-methods]
status: done
verified_at: 2026-09-30
category: "Infrastructure - AWS"
aliases: ["S3 Scale Design Lessons", "S3 설계에서 배우는 대규모 스토리지 교훈", "Heat Management"]
---

# S3 설계에서 배우는 대규모 스토리지 교훈

규모가 커지면 같은 시스템이라도 풀어야 할 문제의 성질이 바뀐다. 작은 스토리지의 병목은 용량이지만, 수많은 디스크와 고객을 가진 스토리지에서는 요청이 특정 디스크에 몰리는 부하 편중, 드문 장애의 확률적 누적, 수백 개 서비스를 나눠 맡은 조직의 책임 경계가 핵심 문제가 된다. Amazon S3의 공개 설계 글과 논문은 이 변화를 보여 주는 대표 사례다.

## Heat: 용량보다 요청 편중이 병목이다

S3에서 heat은 특정 디스크에 도달하는 I/O 요청의 양을 뜻한다. HDD는 용량이 빠르게 커졌지만 기계적으로 헤드를 움직여야 하는 무작위 I/O 성능은 거의 늘지 않았다. 2023년 공개 글 기준으로 HDD 한 대의 무작위 I/O는 초당 약 120회 수준에 머물러, 디스크가 커질수록 저장된 바이트당 쓸 수 있는 I/O는 줄어든다.

그래서 한 디스크에 요청이 몰리면 큐가 쌓이고 지연이 늘며, 그 지연이 상위 요청 전체로 번진다. S3는 같은 버킷의 객체라도 매우 많은 디스크에 넓게 흩어 배치한다. 한 고객의 워크로드가 한 디스크를 뜨겁게 만들 수 없고, 반대로 한 고객이 순간적으로 많은 디스크의 I/O를 동시에 끌어다 쓸 수 있다.

이 관점은 일반 분산 시스템에도 그대로 적용된다. 파티션 키가 한쪽으로 쏠리면 전체 용량이 남아도 특정 노드가 병목이 되는 [[Hot-Partition|Hot Partition]], 노드 추가와 제거 때 재배치를 줄이는 [[Consistent-Hashing|Consistent Hashing]]이 같은 문제의 다른 얼굴이다.

## 복제와 erasure coding은 부하 분산 수단이기도 하다

복제와 erasure coding은 보통 내구성 장치로 설명하지만, 대규모에서는 트래픽을 조정하는 수단이다.

- **복제**: 같은 데이터의 사본이 여러 디스크에 있으면 바쁜 디스크를 피해 다른 사본에서 읽을 수 있다.
- **erasure coding**: Reed-Solomon 같은 방식은 객체를 k개의 데이터 shard와 m개의 parity shard로 나누고, k+m개 중 아무 k개만 있으면 원본을 복원한다. 복제보다 용량 부담이 작으면서, 읽기 요청을 과부하 디스크 대신 여유 있는 shard 조합으로 돌릴 선택지를 준다.

즉 redundancy를 장애 대비로만 보지 않고, 평상시 지연을 줄이는 traffic steering 도구로 설계한다.

## 규모가 커질수록 부하가 예측 가능해진다

개별 워크로드는 급격한 스파이크와 긴 유휴 구간을 오간다. 하지만 서로 상관관계가 낮은 수많은 워크로드를 합치면 개별 스파이크가 서로 상쇄돼 전체 수요 곡선이 부드러워진다. 일정 규모를 넘으면 한 워크로드가 전체 피크에 주는 영향이 무시할 수준이 된다.

이 효과는 멀티테넌트 시스템의 경제성을 설명한다. 각 고객이 자기 피크만큼 자원을 따로 두는 대신, 합쳐진 평균에 가까운 용량으로 모두의 피크를 받아낼 수 있다. 전제는 데이터와 요청을 넓게 퍼뜨려 워크로드 사이의 상관관계를 낮게 유지하는 것이다. 한 테넌트가 자원을 독점하면 이 효과는 사라진다.

## 내구성은 모델과 사람의 검토로 함께 지킨다

통계적 내구성 모델은 디스크 고장률과 복구 속도로 데이터 손실 확률을 계산한다. 하지만 코드 버그, 운영 실수, 새 기능이 만든 경로는 이 모델에 잡히지 않는다. S3는 내구성에 영향을 줄 수 있는 변경마다 **Durability Review**를 거친다.

- 변경이 데이터를 잃게 만들 수 있는 위협을 보안의 threat model처럼 목록화한다.
- 각 위협에 대한 대응책이 충분한지 검토한다. 통계 모델이 다루지 못하는 경로를 사람의 검토로 보완하는 장치다.

## ShardStore: 참조 모델 기반 경량 형식 검증

ShardStore는 S3의 스토리지 노드에서 shard 데이터를 저장하는 key-value 저장 계층이다. Rust로 새로 작성해 타입 시스템으로 잡을 수 있는 오류를 컴파일 단계로 옮겼다.

정확성 검증은 전체 형식 증명 대신 경량 형식 기법(lightweight formal methods)을 택했다.

1. 실제 구현보다 훨씬 작은 **실행 가능한 참조 모델**을 명세로 둔다. 2023년 글 기준으로 참조 모델은 구현 코드의 약 1% 크기다.
2. 정확성을 독립적인 속성으로 나누고, property-based testing 같은 자동화 도구로 구현이 참조 모델과 같은 결과를 내는지 계속 확인한다.
3. 크래시 일관성과 동시성처럼 실제 하드웨어에서 재현하기 어려운 경우도 모델과 대조한다.

SOSP 2021 논문은 이 방식이 크래시 일관성과 동시성 문제를 포함한 16건의 문제가 운영에 도달하는 것을 막았고, 형식 기법 전문가가 아닌 엔지니어도 새 기능에 검증을 확장했다고 보고한다. 핵심은 증명의 완전성이 아니라 기능 개발 속도에 맞춰 검증이 함께 진화한다는 점이다.

## 조직도 시스템의 일부다

S3는 수많은 마이크로서비스로 이루어지고, 각 팀이 자기 서비스의 API, 성능, 가용성과 내구성까지 책임진다. 이런 구조에서 설계 품질은 코드만이 아니라 책임 배치에서 나온다.

- 끝까지 책임질 주인이 명확해야 하고, 책임만큼 의사결정 권한이 따라가야 한다.
- 시니어 엔지니어는 해법을 지시하기보다 문제를 명확히 정의해 담당 팀이 해법을 자기 것으로 만들게 한다.

## 트레이드오프와 한계

- 넓은 분산 배치는 heat을 줄이지만 메타데이터, 배치 계산과 재조정 비용을 늘린다. 작은 시스템에서 같은 수준의 분산은 과잉 설계다.
- erasure coding은 저장 효율이 높지만 복원 시 여러 shard를 읽어야 해 복구 트래픽과 지연이 늘 수 있다.
- 부하 평탄화 효과는 서로 독립적인 테넌트가 충분히 많을 때만 성립한다. 소수 고객이 대부분의 트래픽을 차지하면 기대하기 어렵다.
- 공개 글과 논문은 특정 시점의 설계를 설명할 뿐, 현재 S3 내부 구현의 전체 구조나 수치를 보증하지 않는다.

## 적용 점검

- 우리 시스템의 병목은 용량인가, 특정 노드와 키로 몰리는 요청인가
- 복제본이나 shard를 장애 대비 말고 읽기 부하 분산에도 쓰고 있는가
- 멀티테넌트 자원에서 한 테넌트가 전체 피크를 좌우하지 못하도록 분산과 격리를 두었는가
- 데이터 손실 가능성이 있는 변경에 위협 목록 기반 검토 절차가 있는가
- 핵심 저장 로직에 실행 가능한 참조 모델과 자동 대조 테스트가 있는가
- 각 서비스의 성능, 가용성, 내구성 책임자가 명확하고 결정 권한이 있는가

## 출처

- [Building and operating a pretty big storage system called S3 — All Things Distributed, Andy Warfield](https://www.allthingsdistributed.com/2023/07/building-and-operating-a-pretty-big-storage-system.html)
- [Using Lightweight Formal Methods to Validate a Key-Value Storage Node in Amazon S3 — SOSP 2021, Amazon Science](https://www.amazon.science/publications/using-lightweight-formal-methods-to-validate-a-key-value-storage-node-in-amazon-s3)
- [S3 설계 글 정리 — Threads, rich_dev_siliconvalley](https://www.threads.com/@rich_dev_siliconvalley/post/DclscWsFD-k)

## 관련 문서

- [[S3|Amazon S3 인덱스]]
- [[S3-Storage-Performance|S3 스토리지 모델과 성능]]
- [[Hot-Partition|Hot Partition]]
- [[Consistent-Hashing|Consistent Hashing]]
