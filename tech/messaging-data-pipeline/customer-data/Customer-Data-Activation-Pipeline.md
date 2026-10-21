---
tags: [customer-data, cdp, data-pipeline, identity-resolution, aws]
status: done
verified_at: 2026-10-22
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Customer Data Activation Pipeline", "고객 데이터 활성화 파이프라인"]
---

# 고객 데이터 통합과 활성화 파이프라인

고객 데이터 플랫폼(CDP)은 여러 접점의 데이터를 수집하고, 같은 고객의 기록을 연결한 뒤 분석과 캠페인 실행에 사용한다. 수집, 식별, 세그먼트 계산과 외부 전달을 구분해야 각 단계의 지연과 실패를 찾을 수 있다.

## 데이터 이동과 고객 식별은 다른 단계다

AWS의 CDP 참조 구조는 배치와 실시간 수집, identity resolution, 세그먼트 분석과 activation을 구분한다. 배치 경로에서는 원본을 S3에 적재하고 정제한 뒤 AWS Entity Resolution으로 레코드를 연결한다. 이는 가능한 구현 예이며 모든 CDP에 같은 제품 구성이 필요한 것은 아니다.

DocumentDB의 유연한 스키마는 고객마다 다른 속성을 저장하는 데 사용할 수 있다. 그러나 저장 형식만으로 어떤 레코드를 같은 고객으로 합칠지 결정되지는 않는다. 다음 표는 구현 전에 정할 데이터 계약의 예다.

| 경계 | 설계 시 정할 계약 |
|---|---|
| 원천 이벤트 | 원천 ID, 발생 시각, 수집 시각과 중복 판정 키 |
| 고객 연결 | 연결에 쓴 식별자와 규칙, 충돌 시 검토 및 분리 방법 |
| 프로필 갱신 | 속성의 출처와 최신성, 서로 다른 원천 값의 우선순위 |
| 세그먼트 계산 | 조건 버전, 시간대, 평가 시각과 진입 및 이탈 상태 |
| 실행 요청 | 대상, 채널, 캠페인 버전, 실행 기한과 중복 방지 기준 |

이 표는 설계 제안이며 특정 제품의 필수 필드 목록이 아니다. 원본, 통합 프로필과 실행 결과를 연결할 수 있게 하되 각 단계의 완료 상태를 따로 둔다.

## 속성 변경과 시간 경과를 구분한다

2026-10-22 Amazon Connect Customer Profiles 문서 기준으로 세그먼트 변경 알림은 고객이 세그먼트에 진입하거나 이탈할 때 발생하며 두 평가 경로를 갖는다.

- `LIVE`: 프로필, 연결 객체나 계산 속성이 바뀌면 해당 고객의 멤버십을 near real-time으로 평가한다. 그 결과 멤버십이 변경된 경우에만 알림을 보낸다. 속성이 바뀌어도 같은 멤버십을 유지하면 알림은 발생하지 않는다.
- `SCHEDULE`: 시간 조건의 변화를 확인하기 위해 스케줄 평가의 새 스냅샷을 이전 스냅샷과 비교한다. 이 경우에도 멤버십이 변경된 고객에 대해서만 알림을 보낸다.

두 종류의 알림은 설정한 Kinesis 스트림으로 전달된다.

도메인의 membership streaming을 켜는 것만으로 모든 세그먼트 알림이 시작되지는 않는다. 생성된 세그먼트별 구독이 추가로 필요하다. 이는 Customer Profiles의 계약이며 다른 CDP에 그대로 일반화하지 않는다.

설계 예: 최근 구매가 없는 고객을 고를 때는 새 구매 이벤트뿐 아니라 시간 경과도 조건을 바꾼다. 프로필이 변경되지 않았다는 이유로 세그먼트가 계속 유효하다고 가정하지 않는다.

## 큐 수신과 고객에게 전달된 결과를 구분한다

Amazon SQS standard queue는 at-least-once 전달을 제공하므로 같은 메시지를 다시 받을 수 있다. AWS는 소비자를 멱등적으로 설계하도록 안내한다. 큐를 도입했다는 사실만으로 고객에게 메시지가 한 번만 도착하거나 캠페인 전체가 완료됐다고 판단하지 않는다.

다음은 캠페인 실행 경로의 운영 제안이다.

- 재시도 전에 캠페인의 실행 기한과 현재 대상 조건을 확인한다. 과거에 추출한 대상 목록이 현재도 유효한지는 별도 판단이다.
- 캠페인, 대상과 채널을 포함한 중복 방지 기준을 정한다. 한 캠페인의 의도된 후속 발송까지 제거하지 않도록 실행 회차를 구분한다.
- 발송 API의 요청 접수, 공급자의 전달 결과와 고객 반응을 별도 상태로 둔다. 응답 유실 때는 중복 발송 가능성과 공급자의 멱등성 또는 결과 조회 기능을 확인한다.
- 수집 지연, 프로필 갱신 지연, 큐 대기와 외부 발송 지연을 나눠 측정한다. 외부 호출 성공만으로 구매나 매출의 증분 효과를 계산하지 않는다.

기술 완료 조건과 사업 효과의 측정은 [[Customer-Data-Activation-Strategy|고객 데이터 활성화의 도입 판단]]으로 연결한다. 이 문서는 공식 구조와 동작을 대조한 설계 레퍼런스이며 특정 서비스의 처리량이나 운영 성과를 검증한 기록은 아니다.

## 출처

- [AWS Solutions, Guidance for Customer Data Platform on AWS](https://docs.aws.amazon.com/solutions/customer-data-platform-on-aws/)
- [Amazon DocumentDB, Document database use cases](https://docs.aws.amazon.com/documentdb/latest/devguide/document-database-use-cases.html)
- [Amazon Connect Customer, Track segment membership changes](https://docs.aws.amazon.com/connect/latest/adminguide/customer-segments-membership-events.html)
- [Amazon SQS, At-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)

## 관련 문서

- [[Customer-Data-Activation-Strategy|고객 데이터 활성화의 도입 판단]]
- [[ELT-Platform|데이터 복제와 품질 검사]]
- [[Idempotent-Consumer|소비자 멱등성]]
- [[DocumentDB-TTL-Operations|프로필 저장소의 만료와 읽기 일관성]]
