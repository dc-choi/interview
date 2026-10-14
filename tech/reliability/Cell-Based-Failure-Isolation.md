---
tags: [reliability, cell-based-architecture, fault-isolation, shuffle-sharding, payments]
status: done
verified_at: 2026-10-14
category: "안정성엔지니어링(Reliability)"
aliases: ["Cell-Based Failure Isolation", "셀 기반 장애 격리"]
---

# 셀 기반 장애 격리

## 정의와 경계

셀은 요청 일부를 독립적으로 처리하는 워크로드 단위다. 서비스와 데이터를 함께 묶고, 라우터가 고객이나 리소스 같은 분할 키로 요청을 보낸다. 기능별 서비스 분해와 달리 장애가 퍼질 범위를 제한하는 것이 목적이다.

셀 수만 늘려서는 격리가 보장되지 않는다. 동기 호출과 공유 상태가 경계를 가로지르면 장애도 전파될 수 있다. AWS의 일반 설계는 셀, 얇은 라우터와 셀 생성 및 고객 이동을 관리하는 제어 계층을 구분한다.

## 독성 요청과 셔플 샤딩

독성 요청(poison pill request)은 손상됐거나 특정 장애 모드를 일으키는 요청이다. 이런 요청이 인스턴스를 멈추게 하는 버그를 건드리면, 호출자가 같은 요청을 인스턴스마다 반복해 재시도하면서 장애가 연쇄로 번질 수 있다. 모든 고객이 모든 인스턴스를 공유하면 고객 하나의 요청이 서비스 전체를 멈출 수 있다.

인스턴스 8대에 고객을 배정하는 예에서 독성 요청 하나의 영향 범위는 배치에 따라 다음과 같다.

| 배치 | 영향 범위 |
|---|---|
| 모든 고객이 8대를 공유 | 전체 고객 |
| 2대씩 셀 4개로 나누고 고객을 한 셀에 배정 | 같은 셀의 고객, 약 1/4 |
| 고객마다 8대 중 2대 조합을 배정(셔플 샤딩) | 조합이 같은 고객, 약 1/28 |

셔플 샤딩은 카드 한 벌에서 패를 돌리듯 고객마다 인스턴스 몇 대의 조합을 샤드로 배정한다. 8대에서 2대를 고르는 조합은 28개이므로 같은 인스턴스를 고정 샤드 4개로 나눌 때보다 영향 범위가 7배 작다(2014년 AWS Architecture Blog는 같은 예를 순서를 구분해 56개, 1/56로 센다). 샤드끼리 인스턴스가 겹칠 수 있지만 2대짜리 샤드에서는 다른 샤드의 인스턴스가 많아야 1대만 영향을 받으므로, 문제 고객과 한 대를 공유한 고객은 남은 인스턴스로 처리받는다. 조합 수는 인스턴스 수가 늘수록 빠르게 늘어 100대에서 5대를 고르면 C(100, 5) = 75,287,520개다. 고객을 조합에 고르게 배정하면 문제 고객과 다섯 대가 모두 같은 고객의 비율은 약 0.0000013%다.

- 클라이언트가 장애를 견뎌야 한다. 샤드의 한 인스턴스가 실패하면 같은 샤드의 다른 인스턴스로 재시도해야 겹친 고객이 계속 처리받는다.
- 무작위 배정만으로는 샤드끼리 얼마나 겹칠지 보장하지 못해 두 고객이 같은 샤드를 받을 수도 있다. Route 53 Infima 라이브러리의 stateful 방식처럼 새 샤드를 이미 배정한 샤드와 대조하면 겹침에 상한을 둘 수 있다. Route 53은 가상 네임 서버 2,048개에서 고객 도메인마다 4개를 배정한다. 가능한 셔플 샤드 조합이 약 7,300억 개라 도메인마다 고유한 샤드를 줄 수 있고, 어떤 도메인도 다른 도메인과 가상 네임 서버를 두 개보다 많이 공유하지 않게 했다.
- 셀과 셔플 샤딩은 같은 개념이 아니다. 셀은 상태를 공유하지 않는 자기 완결 단위이므로 셔플 샤딩은 셀 안에서 쓸 수 있지만 셀을 가로질러 쓰지 않는다. 상태를 가진 구성 요소에는 적용이 더 까다롭다.

트래픽 폭증처럼 정상 요청의 양이 문제일 때는 [[Load-Shedding|부하 차단]]으로 초과분을 거절해 받아들인 요청을 지킨다.

## 데이터와 복구 경로

다음은 American Express가 공개한 결제 설계 사례다. 모든 결제 제공자의 복구 계약으로 일반화하지 않는다.

| 대상 | 처리 방식 |
|---|---|
| 변경이 적은 참조 데이터 | 거래 전에 셀마다 배포해 처리 도중 중앙 조회를 피한다 |
| 거래마다 바뀌는 데이터 | 최신 상태가 필요한 거래를 해당 데이터를 가진 셀로 라우팅한다 |
| 셀 간 복제와 관측 집계 | 거래의 동기 처리 경로 밖에서 수행한다 |
| 외부 전송 전 내부 실패 | 원래 입력으로 다른 정상 셀에서 다시 시작한다 |
| 카드 발급사 등 외부로 전송한 거래 | 재라우팅 금지 경계로 취급한다 |

