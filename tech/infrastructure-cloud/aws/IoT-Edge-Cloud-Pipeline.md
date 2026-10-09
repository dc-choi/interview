---
tags: [infrastructure, aws, iot, edge, greengrass, mqtt]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["IoT 엣지와 클라우드 파이프라인", "IoT Edge Cloud Pipeline"]
---

# IoT 엣지와 클라우드 파이프라인

장비 데이터를 수집하는 경로와 현장에서 판단하는 경로를 나눈다. 클라우드는 데이터 통합과 모델 관리에 쓰고, 연결 지연이나 단절에 민감한 처리는 장비 가까이 배치하는 구조다.

## 수집과 분석 경로

건설 장비나 생산 설비에서 수집한 데이터를 처리하는 구성 예시는 다음과 같다. 모든 단계가 필수인 것은 아니다.

1. 현장 센서와 제어기에서 데이터를 읽는다.
2. 엣지에서 필요한 전처리나 모델 추론을 수행한다.
3. AWS IoT Core의 MQTT 메시지로 클라우드에 전달한다.
4. 규칙과 큐를 거쳐 파서, 검증과 저장 처리를 분리한다.
5. 최신 상태를 제공하는 조회 경로와 과거 데이터를 분석하는 경로를 목적에 맞게 구성한다.

IoT Core의 SQS rule action은 MQTT 메시지 데이터를 SQS 큐로 전달한다. **이 action은 FIFO 큐를 지원하지 않으며 메시지 순서도 보장하지 않는다.** 뒤에 큐를 둔 것만으로 장비 이벤트의 순서가 보존되지는 않는다.

Standard SQS는 같은 메시지를 다시 전달할 수 있다. 소비자는 멱등하게 처리해야 한다. 이를 장비 상태 갱신에 적용하면 이벤트 식별자와 측정 시각 또는 장비별 순번을 두고, 늦게 도착한 값이 최신 상태를 덮어쓰지 않도록 하는 설계를 검토할 수 있다. 구체적인 순번과 재부팅 처리는 장비 계약에 따라 정한다.

## 엣지 추론과 클라우드 작업

AWS IoT Greengrass V2는 장비에서 애플리케이션과 ML 추론을 실행하고 데이터를 필터링하거나 집계하는 런타임을 제공한다. 소프트웨어를 component 단위로 배포하고 관리할 수 있다. 모델 추론을 로컬로 옮기는 것과 전체 시스템의 오프라인 동작은 구분한다.

| 경로 | 배치 이유 | 확인할 조건 |
|---|---|---|
| 엣지 수집과 추론 | 현장 데이터에 가까이서 반응 | 모델, 입력과 런타임이 장비에 준비됐는가 |
| 클라우드 데이터 통합 | 여러 장비의 이력 분석 | 재전송, 중복 처리와 저장 누락을 다루는가 |
| 모델 개발과 배포 | 수집 데이터로 모델 개선 | 배포 버전, 실패 복구와 현장 호환성을 확인했는가 |

## 배포 상태와 장비별 복구 결과를 나눈다

로봇처럼 여러 현장 장비에 소프트웨어를 배포할 때는 배포를 생성한 상태와 각 장비가 적용한 결과를 구분한다. 2026-10-09 Greengrass V2 공식 문서 기준, 개별 core device의 배포 작업은 `list-effective-deployments`로 확인할 수 있다. IoT job의 장비별 실행 상세에서는 다음 상태를 구분한다.

| 상세 상태 | 의미 |
|---|---|
| `SUCCESSFUL` | 배포 성공 |
| `FAILED_NO_STATE_CHANGE` | 적용 준비 중 실패 |
| `FAILED_ROLLBACK_COMPLETE` | 배포는 실패했지만 이전 동작 구성으로 롤백 완료 |
| `FAILED_ROLLBACK_NOT_REQUESTED` | 롤백을 요청하지 않은 배포 실패 |
| `FAILED_UNABLE_TO_ROLLBACK` | 배포 실패 후 롤백도 실패 |

롤백 완료는 새 버전 배포 성공이 아니다. 실패 시 `deployment-failure-cause`와 장비 로그를 함께 확인한다. 운영 적용에서는 목표 버전, 실제 적용 결과와 현장 기능 점검을 따로 기록하는 방식을 검토한다. 배포 성공도 로봇 동작의 안전성이나 물리적 작업 완료를 증명하지 않는다.

## 적용 시 점검할 실패 조건

다음은 공개 구현 사례와 제품 기능을 바탕으로 한 설계 점검 항목이다. Greengrass가 자동으로 보장하는 기능 목록은 아니다.

- **연결 단절**: 로컬 추론이 호출하는 원격 API나 데이터가 남아 있는지 확인한다. 데이터 전송과 새 모델 다운로드의 실패도 별도로 시험한다.
- **자원 한계**: 장비의 메모리, 저장 공간과 추론 시간을 측정한다. 클라우드에서 실행됐던 모델이 현장 장비에도 맞는다고 가정하지 않는다.
- **데이터 해상도**: 공정 전체의 대표값 하나만 저장하면 변화 과정을 재구성하기 어렵다. 분석 목적에 맞는 수집 주기와 시각 정보를 정한다.
- **모델과 제어**: 추론값 생성과 설비 명령 실행을 구분한다. 실제 제어의 허용 범위, 수동 전환과 안전 장치는 설비 요구사항에 따라 별도로 검증한다.

적용 범위는 Greengrass V2다. 현장 추론을 배치했다는 이유로 지연이 없어지거나 안전한 제어가 입증되는 것은 아니다.

## 출처

- [AWS IoT Greengrass, Check deployment status](https://docs.aws.amazon.com/greengrass/v2/developerguide/check-deployment-status.html)
- [AWS, What is AWS IoT Greengrass?](https://docs.aws.amazon.com/greengrass/v2/developerguide/what-is-iot-greengrass.html)
- [AWS, How AWS IoT Greengrass works](https://docs.aws.amazon.com/greengrass/v2/developerguide/how-it-works.html)
- [AWS IoT Core, SQS rule action](https://docs.aws.amazon.com/iot/latest/developerguide/sqs-rule-action.html)
- [Amazon SQS, At-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [HD현대인프라코어의 IoT와 AI 혁신, 건설기계 디지털 플랫폼 MY DEVELON — Amazon Web Services Korea](https://www.youtube.com/watch?v=ic1c5D1H0dw)
- [두산전자의 IT/OT 데이터 기반 AI 자율 생산 체계로의 전환 — Amazon Web Services Korea](https://www.youtube.com/watch?v=Ie2qoRpOqOM)

## 관련 문서

- [[SQS|큐 전달 보장과 소비]]
- [[Idempotency-Key|중복 요청의 멱등 처리]]
- [[DMS|업무 데이터의 변경 수집]]
