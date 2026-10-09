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

## 원시 수집과 설비 맥락 연결을 분리한다

2026-10-10 AWS IoT SiteWise 공식 개념 문서 대조 기준. 센서 값을 저장하는 것과 그 값이 어떤 설비와 공정에 속하는지 표현하는 것은 별도의 작업이다.

SiteWise에서는 asset model로 같은 종류의 설비가 공유할 구조를 정의하고, 그 모델에서 개별 asset을 만든다. 모델에는 정적 속성인 `attributes`, 시계열 입력인 `measurements`, 변환인 `transforms`, 집계인 `metrics`와 설비 간 계층을 정의할 수 있다. 각 property는 데이터 타입과 선택적인 단위를 가진다.

원시 데이터 스트림은 모델과 asset을 만들기 전에도 수집할 수 있다. 이후 스트림을 asset property와 연결해 설비별 의미를 부여한다. 예를 들어 온도 값에 설비 식별자, 섭씨 단위와 생산 라인 관계를 연결하면 서로 다른 설비의 같은 이름 측정값을 구분할 수 있다.

적용 시에는 수집 성공과 맥락 연결 완료를 따로 확인한다. 단위가 다른 값을 같은 지표로 합치거나 교체된 센서를 이전 설비에 연결하지 않도록 매핑을 점검한다. 이 점검은 설계 제안이며 모델 생성만으로 원시 데이터의 정확성이나 현장 제어 안전성이 검증되지는 않는다.

## 엣지 추론과 클라우드 작업

AWS IoT Greengrass V2는 장비에서 애플리케이션과 ML 추론을 실행하고 데이터를 필터링하거나 집계하는 런타임을 제공한다. 소프트웨어를 component 단위로 배포하고 관리할 수 있다. 모델 추론을 로컬로 옮기는 것과 전체 시스템의 오프라인 동작은 구분한다.

| 경로 | 배치 이유 | 확인할 조건 |
|---|---|---|
| 엣지 수집과 추론 | 현장 데이터에 가까이서 반응 | 모델, 입력과 런타임이 장비에 준비됐는가 |
| 클라우드 데이터 통합 | 여러 장비의 이력 분석 | 재전송, 중복 처리와 저장 누락을 다루는가 |
| 모델 개발과 배포 | 수집 데이터로 모델 개선 | 배포 버전, 실패 복구와 현장 호환성을 확인했는가 |

## 연결 단절과 MQTT 버퍼의 한계

2026-10-10 Greengrass nucleus 공식 문서 대조 기준. MQTT spooler가 있어도 장기간의 단절이나 저장 공간 부족까지 데이터 무손실이 보장되지는 않는다.

| 설정 | 확인할 경계 |
|---|---|
| `mqtt.spooler.storageType` | 기본값은 `Memory`. `Disk` 선택은 nucleus v2.11.0 이상에서 지원 |
| `mqtt.spooler.maxSizeInBytes` | 기본값 `2621440` 바이트. 캐시가 가득 차면 새 메시지를 거부 |
| `mqtt.spooler.keepQos0WhenOffline` | 기본값 `false`에서는 오프라인 중 QoS 0 메시지를 버림. QoS 1도 spool이 가득 차면 보관할 수 없음 |

선박처럼 연결이 오래 끊길 수 있는 환경에서는 수집량과 예상 단절 시간으로 버퍼 용량을 산정하고, 재연결 후 새 데이터와 누적 데이터를 함께 전송할 처리량을 확인한다. 이는 설계 제안이며 Greengrass의 자동 용량 산정 기능이 아니다. 단절, 버퍼 포화와 프로세스 재시작을 각각 시험해 누락과 중복을 측정한다.

별도 로컬 DB와 압축 업로드를 추가한다면 클라우드 반영 확인 전 로컬 데이터를 지우지 않도록 하고, 재전송의 중복 처리를 설계한다. 로컬 저장 성공, 전송 성공과 최종 저장 성공은 서로 다른 완료 조건이다.

## 장비 제어 요청과 보고 상태를 나눈다

2026-10-09 AWS IoT Core 공식 문서 기준, Device Shadow는 장비가 오프라인이어도 애플리케이션이 저장된 상태를 조회하고 변경을 요청할 수 있게 한다. 상태 요청이 저장됐다는 사실과 장비가 실제로 수행했다는 사실은 구분한다.

| 필드 | 의미와 쓰기 역할 |
|---|---|
| `desired` | 애플리케이션이나 클라우드 서비스가 요청하는 상태 |
| `reported` | 장비가 보고한 상태 |
| `delta` | 요청 상태와 보고 상태의 차이 |

예를 들어 앱이 조명 켜기를 `desired`에 기록해도 오프라인 장비가 즉시 켜진 것은 아니다. 장비는 요청을 처리하고 결과를 `reported`로 보고해야 한다. 물리 동작 확인이 필요한 제품에서는 보고 값이 실제 센서 관측인지 소프트웨어 상태인지를 별도로 정의한다.

Shadow 메시지의 도착 순서는 보장되지 않는다. 장비는 추적 중인 버전보다 오래된 delta를 버릴 수 있다. 동시 갱신 충돌을 막으려면 update 요청에 `version`을 넣을 수 있으며, 서비스는 최신 버전과 일치할 때만 그 요청을 처리한다. 이는 클라우드 문서의 갱신 조건이지 물리 장비 명령의 정확히 한 번 실행 보장은 아니다.

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

## 생성형 AI의 작업 제안과 물리 제어를 분리한다

