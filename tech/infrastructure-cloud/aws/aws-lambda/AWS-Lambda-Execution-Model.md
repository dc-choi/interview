---
tags: [aws, lambda, serverless, faas, cold-start, provisioned-concurrency]
status: done
category: "Infrastructure - AWS"
aliases: ["Lambda 실행 모델", "Lambda Cold Start"]
---

# Lambda 실행 모델 — 수명주기, Cold Start, 스펙, 구성요소

## 핵심 명제

- **서버 없음 아님 → 서버 관리 없음** — 물리 서버는 있지만 개발자가 관여하지 않음
- **코드가 곧 함수 단위** — 요청-응답 사이클 하나를 처리하는 짧은 함수
- **이벤트 구동** — API Gateway, S3, SQS, DynamoDB Stream, EventBridge 같은 **트리거**가 있어야 실행
- **동시 실행 = 인스턴스 수** — 요청 1개당 **인스턴스 1개**가 전담, 함수 내부에서 여러 요청을 섞지 않음(단일 실행 모델)
- **상태 비보유(Stateless)** — 호출 간 메모리 보장 없음. 상태는 외부(DynamoDB, ElastiCache, S3)로

## 실행 모델, 수명주기

1. **Init phase** — 컨테이너 준비, 런타임 로드, 글로벌 코드 실행(`handler` 밖 `import`, DB 풀 생성 등)
2. **Invoke phase** — `handler(event, context)` 실행 → 응답 반환
3. **Shutdown phase** — 유휴 상태가 길어지면 AWS가 정리

"컨테이너"라 부르는 micro-VM(firecracker)을 재사용하는 동안은 **warm**, 새로 뜨는 순간은 **cold**.

### Cold Start

- **원인**: 새 micro-VM 부팅 + 런타임 로드 + 초기화 코드 실행
- **체감**: Node.js, Python 100~300ms, Java, .NET 1~5초
- **완화 방법**:
  - **Provisioned Concurrency** — 미리 warm 인스턴스 유지(비용 증가)
  - **SnapStart**(Java) — JVM 스냅샷으로 시작 시간 단축
  - **작은 패키지** — 의존성, 코드 크기 최소화
  - **Init 코드 최소화** — 무거운 초기화는 LazyLoad
  - **주기적 ping**으로 warm 유지 — 공식 권장은 아니나 관행

## 제약과 스펙

| 항목 | 한도 |
|---|---|
| 최대 실행 시간 | 15분 (900초) |
| 메모리 | 128MB ~ 10,240MB (CPU는 메모리에 비례) |
| 배포 패키지 | 압축 50MB, 비압축 250MB / 컨테이너 이미지 10GB |
| 임시 디스크 `/tmp` | 512MB~10,240MB 설정 |
| 리전당 동시 실행 | 기본 1,000 (증설 신청 가능) |
| 환경변수 크기 | 4KB |

## Function 구성요소

함수(Function)는 코드 실행을 위해 호출되는 최소 단위 리소스. 다음 4가지로 구성된다.

- **함수 코드** — 실제 실행되는 핸들러. Runtime(Node.js, Python, Java, Go, Ruby, .NET, Custom), IAM 실행 역할, VPC 설정, 메모리 등을 함께 지정
- **계층 (Layer)** — 의존성, 공통 라이브러리, 런타임 확장을 별도 zip으로 분리. 함수당 최대 5개. 패키지 크기 압박 완화, 버전 공유
- **트리거** — 함수를 발동시키는 이벤트 소스 (아래)
- **전달 대상 (Destinations)** — 비동기 호출 결과를 후속 서비스로 전달