부분 실행을 다른 셀에서 이어받으려면 실패한 셀의 상태에 의존하게 된다. 재시작은 이 의존성을 줄이지만, 외부 효과가 발생할 수 있는 시점에는 별도의 복구 계약이 필요하다. 이 사례의 다른 결제 유형에서는 재시도와 재라우팅에도 같은 거래 식별자를 유지해 하위 시스템이 중복을 억제한다.

## 셀 배포와 제어 계층의 장애 경계

같은 코드와 배포 템플릿을 재사용하더라도 모든 셀을 동시에 갱신하지 않는다. 셀 하나 또는 제한된 셀 묶음부터 배포하고, 오류를 확인하면 다음 배포를 멈추고 되돌릴 수 있어야 한다. 셀 경계는 실행 중 장애뿐 아니라 잘못된 변경의 노출 범위도 줄이는 데 쓴다.

제어 계층은 셀 생성, 변경, 고객 이동과 배포를 맡고, 데이터 계층은 라우터와 셀에서 실제 요청을 처리한다. 새 셀을 만들 수 없는 상태와 이미 배치한 셀의 요청 처리가 멈추는 상태를 분리한다. 예를 들어 라우팅 정보를 미리 메모리에 읽어 두면 설정 저장소가 일시적으로 응답하지 않아도 기존 매핑으로 라우팅을 계속할 수 있다. 이는 기존 셀과 필요한 자원이 정상인 범위의 설계이며, 새 용량 확보나 모든 장애의 자동 복구를 보장하지 않는다.

다음은 이 원칙을 배포 운영에 적용한 점검 질문이다.

- 공통 템플릿의 오류가 한 번의 변경으로 모든 셀에 배포되지 않는가?
- 첫 셀의 오류율, 지연과 핵심 거래 결과를 확인한 뒤 다음 묶음으로 진행하는가?
- 배포 도구나 설정 저장소가 멈췄을 때 기존 요청 처리도 함께 멈추는가?
- 셀마다 적용된 버전과 되돌릴 대상을 식별할 수 있는가?

[[ArgoCD|Argo CD]] 같은 배포 도구를 도입했다는 사실만으로 위 경계가 생기지는 않는다. 배포 대상의 생성 자동화와 단계별 진행, 중단 조건을 별도로 확인한다.

## 적용 판단

격리를 유지하려면 일부 서비스를 중복 배치하고 운영 복잡도를 감수할 수 있다. 반면 기존 서버를 셀별로 나누는 구성도 가능하므로 셀 도입이 곧 인프라 몇 배 증가를 뜻하지는 않는다.

다음은 설계 점검 질문이다.

- 하나의 요청을 완료하려면 다른 셀의 응답이 필요한가?
- 장애 시 최신 상태가 없는 셀로 거래를 보내는 경로가 있는가?
- 외부 전송 이후 결과 미확인을 실패로 오인해 다시 실행하지 않는가?
- 라우터와 공유 의존성의 장애 범위를 별도로 확인했는가?
- 고객 하나의 독성 요청이 재시도를 타고 셀이나 샤드 밖으로 번지는 경로가 있는가?

## 출처

- [AWS, What is a cell-based architecture?](https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/what-is-a-cell-based-architecture.html)
- [AWS, Cell deployment](https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/cell-deployment.html)
- [AWS, Control plane and data plane](https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/control-plane-and-data-plane.html)
- [AWS, Cell-based architecture FAQ](https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/faq.html)
- [AWS, REL10-BP03 Use bulkhead architectures to limit scope of impact](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_fault_isolation_use_bulkhead.html)
- [Cell-Based Architecture for Resilient Payment Systems — American Express Technology](https://americanexpress.io/cell-based-architecture-for-resilient-payment-systems/)
- [Workload isolation using shuffle-sharding — Amazon Builders' Library](https://builder.aws.com/content/3F06NpJ8YeoIGP8VHTw4n81pFn8/workload-isolation-using-shuffle-sharding)
- [Shuffle Sharding: Massive and Magical Fault Isolation — AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/shuffle-sharding-massive-and-magical-fault-isolation/)
- [Building Resilient Cloud Services 7: Mitigating software risks — Amazon Web Services](https://www.youtube.com/watch?v=AT-FbrDt7sI)

## 관련 문서

- [[Load-Shedding|부하 차단]]
- [[External-Service-Resilience|외부 서비스 복원력]]
- [[Payment-Unknown-Outcome-and-Reversal|결제 결과 미확인과 망취소]]
- [[Idempotent-Consumer|멱등 소비자]]
- [[Scale-Up-vs-Out|확장 방향과 상태 소유]]
- [[ArgoCD|GitOps 배포 컨트롤러와 권한 경계]]
