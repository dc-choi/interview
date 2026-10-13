---
tags: [aws, lambda, serverless, faas, cold-start, provisioned-concurrency]
status: done
category: "Infrastructure - AWS"
aliases: ["Lambda 실무 패턴", "Lambda 비용과 면접 체크포인트"]
verified_at: 2026-09-30
---

# Lambda 실무 — EC2 비교, 패턴, 비용, 흔한 실수, 체크포인트

## EC2 vs Lambda

| 항목 | EC2 | Lambda |
|---|---|---|
| OS/네트워크 제어 | 사용자가 직접 | AWS가 추상화 |
| 스케일 | ASG 설정 필요 | 자동 (동시성 한도 내) |
| 과금 | 실행 중 인스턴스의 타입과 구매 모델에 따라 초 또는 시간 단위. 중지 중에는 컴퓨트 요금이 없지만 EBS, 공인 IPv4 등은 계속 과금 가능 | 요청과 실행 시간, 메모리 및 사용 기능에 따라 과금. 일반 온디맨드 함수의 유휴 실행 환경에는 컴퓨트 요금이 없지만 Provisioned Concurrency 등은 별도 |
| 실행 시간 제한 | 없음 | 15분 |
| Cold Start | 요청마다 실행 환경을 초기화하지는 않지만 인스턴스 시작, 배포와 애플리케이션 준비 시간은 존재 | 새 실행 환경 초기화 지연 가능 |
| 적합 워크로드 | 지속 부하, OS 제어, 장기 연결 등 | 이벤트성, 변동 부하, 짧은 처리 등. 비용과 SLO는 실제 트래픽으로 비교 |

## 장점

- **인프라 운영 부담 감소** — 실행 기반 관리를 AWS에 위임한다. 런타임 패치 적용 책임은 배포 방식과 업데이트 모드에 따라 달라지며 애플리케이션 권한과 코드 관리는 남는다
- **비용 효율** — 온디맨드 호출량이 적거나 변동이 클 때 유휴 컴퓨트 비용을 줄일 수 있음. Provisioned Concurrency와 연결 서비스 비용은 별도
- **자동 스케일** — 함수별 scaling rate, 계정 동시성 할당량과 downstream 용량 안에서 실행 환경을 늘림
- **이벤트 통합 생태계** — 여러 AWS 서비스의 이벤트 소스와 목적지에 관리형 통합 제공

## 단점, 한계

- **Cold Start** — 지연 민감 API에서 꼬리 지연 증가
- **15분 제한** — 긴 배치는 Step Functions + Lambda 분할 또는 ECS/Fargate
- **동시성 할당량** — 리전별 계정 동시성 기본 할당량은 일반적으로 1,000이며 증설 가능한 서비스 할당량이다. 신규 계정, 함수별 Reserved Concurrency와 scaling rate도 확인하고 비동기 흡수가 필요하면 SQS 검토
- **내구 상태 없음** — 실행 환경의 메모리와 `/tmp`가 재사용될 수 있지만 다음 호출에 유지된다고 보장되지 않는다. 내구 세션과 상태는 외부 저장소에 둠
- **벤더 종속** — 이벤트 포맷, 권한 모델이 AWS에 밀착
- **디버깅 어려움** — 로컬 재현, 분산 추적, 로그 집계에 별도 도구 필요(X-Ray, SAM Local, Serverless Framework)

## 실무 패턴

- **API 백엔드** — API Gateway + Lambda + DynamoDB (서버리스 3종 세트)
- **ETL, 이벤트 처리** — S3 업로드 → Lambda가 썸네일 생성, 메타데이터 추출
- **스케줄 작업** — EventBridge cron → Lambda가 정기 배치
- **실시간 스트림 처리** — Kinesis → Lambda → DynamoDB/S3
- **IoT 백엔드** — IoT Core 메시지 → Lambda 라우팅
- **CloudWatch Alarm 자동화** — 알람 → Lambda → Slack, PagerDuty
- **에이전트 도구** — AgentCore Gateway → Lambda (MCP 도구 호출을 함수 호출로 변환)

