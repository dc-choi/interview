---
tags: [fit, interview, fitrix, tech]
status: active
category: "Interview - Fit"
aliases: ["Fitrix Interview Prep Tech JD", "피트릭스 1차 JD 기술 질문"]
---

# 피트릭스 1차, JD 기반 기술 질문 8

> [[Interview-Prep-Fitrix-1st|메인]]으로 돌아가기. JD의 스택과 주요업무에서 뽑았다. 경험이 없는 기술은 인정, 전이 근거, 입사 후 확인할 것의 3단으로 답한다. Azure 대응 관계는 2026-09-29에 Microsoft Learn의 Azure for AWS Professionals 개요를 확인해 정리한 대략적 대응이다. 공식 문서도 기능이 일대일로 같지 않다고 밝히므로, 한도와 가격, 기능 차이는 사용 전에 서비스별 문서로 다시 확인한다. Express 5의 Promise 오류 전달은 같은 날 Express 공식 가이드로 확인했다. 피트릭스가 어떤 Azure 서비스를 쓰는지는 미확인이다.

## J1. Azure를 써본 적이 없는데 괜찮은가 (갭, 설계형)

- 의도: 클라우드 경험의 전이 가능성과 정직성.
- 답변 골격:

> Azure를 운영 환경에서 직접 다뤄 본 경험은 없습니다. 다만 AWS에서 컨테이너 실행 환경, 관리형 MySQL, 큐, 이벤트 라우팅, 로그와 메트릭을 직접 설계하고 운영했고, 이때 쓴 판단 기준은 클라우드가 바뀌어도 같습니다. 입사하면 현재 Azure 구성을 계산, 데이터, 메시징, 관측, 권한과 비밀 관리 순서로 파악하고 AWS에서 알던 개념과 다른 부분부터 확인하겠습니다.

| 역할 | AWS 경험 | Azure 대응 후보 | 확인할 차이 |
| --- | --- | --- | --- |
| 컨테이너 실행 | ECS Fargate | Azure Container Apps, App Service, AKS | 배포 단위, 스케일 기준, 무중단 배포 방식 |
| 관리형 MySQL | RDS, Read Replica | Azure Database for MySQL Flexible Server | 읽기 복제본, 백업과 시점 복구, 유지보수 창 |
| 객체 저장 | S3 | Blob Storage | 접근 통제와 수명 주기 정책 |
| 큐 | SQS, DLQ | Service Bus (큐, 토픽, 데드레터, 세션) | 잠금 기간과 재전달, 세션 순서 |
| 이벤트 라우팅 | EventBridge | Event Grid | 필터링, 재시도, 전달 보장 |
| 관측 | CloudWatch, 자체 Grafana 스택 | Azure Monitor, Application Insights, Log Analytics | 비용 구조와 쿼리 언어(KQL) |
| 비밀과 권한 | Secrets Manager, IAM 역할 | Key Vault, Managed Identity, Entra ID | 코드에서 자격 증명을 빼는 방식 |
| 엣지 | CloudFront, ELB | Front Door, Application Gateway | 라우팅과 WAF 위치 |

- 흔한 오답: 이름만 바꾸면 똑같다고 말하는 것. 재전달 방식과 과금 구조가 다르다.
- 꼬리: AWS에서 옮긴다면 무엇이 가장 위험한가(권한 모델과 네트워크 경계), 멀티클라우드는 권할 건가(운영 인력 대비 이득이 분명할 때만).

## J2. Koa와 Express의 차이, Koa 코드를 받으면 무엇부터 보나 (사실형)

- 의도: Node.js 프레임워크 이해가 실제 구조 수준인지.
- 핵심 답변: 둘 다 미들웨어 체인이지만, Koa는 async 함수와 `await next()`로 하위 미들웨어가 끝난 뒤 다시 돌아와 후처리하는 양파 구조다. 요청과 응답을 하나의 `ctx`로 다루고, 코어에 라우터와 바디 파서가 없어 별도 미들웨어를 조합한다. 에러는 상단 미들웨어에서 `try { await next() } catch`로 한곳에 모을 수 있다. Express는 `next()` 호출로 넘기고 4개 인자의 에러 미들웨어로 에러를 받는다. Express 5부터는 미들웨어가 반환한 거부된 Promise도 에러 핸들러로 넘어간다.
- 흔한 오답: Koa가 Express보다 항상 빠르다고 단정하는 것. `await next()`를 빠뜨리면 하위 미들웨어 결과를 기다리지 않고 응답이 나갈 수 있다는 점을 놓치는 것.
- 먼저 볼 것: 미들웨어 등록 순서, 공통 에러 처리와 로깅 위치, 인증과 요청 검증 위치, 트랜잭션 경계.
- 꼬리: NestJS의 guard, interceptor, pipe 구분을 Koa에서는 어떻게 대체하나(명시적 미들웨어와 스키마 검증 라이브러리).

## J3. FastAPI는 써봤나, Node.js 서버와 Python 서비스를 어떻게 나누나 (갭, 설계형)

- 답변 골격: Python과 FastAPI 실무 경험은 없다고 먼저 말한다. FastAPI는 타입 힌트와 Pydantic 기반 검증, OpenAPI 스키마 자동 생성, async 처리를 제공하는 Python 웹 프레임워크라는 수준까지만 설명한다.
- 경계 설계 기준: 계약은 OpenAPI 스키마로 고정하고 버전을 관리한다. 호출하는 쪽은 타임아웃, 재시도 가능 여부, 멱등성 키를 정한다. 오래 걸리는 분석은 동기 호출 대신 작업 접수와 상태 조회로 나눈다. 두 서비스의 로그는 같은 요청 식별자로 연결한다.
- 확인 질문으로 전환: 공고의 FastAPI가 분석 서비스인지 일반 API인지, 이 포지션이 Python 코드도 소유하는지.

