---
tags: [observability, aws, x-ray, distributed-tracing, opentelemetry, cloudwatch]
status: done
verified_at: 2026-09-30
category: "관측가능성(Observability)"
aliases: ["AWS X-Ray", "Amazon X-Ray", "X-Ray"]
---

# AWS X-Ray

분산 요청의 지연, 오류와 서비스 의존성을 추적하는 AWS 트레이싱 기능이다. 수집한 trace를 CloudWatch의 X-Ray trace map과 trace 상세 화면에서 메트릭, 로그와 연결해 병목 구간을 찾는다.

## 데이터 모델

- **Trace**: 한 요청이 여러 서비스를 통과한 전체 경로
- **Segment**: 한 서비스가 처리한 구간과 요청, 응답 정보
- **Subsegment**: 외부 HTTP 호출, AWS SDK 호출, DB 쿼리 같은 하위 작업
- **Annotation**: filter expression과 group에 쓰도록 인덱싱되는 키-값. 값은 string, number, boolean이고 trace당 50개까지 인덱싱된다. filter에 쓸 키는 영숫자와 밑줄만 쓴다
- **Metadata**: 진단에 필요한 추가 데이터지만 검색 인덱스에는 포함되지 않음
- **user 필드**: 요청한 사용자를 기록하는 segment 필드. annotation과 별도로 인덱싱되어 filter의 `user` keyword로 찾는다

trace map은 서비스 노드와 호출 간선을 지연, 오류, fault 상태와 함께 보여 준다. 지도에서 이상 구간을 찾은 뒤 개별 trace와 segment로 내려가 원인을 좁힌다.

## 현재 권장 수집 경로

```text
애플리케이션 OTel 또는 ADOT 계측
  -> CloudWatch agent 또는 OpenTelemetry Collector
  -> AWS X-Ray와 CloudWatch trace backend
```

AWS X-Ray SDK와 daemon은 2026-02-25부터 유지보수 모드다. 보안 수정만 제공되고 신규 기능 개선은 제한되므로 새 계측은 [[OpenTelemetry|OpenTelemetry]]를 우선하고 기존 X-Ray SDK 계측도 단계적으로 이전한다. X-Ray API와 저장된 trace 분석 기능이 사라진다는 뜻은 아니다.

Lambda, API Gateway 같은 관리형 서비스의 tracing 옵션은 서비스 구간을 만들 수 있지만, 애플리케이션 내부 작업까지 보려면 코드나 에이전트 계측이 필요하다. HTTP와 메시지 큐를 넘을 때 trace context가 끊기지 않도록 전파한다.

## 기존 SDK와 daemon 구조

기존 계측을 옮기려면 daemon이 하던 일을 알아야 대체 구성에서 빠지는 역할이 없다.

```text
애플리케이션의 X-Ray SDK
  -> UDP 2000으로 segment document 전송 (non-blocking)
X-Ray daemon (같은 호스트, 컨테이너 또는 task)
  -> 메모리 buffer에 모아 X-Ray API로 batch 업로드
  -> TCP 2000으로 sampling rule 조회 같은 X-Ray API 호출 중계
```

- SDK는 요청과 응답 header, 실행 중인 AWS 리소스 정보와 AWS SDK 호출을 segment와 subsegment로 만들지만 X-Ray로 직접 보내지 않는다. daemon이 떠 있어야 데이터가 X-Ray에 닿는다.
- daemon buffer의 기본 크기는 사용 가능한 메모리의 1%(최소 3MB)이고, 동시 업로드 수는 설정 파일의 `Concurrency`로 제한한다.
- SDK가 non-blocking UDP로 보내므로 daemon이 없거나 포트가 막혀도 요청은 성공하고 trace만 빠질 수 있다. daemon 로그의 batch 전송 기록과 콘솔 수신 여부로 확인한다.

| 환경 | daemon 실행 방식 | 권한 주체 |
|---|---|---|
| EC2, 온프레미스 | 직접 설치해 실행 | instance profile 또는 자격 증명 |
| ECS | task 안의 별도 container(sidecar). bridge mode는 UDP 2000 port mapping, link와 `AWS_XRAY_DAEMON_ADDRESS`를 두고, `awsvpc`는 이 설정 없이 기본 주소로 닿는다 | task role |
| Elastic Beanstalk | `aws:elasticbeanstalk:xray` namespace의 `XRayEnabled: true` 또는 콘솔 설정. Multicontainer Docker(ECS) platform은 제공하지 않음 | 환경의 instance profile |
| Lambda | 활성 추적을 켜면 sampled 요청마다 Lambda가 실행 | execution role |