### 웹 API의 세 가지 권한 경계

2026-10-13 Lambda의 API Gateway 통합과 실행 역할 공식 문서 대조 기준이다. API Gateway, Lambda와 DynamoDB를 연결할 때는 다음 권한을 따로 확인한다.

| 경계 | 확인할 설정 |
|---|---|
| 클라이언트가 API에 접근 | API의 인증과 인가 설정 |
| API Gateway가 함수를 호출 | Lambda 리소스 기반 정책의 호출 허용과 API, stage, method 범위 |
| 함수가 DynamoDB 등 AWS 자원에 접근 | 함수 실행 역할의 작업과 자원 권한 |

함수 실행 역할에 DB 권한을 주는 것만으로 API 호출자의 접근 통제가 설정되지는 않는다. 실행 역할은 함수에 필요한 권한만 부여한다. 운영 확인 예시로 정상 요청, 인증 없는 요청과 DB 접근 권한이 없는 함수의 실패를 각각 검사하면 어느 경계에서 거부되는지 구분할 수 있다. 실제 배포나 권한 시험을 수행한 기록은 아니다.

### 기존 함수를 에이전트 도구로 노출할 때

2026-10-13 Amazon Bedrock AgentCore Gateway 공식 개발자 가이드 대조 기준이다. Gateway는 MCP 요청을 Lambda 호출과 API 요청으로 바꾸고, 여러 함수와 API를 하나의 endpoint 뒤에 묶는다. Gateway 전반의 정책 경계는 [[Bedrock-AgentCore-Operations|AgentCore 운영 경계]], MCP 관문의 일반 원칙은 [[MCP-Security-Boundaries|MCP 보안 경계]]를 따른다.

- **도구 스키마는 Gateway에 등록한다**: Lambda 대상을 추가할 때 도구마다 `name`, `description`, `inputSchema`(필수)와 `outputSchema`(선택)를 inline으로 넣거나 S3 위치로 지정한다. S3에서 읽으면 Gateway 서비스 역할에 그 버킷 접근 권한도 필요하다.
- **입력 계약이 달라진다**: event는 `inputSchema`에 정의한 속성과 값의 맵이고, 도구 이름과 gateway, target ID 같은 메타데이터는 context로 온다(Python 예제 기준 `context.client_context.custom`). MCP에 보이는 도구 이름과 context의 `bedrockAgentCoreToolName`은 `${target_name}___${tool_name}` 형식이므로, 한 함수가 여러 도구를 처리하면 접두사를 잘라 낸 이름으로 분기한다.
- **기존 함수는 코드 변경을 전제로 한다**: 공식 문서는 기존 함수를 도구로 가져오면 event와 context 형식 변화에 맞춰 코드를 바꿔야 한다고 안내한다. 응답은 Gateway가 파싱할 수 있는 유효한 JSON이어야 하고, 함수 timeout은 도구의 처리 시간에 맞춘다.
- **Gateway 할당량은 함수 설정과 별도다**: 대상당 도구 1,000개, Gateway 호출 timeout 15분, `tools/call` payload 6 MB가 기본값이며 조정할 수 있다. Gateway 쪽 할당량을 늘려도 함수의 최대 실행 시간과 동기 호출 payload는 Lambda 할당량을 따른다.