2026-10-09 AWS 로봇 시뮬레이션 가이드 대조 기준. 참조 구조에서는 Bedrock 모델이 작업 공간의 조건을 분석해 상위 수준의 전략을 제안하고, 시뮬레이션 애플리케이션이 이를 처리해 로봇의 위치와 속도를 계산한다. 모델의 자연어 응답을 그대로 모터 명령으로 해석하는 구조와 구분한다.

이 구조를 현장에 적용할 때는 다음을 별도의 통과 조건으로 검토한다. 아래 항목은 설계 점검 제안이며 참조 구조가 물리적 안전성을 보장한다는 뜻은 아니다.

1. 작업 대상을 잘못 인식하거나 현재 위치 정보가 오래됐을 때 계획을 거부하는지 확인한다.
2. 생성한 전략을 시뮬레이션에서 실행하며 작업 공간, 속도와 충돌 조건을 검사한다.
3. 시뮬레이션 통과 후에도 실제 장비의 센서 오차와 지연, 비상 정지 및 수동 전환을 별도로 확인한다.
4. 검증한 모델과 제어 코드의 버전을 함께 추적하고, 새 배포의 적용 결과와 실제 작업 결과를 각각 확인한다.

시뮬레이션 성공, 배포 성공과 현장 작업 성공은 서로 다른 증거다. 장비별 배포 상태를 확인하는 절차만으로 앞의 판단과 제어 검증을 대체하지 않는다.

## 컴포넌트 레시피와 실행 코드를 함께 검토한다

2026-10-10 Greengrass V2 공식 recipe reference 대조 기준. 생성형 AI로 실행 코드나 레시피를 작성해도 배포 계약의 검토가 필요하다. 레시피는 설명용 메타데이터만이 아니라 의존성, 아티팩트와 설치, 실행 등의 lifecycle 명령을 정의한다.

- **플랫폼 선택:** core device는 조건이 맞는 첫 manifest를 사용한다. 플랫폼 조건이 없는 manifest는 모든 장비와 일치하므로 순서에 주의한다. 맞는 manifest가 없으면 설치하지 못하고 배포가 실패한다.
- **실행 연결:** 선택된 manifest에 lifecycle이 있으면 이를 사용한다. 없으면 전역 lifecycle과 selection 규칙에 따라 실행할 단계를 고른다. 코드 파일만 바꾸고 실제 실행 명령이나 아티팩트 경로를 놓치지 않도록 대조한다.
- **검증 범위:** component version 생성 시 recipe validation은 JSON/YAML의 형식과 누락 필드 같은 오류를 검사한다. 이 통과를 장비별 프로그램 실행 성공이나 현장 동작 검증으로 대신하지 않는다.

적용 시에는 대상 OS와 아키텍처에서 선택되는 manifest, 내려받은 아티팩트, 설치와 실행 로그를 확인하는 점검을 권한다. 코드 생성 도구의 제안, 레시피 생성 성공과 장비 실행 결과를 별개의 증거로 남긴다. 이 점검은 설계 제안이며 실제 장비에서 재현한 결과가 아니다.

## 적용 시 점검할 실패 조건

다음은 공개 구현 사례와 제품 기능을 바탕으로 한 설계 점검 항목이다. Greengrass가 자동으로 보장하는 기능 목록은 아니다.

- **연결 단절**: 로컬 추론이 호출하는 원격 API나 데이터가 남아 있는지 확인한다. 데이터 전송과 새 모델 다운로드의 실패도 별도로 시험한다.
- **자원 한계**: 장비의 메모리, 저장 공간과 추론 시간을 측정한다. 클라우드에서 실행됐던 모델이 현장 장비에도 맞는다고 가정하지 않는다.
- **데이터 해상도**: 공정 전체의 대표값 하나만 저장하면 변화 과정을 재구성하기 어렵다. 분석 목적에 맞는 수집 주기와 시각 정보를 정한다.
- **모델과 제어**: 추론값 생성과 설비 명령 실행을 구분한다. 실제 제어의 허용 범위, 수동 전환과 안전 장치는 설비 요구사항에 따라 별도로 검증한다.

적용 범위는 Greengrass V2다. 현장 추론을 배치했다는 이유로 지연이 없어지거나 안전한 제어가 입증되는 것은 아니다.

## 출처

- [AWS IoT Greengrass, AWS IoT Greengrass component recipe reference](https://docs.aws.amazon.com/greengrass/v2/developerguide/component-recipe-reference.html) — 레시피, manifest 선택과 형식 검증의 범위를 대조했다.
- [AWS IoT SiteWise, AWS IoT SiteWise concepts](https://docs.aws.amazon.com/iot-sitewise/latest/userguide/concept-overview.html) — 원시 스트림 수집, asset model과 property 연결을 대조했다.
- [AWS IoT Greengrass, Greengrass nucleus](https://docs.aws.amazon.com/greengrass/v2/developerguide/greengrass-nucleus-component.html) — MQTT spooler 설정을 대조했다. 단절과 복구 점검은 설계 제안이다.
- [AWS, Guidance for AI-Driven Robotic Simulation and Training on AWS](https://docs.aws.amazon.com/solutions/ai-driven-robotic-simulation-and-training-on-aws/) — 2026-10-09 상위 전략 생성과 시뮬레이션 제어의 분리를 대조했다. 현장 통과 조건은 설계 제안이며 기존 IoT 기능 전체의 재검증은 아니다.
- [AWS IoT Core, AWS IoT Device Shadow service](https://docs.aws.amazon.com/iot/latest/developerguide/iot-device-shadows.html)
- [AWS IoT Core, Device Shadow service documents](https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-document.html)
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