Lambda execution role에 필요한 쓰기 권한은 `xray:PutTraceSegments`, `xray:PutTelemetryRecords`다. Lambda 밖에서 띄운 daemon은 SDK의 sampling 호출도 중계하므로 `xray:GetSamplingRules`, `xray:GetSamplingTargets`가 더 필요하다. 관리형 정책 `AWSXRayDaemonWriteAccess`는 이 넷과 `xray:GetSamplingStatisticSummaries`를 함께 담는다.

daemon의 역할은 CloudWatch agent(1.300025.0 이상)나 OpenTelemetry Collector로 옮긴다. CloudWatch agent는 X-Ray SDK와 OTel SDK의 trace를 모두 받으므로 daemon을 먼저 바꾸고 SDK 계측은 나중에 옮길 수 있다. Collector는 OTLP로 받은 span을 `awsxray` exporter로 보내고, X-Ray sampling rule을 계속 쓰려면 `awsproxy` extension을 둔다. 같은 호스트에서는 port 충돌을 막기 위해 daemon을 먼저 멈춘다.

## Lambda 활성 추적

trace는 실행 환경 준비, init과 함수 실행 구간을 나눠 보여 주므로 로그의 duration 합계만으로는 알 수 없는 지연 위치를 찾을 수 있다.

- tracing mode는 `Active`와 `PassThrough`다. 켜지 않으면 `PassThrough`라 추적 header만 하위로 넘기고, header에 sample 결정이 있어도 trace를 보내지 않는다.
- 콘솔의 구성 > 모니터링 및 운영 도구에서 Lambda service traces를 켜면 execution role에 권한이 추가된다. CLI(`--tracing-config Mode=Active`)나 CloudFormation(`TracingConfig`)으로 켜거나 SAM(`Tracing: Active`)에서 `Role`을 직접 지정했으면 위 쓰기 권한을 직접 붙인다. SAM이 execution role을 만들면 `AWSXrayWriteOnlyAccess`를 자동으로 붙인다. 게시된 version의 tracing mode는 바꿀 수 없다.
- sampling은 초당 1건과 추가 요청의 5%로 고정이며 함수별로 바꿀 수 없다. 상위 서비스가 header로 sample 결정을 넘기면 그 결정을 따른다.
- 한 trace에 segment가 두 개 생긴다. `AWS::Lambda`는 MicroVM 배정, 실행 환경 생성이나 unfreeze, code와 layer 다운로드 같은 준비 구간이고 `AWS::Lambda::Function`은 함수가 한 일이다. 오류가 `AWS::Lambda` segment에 있으면 Lambda service, `AWS::Lambda::Function` segment에 있으면 함수 문제다.
- init 단계는 function segment 아래 `Initialization`(이전 형식) 또는 `Init`(새 형식) subsegment로 보인다. 이 구간이 붙은 trace가 새 실행 환경에서 처리된 호출이므로 [[AWS-Lambda-Execution-Model|cold start]]를 가려내는 기준이 된다. provisioned concurrency나 Lambda의 사전 초기화에서는 init이 호출보다 먼저 끝나 두 구간 사이에 간격이 생기므로 그 간격을 호출 지연으로 읽지 않는다.
- 이전 형식은 `Invocation`, `Overhead`(SnapStart는 `Restore` 추가) subsegment를 두고, 새 형식은 사용자 subsegment를 function segment에 바로 붙이며 `aws.responseLatency` 같은 값을 annotation으로 남긴다. 형식 전환이 진행 중이라 같은 계정에서도 함수마다 다를 수 있다.
- Amazon MSK, self-managed Kafka, Amazon MQ, DocumentDB event source mapping으로 호출되는 함수는 X-Ray tracing을 지원하지 않는다.
- 새 계측은 AWS Lambda Layer for OpenTelemetry(권장, tracing만 쓰면 `OTEL_AWS_APPLICATION_SIGNALS_ENABLED=false`)나 ADOT managed layer로 붙인다.

## 샘플링과 검색

- head sampling rule로 기록할 요청 비율과 우선순위를 정해 수집량과 비용을 제어한다.
- 오류와 느린 요청을 놓치지 않아야 한다면 OTel Collector의 tail sampling을 포함한 전체 수집 경로를 설계한다.
- trace를 묶을 업무 범주나 한 건을 찾을 식별자처럼 filter에 쓸 값만 annotation으로 두고, 상세 payload는 metadata나 안전한 로그에 둔다. 공식 예제도 게임 ID를 annotation으로 기록해 개별 trace를 찾는다.
- 비밀번호, 토큰, 개인정보를 trace 속성에 넣지 않는다. 요청 본문을 수집할 때는 allowlist와 마스킹을 적용한다.