| 경계 | 확인할 설정 |
|---|---|
| 에이전트가 Gateway에 접근 | 인바운드 인가(JWT, `bedrock-agentcore:InvokeGateway` 기반 IAM). `AUTHENTICATE_ONLY`는 SigV4 서명으로 인증만 하고 `NONE`은 인증도 하지 않으며, 둘 다 Gateway가 인가하지 않으므로 policy engine, interceptor Lambda나 대상에서 인가한다. Lambda 대상의 context 메타데이터에는 호출자 신원 필드가 없으므로 함수 안에서 호출자를 구분해 인가할 수 있다고 가정하지 않는다(설계 제안) |
| Gateway가 함수를 호출 | Lambda 대상의 아웃바운드 인가는 Gateway 서비스 역할 방식만 지원한다. 역할 정책에 `lambda:InvokeFunction`을 주고, 함수가 다른 계정에 있으면 함수의 리소스 기반 정책에도 역할 ARN을 principal로 넣는다 |
| 함수가 AWS 자원에 접근 | 함수 실행 역할의 작업과 자원 권한 |

Gateway 서비스 역할은 이 방식(`GATEWAY_IAM_ROLE`)으로 설정한 모든 대상이 공유하며, 공식 문서는 그 권한이 인가된 호출자가 Gateway로 행사할 수 있는 상한이라고 설명한다. 같은 문서는 민감도나 업무가 다른 대상을 실행 역할이 서로 다른 Gateway로 나누고, 공유 Gateway에서는 policy engine으로 호출자별 대상을 제한하도록 권한다. 인바운드 `NONE`은 테스트 편의로 쓰거나 민감한 정보를 돌려줄 수 있는 대상에 쓰지 않도록 권고된다.

함수가 이미 API Gateway REST API 뒤에 있다면 그 stage를 대상으로 붙이는 선택지도 있다. 같은 계정과 리전에 있는 public endpoint 유형의 REST API만 지원하며 HTTP API, WebSocket API, `{proxy+}` 같은 프록시 리소스의 메서드와 `AWS_IAM` 인가와 API key를 함께 요구하는 메서드는 지원하지 않는다. 도구 이름은 Gateway가 `GetExport`로 받은 OpenAPI의 `operationId`나 tool override에서 오고, 아웃바운드 인가는 IAM(API에 IAM 인가 필요), API key와 권장되지 않는 인가 없음 중에서 고른다.

Gateway가 MCP 요청을 REST API의 HTTP 요청으로 바꾸므로 명시적으로 정의한 resource와 method의 이벤트 형식은 유지할 수 있지만, API와 함수가 보는 요청 주체는 원래 에이전트 사용자가 아니라 Gateway의 아웃바운드 인가 방식(서비스 역할, API key 또는 인가 없음)으로 정해진다(해석). 아웃바운드 인가를 위해 API의 인가 설정을 바꾸면 기존 호출자에게도 영향이 간다(설계 제안). 직접 호출하던 함수라면 기존 핸들러는 두고 도구 인자를 업무 로직 입력으로 바꾸는 어댑터 함수를 따로 두면 기존 호출자의 회귀 범위를 줄일 수 있다(설계 제안). 이 절은 공식 문서 대조이며 실제 Gateway 배포나 호출 시험을 수행한 기록은 아니다.

## 중계 함수와 개발용 동기화의 경계

2026-10-13 Lambda 설계와 AWS SAM 공식 가이드 대조 기준이다. 아래는 중계 코드의 필요성과 개발 중 통합 검증을 확인한 범위이며, 기존 절 전체의 재검증은 아니다.

Lambda가 업무 판단 없이 다른 서비스의 API만 호출한다면 직접 서비스 통합으로 대체할 수 있는지 확인한다. 예를 들어 Step Functions는 DynamoDB 작업과 SQS 메시지 전송을 직접 연결할 수 있다. 복잡한 데이터 변환이나 업무 규칙이 필요한 함수는 별도로 남긴다. 함수를 줄였다는 사실만으로 권한, 입력 매핑과 실패 처리의 검증이 끝나지는 않는다.

개발 절차 제안: 업무 로직은 로컬 단위 테스트로 빠르게 검사하고, 실제 AWS 서비스 간 연결은 개발용 클라우드 스택에서 확인한다. 로컬 성공만으로 IAM 권한과 이벤트 전달까지 검증했다고 보고하지 않는다.

