---
tags: [observability, aws, x-ray, distributed-tracing, opentelemetry, cloudwatch]
status: done
verified_at: 2026-08-04
category: "관측가능성(Observability)"
aliases: ["AWS X-Ray", "Amazon X-Ray", "X-Ray"]
---

# AWS X-Ray

분산 요청의 지연, 오류와 서비스 의존성을 추적하는 AWS 트레이싱 기능이다. 수집한 trace를 CloudWatch의 X-Ray trace map과 trace 상세 화면에서 메트릭, 로그와 연결해 병목 구간을 찾는다.

## 데이터 모델

- **Trace**: 한 요청이 여러 서비스를 통과한 전체 경로
- **Segment**: 한 서비스가 처리한 구간과 요청, 응답 정보
- **Subsegment**: 외부 HTTP 호출, AWS SDK 호출, DB 쿼리 같은 하위 작업
- **Annotation**: trace 검색과 필터에 인덱싱되는 키-값. 사용자 ID 같은 무제한 고카디널리티 값은 비용과 검색 품질을 악화시킬 수 있음
- **Metadata**: 진단에 필요한 추가 데이터지만 검색 인덱스에는 포함되지 않음

trace map은 서비스 노드와 호출 간선을 지연, 오류, fault 상태와 함께 보여 준다. 지도에서 이상 구간을 찾은 뒤 개별 trace와 segment로 내려가 원인을 좁힌다.

## 현재 권장 수집 경로

```text
애플리케이션 OTel 또는 ADOT 계측
  -> CloudWatch agent 또는 OpenTelemetry Collector
  -> AWS X-Ray와 CloudWatch trace backend
```

AWS X-Ray SDK와 daemon은 2026-02-25부터 유지보수 모드다. 보안 수정만 제공되고 신규 기능 개선은 제한되므로 새 계측은 [[OpenTelemetry|OpenTelemetry]]를 우선하고 기존 X-Ray SDK 계측도 단계적으로 이전한다. X-Ray API와 저장된 trace 분석 기능이 사라진다는 뜻은 아니다.

Lambda, API Gateway 같은 관리형 서비스의 tracing 옵션은 서비스 구간을 만들 수 있지만, 애플리케이션 내부 작업까지 보려면 코드나 에이전트 계측이 필요하다. HTTP와 메시지 큐를 넘을 때 trace context가 끊기지 않도록 전파한다.

## 샘플링과 검색

- head sampling rule로 기록할 요청 비율과 우선순위를 정해 수집량과 비용을 제어한다.
- 오류와 느린 요청을 놓치지 않아야 한다면 OTel Collector의 tail sampling을 포함한 전체 수집 경로를 설계한다.
- 검색해야 하는 낮은 카디널리티 업무 속성만 annotation으로 두고, 상세 payload는 metadata나 안전한 로그에 둔다.
- 비밀번호, 토큰, 개인정보를 trace 속성에 넣지 않는다. 요청 본문을 수집할 때는 allowlist와 마스킹을 적용한다.

## CloudWatch 통합

기존 service map과 ServiceLens 경험은 CloudWatch의 X-Ray trace map으로 통합되고 있다. CloudWatch Application Signals를 사용하면 서비스 수준 지표와 X-Ray trace를 연결할 수 있다. 화면 이름보다 다음 조사 흐름을 기준으로 운영한다.

1. 서비스 수준의 latency, error, fault 변화를 감지한다.
2. trace map에서 어느 호출 간선이 악화됐는지 찾는다.
3. 대표 trace의 segment와 subsegment를 비교한다.
4. 같은 trace id의 구조화 로그와 배포 시점을 대조한다.

## 흔한 실패

- 모든 요청을 무기한 수집해 비용과 노이즈가 함께 증가
- annotation에 사용자별 식별자를 남겨 고카디널리티 인덱스 생성
- 비동기 큐에서 context를 전달하지 않아 producer와 consumer trace가 분리
- legacy X-Ray SDK를 새 시스템의 기본 계측으로 채택
- trace만 보고 로그, 메트릭, 배포 변경과 상관분석하지 않음

## 출처

- [AWS X-Ray — SDK and daemon migration](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-migration.html)
- [AWS X-Ray — Support timeline](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html)
- [AWS X-Ray — Concepts](https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html)
- [AWS X-Ray — Segment documents, annotations and metadata](https://docs.aws.amazon.com/xray/latest/devguide/xray-api-segmentdocuments.html)
- [AWS X-Ray — Sampling](https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html)
- [AWS X-Ray — OpenTelemetry](https://docs.aws.amazon.com/xray/latest/devguide/xray-opentelemetry.html)
- [AWS X-Ray — CloudWatch trace map](https://docs.aws.amazon.com/xray/latest/devguide/xray-console-servicemap.html)
- [Sungmin Kim 강사 — X-Ray란?](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=77098)
- [Sungmin Kim 강사 — X-Ray 실습](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=77110)
- [Sungmin Kim 강사 — X-Ray Configuration](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=77307)

## 관련 문서

- [[OpenTelemetry|OpenTelemetry와 분산 트레이싱]]
- [[CloudWatch|AWS CloudWatch]]
- [[Correlation-ID|Correlation ID와 Trace ID]]
- [[Logs-vs-Metrics|로그, 메트릭과 추적]]