## J4. 운영 장애를 어떻게 분석하고 재발 방지 구조를 만드나 (설계형)

- 의도: JD 주요업무 6번. 체계와 재발 방지.
- 답변 골격: 영향 범위 파악과 공유, 복구 우선(롤백, 트래픽 차단, 기능 끄기), 재현과 원인 가설 검증, 근본 원인 수정, 영향 범위 점검, 포스트모템(타임라인, 원인, 감지가 늦은 이유, 재발 방지 조치와 담당).
- 재발 방지의 형태: 같은 원인을 코드로 막는 것(제약, 검증, 멱등성), 더 빨리 감지하는 것(사용자 영향 지표 경보), 영향을 줄이는 것(타임아웃, 격리, 단계적 배포)을 구분한다.
- 경험 연결: 디버깅은 재현, 가설, 분리 검증, 해결, 영향 점검, 회고 순서로 한다. IoT 동시 요청 정합성 문제와 조회 지연 문제를 이 순서로 풀었다(R1, R4).
- 꼬리: 원인을 못 찾았는데 복구됐다면(가설과 관측 공백을 기록하고 감지 지표를 먼저 보강), 비난 없는 회고를 어떻게 지키나.

## J5. REST API를 설계할 때 무엇을 지키나 (사실형)

- 핵심 답변: 리소스 중심 URI, HTTP 메서드 의미 보존(GET 안전, PUT과 DELETE 멱등, POST는 멱등 아님), 정확한 상태 코드, 일관된 오류 형식(RFC 9457 Problem Details), 페이지네이션(대량 이력은 커서), 버저닝, 인증과 인가, 요청 검증, 레이트 리밋.
- 흔한 오답: REST를 동사 없는 URI 규칙으로만 설명하는 것. POST 재시도가 중복을 만들지 않는다고 가정하는 것.
- 꼬리: 측정 결과 업로드처럼 네트워크가 불안정한 클라이언트의 재시도에는 Idempotency Key를 받고 같은 키의 결과를 재사용한다. 모바일 앱과 웹이 함께 쓰는 API의 하위 호환은 필드 추가만 허용하고 제거는 버전으로 분리한다.

## J6. 테스트와 CI/CD를 어떻게 개선하겠나 (설계형)

- 의도: JD 주요업무 8번, 우대 테스트 자동화.
- 답변 골격: 현재 상태 측정(배포 빈도, 배포 소요, 실패율, 복구 시간) 뒤 병목부터. 테스트는 도메인 규칙 단위 테스트, DB와 붙는 통합 테스트, 핵심 API 흐름 테스트로 나누고 PR 단계에서 빠른 것부터 실행한다. 마이그레이션은 배포와 분리해 호환 순서로 적용한다.
- 트레이드오프: 테스트를 늘리면 파이프라인이 느려진다. 느린 테스트는 병렬화하거나 야간으로 옮기되, 데이터 정합성과 인증 경로는 PR에서 막는다.
- 경험 연결: Jenkins 파이프라인 구축, GitHub Actions와 Docker 기반 CI/CD, 통합과 단위 테스트 작성 주도(부트캠프 팀 프로젝트).
- 꼬리: 테스트가 없는 레거시에 CI를 붙이는 순서(J7).

## J7. 레거시 시스템을 단계적으로 개선한 경험과 방식 (경험형, 설계형)

- 경험: 이썸테크에서 JSP와 JDBC 환경을 Spring과 MyBatis로 옮겼고, 시솔지주에서 고객사 요구에 따라 AWS 기반 서비스를 온프레미스로 마이그레이션하고 영양정보 데이터를 MongoDB에서 MySQL로 정형화했다(이력서).
- 원칙: 현재 동작을 먼저 테스트로 고정한다(특성 테스트). 한 번에 바꾸지 않고 경계 하나씩 새 구조로 우회시키며, 데이터 이전은 호환 컬럼 추가, 백필과 검증, 읽기 전환, 구 경로 제거 순서로 한다. 각 단계에 되돌리는 경계를 둔다.
- 꼬리: 바꿀 가치가 있는지 어떻게 판단하나(장애 빈도, 변경 비용, 온보딩 비용을 측정), 개선을 제안했는데 우선순위에서 밀리면(비용과 위험을 같은 표로 비교해 결정권자에게 요청).

## J8. Kubernetes를 운영해 봤나, 언제 도입해야 하나 (갭, 설계형)

- 답변: Kubernetes 운영 경험은 없고 ECS Fargate까지 운영했다고 먼저 말한다. 도입 판단은 워크로드 수와 종류(API, 배치, 분석 서비스 혼재), 트래픽 라우팅 요구, 이식성 요구, 운영 인력으로 한다. 이 조건이 약하면 관리형 컨테이너 서비스가 운영 부담을 줄인다.
- 전이 가능한 개념: 헬스체크와 롤링 배포, 리소스 요청과 제한, 종료 신호 처리, 비밀 주입, 오토스케일 기준.
- 꼬리: AKS를 쓰고 있다면 입사 후 무엇부터 보나(배포 매니페스트와 리소스 설정, 헬스체크, 관측 연결).

## 출처

- [Koa, Cascading](https://koajs.com/#cascading)
- [Express, Error handling](https://expressjs.com/en/guide/error-handling.html)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [RFC 9457: Problem Details for HTTP APIs — RFC Editor](https://www.rfc-editor.org/rfc/rfc9457.html)
- [Microsoft Learn, Azure for AWS professionals](https://learn.microsoft.com/en-us/azure/architecture/aws-professional/)