- `sam sync --watch`는 로컬 변경을 감지해 클라우드 자원을 갱신한다. 지원하는 변경은 서비스 API로 적용하고, 그렇지 않으면 CloudFormation 배포를 사용한다.
- 서비스 API로 직접 반영한 변경은 CloudFormation 스택과 차이를 만들 수 있다. `sam sync`는 개발 스택에서 사용하며 운영 배포에는 `sam deploy`나 CI/CD 파이프라인을 사용한다.
- 코드 동기화 성공, 통합 테스트 통과와 운영 배포 승인을 구분한다. 동기화가 빠르다는 이유로 운영 스택을 개발 대상으로 쓰지 않는다.

## 버전과 Alias — 불변 배포 단위, 환경 분리, 롤백

- **`$LATEST`**: 코드와 설정을 고칠 수 있는 유일한 미발행 버전이다. 코드를 배포할 때마다 덮어쓰며, qualifier 없는 함수 ARN으로 호출하면 `$LATEST`가 실행된다
- **발행 버전**: `publish-version`은 `$LATEST`를 복사해 코드, 런타임, 아키텍처, 메모리, layer 등 대부분의 설정을 고정한 스냅샷을 만든다. 번호는 1부터 늘고 함수를 지웠다 다시 만들어도 재사용되지 않으며 ARN 끝에 `:1`처럼 붙는다. `$LATEST`가 직전 발행 버전과 같으면 새 버전이 생기지 않는다. 발행 뒤에도 트리거, Destinations, Provisioned Concurrency, 비동기 호출 설정은 바꿀 수 있다
- **Alias**: 한 버전을 가리키는 이름 포인터이며 자기 ARN(`function:my-fn:Prod`)을 가진다. 다른 alias는 가리킬 수 없다. Prod alias는 검증된 버전, Staging alias는 새 버전을 가리키게 두면 환경을 나눌 수 있고, 문제가 생기면 alias를 이전 발행 버전으로 되돌려 새 배포 없이 롤백한다
- **호출 경로는 alias ARN으로**: 이벤트 소스 매핑, API Gateway stage variable, S3 같은 트리거를 alias ARN으로 연결하면 버전을 바꿀 때 매핑을 고칠 필요가 없다. 리소스 기반 정책의 호출 권한도 qualifier별로 걸리므로 alias에 권한을 줬다면 unqualified ARN이나 그 alias가 가리키는 버전 ARN으로 직접 호출해도 권한 오류가 난다
- **Weighted alias**: 두 발행 버전 사이에 트래픽을 나눠 canary를 한다. 최대 2개 버전이고 둘 다 같은 실행 역할과 같은 DLQ 설정을 가져야 하며 `$LATEST`는 쓸 수 없다. 분배가 확률적이라 트래픽이 적으면 실제 비율이 설정과 크게 다를 수 있다. 실행된 버전은 로그의 `START ... Version`, 지표의 `ExecutedVersion` 차원, 동기 응답의 `x-amz-executed-version` 헤더로 확인한다
- SAM의 `AutoPublishAlias`와 `DeploymentPreference`는 새 버전을 발행하고 CodeDeploy로 alias 가중치를 canary, linear 방식으로 옮기며 실패하면 되돌린다. CodeDeploy 쪽 구성은 [[CICD-Tool-Selection-AWS-Code-Services|AWS Code 시리즈 운영]]
- Provisioned Concurrency는 발행 버전이나 alias에 걸리므로 실제 트래픽이 들어오는 qualifier와 일치시킨다([[AWS-Lambda-Invocation-Concurrency|동시성 제어]])

## 런타임 업그레이드와 패치 롤백

`python3.12` 같은 **runtime identifier**와 개별 패치를 식별하는 **runtime version ARN**을 구분한다. 언어 버전을 바꾸려면 함수의 runtime identifier를 변경하고 코드, 의존성과 layer 호환성을 검증한다. `Auto`는 선택한 런타임의 패치를 적용하는 설정이며 다른 언어 버전으로 자동 전환하는 설정이 아니다.