## filter expression과 group

filter expression은 `keyword operator value` 형식이고 `AND`, `OR`로 묶는다.

```text
responsetime > 5
http.status != 200
service("api.example.com") { fault }
edge("api.example.com", "backend.example.com") { error }
annotation[payment_method] = "card" AND fault
service(id(name: "my-function", type: "AWS::Lambda::Function")) { error }
```

- `ok`, `error`, `throttle`, `fault`는 각각 2xx, 4xx, 429, 5xx 응답이다. 단순 keyword는 trace 수준에서만 판단하므로 하위 호출의 오류를 애플리케이션이 처리해 사용자에게 돌려주지 않았다면 `error`로 찾지 못한다. 이때는 `service()`, `edge()`로 노드와 간선을 지정한다.
- Lambda처럼 이름이 같은 노드가 둘 생기면 `id()`에 type을 넣어 함수 쪽만 좁힌다.
- group은 이름 붙인 filter expression이다. X-Ray가 저장 시점에 들어오는 trace를 식과 비교해 group별 trace map과 trace 목록을 만들고, 매칭된 trace 수를 CloudWatch 지표로 1분마다 게시한다. 이 지표에 알람을 걸면 특정 업무 흐름의 fault 증가를 따로 감시할 수 있다.
- group은 Region당 25개이고 한도를 늘릴 수 없다. 식을 고치면 이후 trace에만 적용돼 이전 식과 새 식의 결과가 한 그래프에 섞이므로, 기준을 바꿀 때는 group을 새로 만든다. group 조회는 식에 매칭된 retrieved trace 수로 과금된다.

## CloudWatch 통합

기존 service map과 ServiceLens 경험은 CloudWatch의 X-Ray trace map으로 통합되고 있다. CloudWatch Application Signals를 사용하면 서비스 수준 지표와 X-Ray trace를 연결할 수 있다. 화면 이름보다 다음 조사 흐름을 기준으로 운영한다.

1. 서비스 수준의 latency, error, fault 변화를 감지한다.
2. trace map에서 어느 호출 간선이 악화됐는지 찾는다.
3. 대표 trace의 segment와 subsegment를 비교한다.
4. 같은 trace id의 구조화 로그와 배포 시점을 대조한다.

## 흔한 실패

- 모든 요청을 무기한 수집해 비용과 노이즈가 함께 증가
- SDK만 넣고 daemon이나 대체 agent를 띄우지 않아 segment가 X-Ray에 닿지 않음
- OTel로 옮긴 뒤 attribute가 기본값대로 metadata로 변환돼 annotation 기반 filter expression과 group이 비게 됨. 유지할 키는 `aws.xray.annotations`에 지정
- group의 filter expression을 고쳐 이전 기준과 새 기준의 trace가 한 그래프에 섞임
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
- [AWS X-Ray — X-Ray daemon](https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon.html)
- [AWS X-Ray — Configuring the X-Ray daemon](https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon-configuration.html)
- [AWS X-Ray — Running the X-Ray daemon on Amazon ECS](https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon-ecs.html)
- [AWS X-Ray — Running the X-Ray daemon on Elastic Beanstalk](https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon-beanstalk.html)
- [AWS X-Ray — Using filter expressions](https://docs.aws.amazon.com/xray/latest/devguide/xray-console-filters.html)
- [AWS X-Ray — Configuring groups](https://docs.aws.amazon.com/xray/latest/devguide/xray-console-groups.html)
- [AWS X-Ray — Recording annotations, metadata, and user IDs](https://docs.aws.amazon.com/xray/latest/devguide/scorekeep-annotations.html)
- [AWS X-Ray — Endpoints and quotas](https://docs.aws.amazon.com/general/latest/gr/xray.html)
- [AWS Lambda — Visualize Lambda function invocations using AWS X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html)
- [AWS SAM — AWS::Serverless::Function](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html)
- [AWS Managed Policy Reference — AWSXRayDaemonWriteAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSXRayDaemonWriteAccess.html)
- [Sungmin Kim 강사 — X-Ray란?](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=77098)
- [Sungmin Kim 강사 — X-Ray 실습](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=77110)
- [Sungmin Kim 강사 — X-Ray Configuration](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=77307)

## 관련 문서

- [[OpenTelemetry|OpenTelemetry와 분산 트레이싱]]
- [[CloudWatch|AWS CloudWatch]]
- [[Correlation-ID|Correlation ID와 Trace ID]]
- [[Logs-vs-Metrics|로그, 메트릭과 추적]]
- [[AWS-Lambda-Execution-Model|Lambda 실행 모델과 cold start]]
- [[ECS|Amazon ECS]]
