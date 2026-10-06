---
tags: [reliability, cell-based-architecture, fault-isolation, payments]
status: done
verified_at: 2026-10-06
category: "안정성엔지니어링(Reliability)"
aliases: ["Cell-Based Failure Isolation", "셀 기반 장애 격리"]
---

# 셀 기반 장애 격리

## 정의와 경계

셀은 요청 일부를 독립적으로 처리하는 워크로드 단위다. 서비스와 데이터를 함께 묶고, 라우터가 고객이나 리소스 같은 분할 키로 요청을 보낸다. 기능별 서비스 분해와 달리 장애가 퍼질 범위를 제한하는 것이 목적이다.

셀 수만 늘려서는 격리가 보장되지 않는다. 동기 호출과 공유 상태가 경계를 가로지르면 장애도 전파될 수 있다. AWS의 일반 설계는 셀, 얇은 라우터와 셀 생성 및 고객 이동을 관리하는 제어 계층을 구분한다.

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

## 적용 판단

격리를 유지하려면 일부 서비스를 중복 배치하고 운영 복잡도를 감수할 수 있다. 반면 기존 서버를 셀별로 나누는 구성도 가능하므로 셀 도입이 곧 인프라 몇 배 증가를 뜻하지는 않는다.

다음은 설계 점검 질문이다.

- 하나의 요청을 완료하려면 다른 셀의 응답이 필요한가?
- 장애 시 최신 상태가 없는 셀로 거래를 보내는 경로가 있는가?
- 외부 전송 이후 결과 미확인을 실패로 오인해 다시 실행하지 않는가?
- 라우터와 공유 의존성의 장애 범위를 별도로 확인했는가?

## 출처

- [AWS, What is a cell-based architecture?](https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/what-is-a-cell-based-architecture.html)
- [Cell-Based Architecture for Resilient Payment Systems — American Express Technology](https://americanexpress.io/cell-based-architecture-for-resilient-payment-systems/)

## 관련 문서

- [[External-Service-Resilience|외부 서비스 복원력]]
- [[Payment-Unknown-Outcome-and-Reversal|결제 결과 미확인과 망취소]]
- [[Idempotent-Consumer|멱등 소비자]]
- [[Scale-Up-vs-Out|확장 방향과 상태 소유]]