관리형 런타임의 업데이트 모드는 다음과 같다.

- **Auto:** 기본 모드. 발행된 함수 버전에도 런타임 패치가 적용될 수 있다. 앞 절의 불변 스냅샷이 패치까지 영구 고정한다는 뜻은 아니다.
- **Function update:** 함수를 갱신할 때 패치를 적용한다. 이 모드의 발행 버전은 런타임 패치도 유지하므로 이전 버전으로 트래픽을 돌려 코드, 설정과 패치를 함께 되돌릴 수 있다. 패치를 받으려면 주기적인 갱신과 버전 발행이 필요하다.
- **Manual:** 지정한 runtime version ARN을 사용한다. 패치 호환성 문제의 임시 완화에 쓰고, 문제 해결 뒤 최신 패치를 받는 모드로 돌아간다.

패치 롤백에는 정상 실행 당시 로그의 `INIT_START`에 기록된 ARN을 확인한다. 같은 패치 번호라도 리전과 CPU 아키텍처에 따라 ARN이 다를 수 있다. `$LATEST`가 Manual이면 런타임이나 아키텍처를 바꾸기 전에 Auto 또는 Function update로 전환해야 한다. 언어 버전 변경과 패치 ARN 롤백을 같은 작업으로 취급하지 않는다.

컨테이너 이미지 함수는 업데이트된 베이스 이미지로 이미지를 다시 빌드하고 재배포해야 한다. 언어 버전 전환 전에는 지원 종료와 생성, 갱신 차단 일정을 확인한다. 기존 런타임의 갱신이 차단된 뒤에는 그 런타임으로 설정을 되돌리지 못할 수 있다.

이 절은 2026-10-09 공식 런타임 관리, 롤백과 지원 정책을 대조했다. 실제 함수의 호환성 시험과 다른 절의 재검증을 뜻하지 않는다.

### AWS Transform custom으로 여러 저장소의 업그레이드를 반복한다

2026-10-10 공식 사용 가이드 대조 기준. AWS Transform custom은 `AWS/python-version-upgrade`, `AWS/nodejs-version-upgrade`, `AWS/java-version-upgrade` 같은 관리형 변환으로 소스 코드의 언어 버전 전환을 돕는다. 대상 버전과 저장소를 지정하고 빌드, 테스트 명령을 제공한다. Lambda의 관리형 런타임 패치 모드와는 별도의 코드 변경 작업이다.

AWS의 Python Lambda 예시는 코드와 의존성뿐 아니라 Lambda 설정과 IaC 템플릿도 변경하고, 로컬 Git 브랜치에 결과를 남긴다. 변환 후에는 diff와 테스트 결과를 검토한다. 코드 변환 완료를 운영 함수의 배포 완료나 외부 서비스와의 호환성 확인으로 계산하지 않는다.

다음은 여러 함수에 적용할 때의 운영 점검 예시다.

1. 변환 전 테스트 결과를 확보하고 대상 언어 버전, 공용 layer와 배포 템플릿의 범위를 확인한다.
2. 변환 후 같은 업무 동작을 검사하고 실패한 테스트, 실행하지 못한 검증과 변경 파일을 구분한다.
3. 검증한 산출물을 별도 배포 절차로 올리고 실제 이벤트 입력, 권한, DB 연결과 오류율을 확인한다.
4. 저장소별 변환 성공, 배포 성공과 운영 확인을 각각 기록한다. 한 함수의 성공을 전체 함수의 호환성으로 확대하지 않는다.

비대화형 실행은 여러 저장소에 반복 적용할 수 있지만 검증 기준을 없애는 방식은 아니다. 공식 예제의 `-t`는 모든 도구 실행을 신뢰해 확인을 생략하는 옵션이므로, 단순한 병렬 실행 옵션으로 오인하지 않는다. 이 절은 변환 절차만 확인했으며 실제 함수를 업그레이드하거나 성능 개선을 측정한 결과는 아니다.

## RDB와 Lambda의 궁합 문제

- Lambda가 동시 실행 환경을 늘릴 때 **각 환경이 DB 커넥션을 열면 데이터베이스 연결 한도를 빠르게 소진**할 수 있음
- 해결: **RDS Proxy** — 커넥션 풀을 Proxy가 유지, Lambda가 Proxy에 접속
- 또는 연결 모델과 부하 특성에 따라 DynamoDB, Aurora Serverless v2, Data API 등을 비교
- 서버가 장기 연결을 직접 유지해야 하는 워크로드는 Lambda의 실행 시간과 연결 모델을 확인하고 ECS/Fargate 등과 비교

## 비용 구조

- **요청 수**: 요청, 아키텍처, 리전에 따른 최신 단가와 계정의 Free Tier 적용 조건을 요금표에서 확인
- **컴퓨트**: 메모리와 실행 시간의 적분으로 과금하며 CPU 아키텍처, 리전, Provisioned Concurrency, ephemeral storage 등의 단가가 다름
- **무거운 연산은 메모리를 늘려 CPU를 확보**하면 실행 시간 단축 → **총비용이 오히려 줄 수 있음** (AWS Lambda Power Tuning으로 최적 메모리 찾기)

## 흔한 실수

- **handler 안에서 매번 DB 풀 생성** → 호출마다 연결 수립. `handler` 밖(init phase)에 두어 실행 환경이 재사용될 때 연결을 재사용하되 유휴 연결 검증과 재연결 처리 필요
- **환경변수에 시크릿 평문** → SSM Parameter Store, Secrets Manager 사용
- **콜드 스타트 무시** → 지연 민감 API의 꼬리 지연을 실제 런타임, 패키지, VPC, 초기화 코드로 측정. 필요하면 Provisioned Concurrency, SnapStart 지원 범위, 초기화 최적화 또는 다른 컴퓨트 모델 비교
- **큰 이벤트 전체를 로그로** → CloudWatch Logs 비용 급증, 민감정보 유출
- **15분 안에 끝낼 수 있겠지**하고 긴 배치 → 중간 실패 시 재시도, 상태 복구가 지옥. Step Functions로 분할

## 언제 Lambda를 피해야 하는가

- 지속적으로 높은 트래픽 — Lambda가 부적합하다고 요청량만으로 단정하지 말고 실행 시간, 메모리, 동시성, 할인 모델, 운영비를 EC2/ECS와 계산
- 콜드 스타트 허용 불가 + Provisioned 비용 감당 안 됨
- 장시간 실행(15분 초과) 또는 대량 메모리 필요
- RDB 커넥션 중심 워크로드(RDS Proxy 비용, 복잡도 초과)

## 면접, 시험 체크포인트

- Lambda 실행 모델(Init-Invoke-Shutdown)과 컨테이너 재사용 개념
- Cold Start 원인과 완화 기법 3가지 이상 (Provisioned Concurrency, SnapStart, 작은 패키지)
- **Reserved vs Provisioned Concurrency** 차이 — 격리/상한 vs 상시 warm
- **호출 모델 3종**(Sync, Async, Event Source Mapping)과 재시도 동작
- **Destinations(OnSuccess/OnFailure)** 와 DLQ의 관계
- Lambda + RDB 조합의 커넥션 폭주 문제와 RDS Proxy 해법
- 15분 제한, 리전별 동시성 할당량과 함수별 scaling rate의 실무 영향, Throttle 발생 시 흐름
- **VPC Lambda** — VPC 연결 자체에 NAT Gateway가 필요한 것은 아니다. 인터넷 송신이나 public endpoint 접근 경로가 필요할 때 NAT, VPC endpoint 등 요구에 맞는 경로를 설계하고 Hyperplane ENI 모델 이해
- **Lambda@Edge vs CloudFront Functions** 차이
- **Layer**로 의존성 분리하는 이유 (패키지 크기, 재사용)
- **`$LATEST`, 발행 버전, Alias** 차이와 alias 재지정 롤백, weighted alias canary의 제약(발행 버전 2개, 같은 실행 역할과 DLQ)
- 메모리를 늘리면 비용이 줄어들 수 있는 이유(CPU 비례)
- 서버리스가 어울리지 않는 워크로드 유형
- 기존 Lambda를 에이전트 도구로 노출할 때 Lambda 대상과 REST API stage 대상의 선택 기준, `GATEWAY_IAM_ROLE` 대상에서 Gateway 서비스 역할 권한이 Gateway로 행사할 수 있는 권한의 상한이 되는 이유

## 출처

- [Designing Lambda applications](https://docs.aws.amazon.com/lambda/latest/dg/concepts-application-design.html)
- [Introduction to using sam sync to sync to AWS Cloud](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-sync.html)
- [Use direct service integrations to optimize your architecture — AWS](https://aws.amazon.com/blogs/architecture/use-direct-service-integrations-to-optimize-your-architecture/)
- [Invoking a Lambda function using an Amazon API Gateway endpoint](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html)
- [Defining Lambda function permissions with an execution role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)
- [Amazon Bedrock AgentCore Gateway: A secure AI gateway for agents, tools, and models](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html)
- [AWS Lambda function targets](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-add-target-lambda.html)
- [Understand how AgentCore Gateway tools are named](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-tool-naming.html)
- [Set up permissions for AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-prerequisites-permissions.html)
- [Set up inbound authorization for your gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-inbound-auth.html)
- [Set up outbound authorization for your gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-outbound-auth.html)
- [Amazon API Gateway REST API stages as targets](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-api-gateway.html)
- [Quotas for Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/bedrock-agentcore-limits.html)
- [Exposing legacy Lambdas as agent tools via AWS Bedrock AgentCore Gateway — Amazon Web Services](https://www.youtube.com/watch?v=Or5M1v-2-FE) — 발표는 기존 함수를 코드 변경 없이 연결한다고 설명하지만 공식 Lambda 대상 문서는 event와 context 형식에 맞춘 코드 변경을 안내하므로 본문은 공식 문서를 따랐다
- [Understanding the shared responsibility model for Lambda runtime management](https://docs.aws.amazon.com/lambda/latest/dg/runtime-management-shared.html)
- [AWS Transform, Common Use Cases](https://docs.aws.amazon.com/transform/latest/userguide/custom-common-use-cases.html) — 언어별 변환, 검증 명령과 비대화형 실행 범위.
- [Automate AWS Lambda Runtime Upgrades with AWS Transform custom — AWS](https://aws.amazon.com/blogs/devops/automate-aws-lambda-runtime-upgrades-with-aws-transform-custom/) — 변환 전 테스트, IaC 변경과 로컬 브랜치 검토 단계.
- [Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)
- [Understanding how Lambda manages runtime version updates](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-update.html)
- [Rolling back a Lambda runtime version](https://docs.aws.amazon.com/lambda/latest/dg/runtime-management-rollback.html)
- [Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [Lambda scaling behavior](https://docs.aws.amazon.com/lambda/latest/dg/scaling-behavior.html)
- [Lambda execution environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [Lambda VPC 인터넷 액세스](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html)
- [Lambda function versions](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html)
- [Lambda aliases in event sources and permissions policies](https://docs.aws.amazon.com/lambda/latest/dg/using-aliases.html)
- [Lambda canary deployments using a weighted alias](https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html)
- [Lambda 요금](https://aws.amazon.com/lambda/pricing/)
- [EC2 On-Demand 요금](https://aws.amazon.com/ec2/pricing/on-demand/)
- [Sungmin Kim 강사 — Lambda란?](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=52051) — 입문 구조 참고. 강의의 5분 제한은 현재 15분으로 변경됨
- [Sungmin Kim 강사 — Lambda - Version Control](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69323)
