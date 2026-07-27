---
tags: [testing, integration-test, localstack, aws, docker-compose, ci]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["LocalStack Integration Test", "LocalStack 통합 테스트", "AWS 통합 테스트"]
---

# LocalStack, AWS 통합 테스트

LocalStack은 AWS REST API 스펙을 흉내 내는 모킹 HTTP 서버를 도커 컨테이너로 띄워 주는 프레임워크다. S3, SQS, SNS, SES, DynamoDB, Lambda 같은 AWS 서비스를 로컬에서 실제 API와 동일한 인터페이스로 호출할 수 있어, AWS 의존 코드를 실제 계정 없이 통합 테스트한다. 핵심 가치는 실 환경에 가까운 검증을 비용, 보안, 격리 부담 없이 얻는 것.

## 왜 실제 AWS로 통합 테스트하면 안 되나

| 문제 | 내용 |
|---|---|
| **비용** | 하루 수십 번 테스트마다 실제 리소스(S3 PutObject, SES 발송 등) 호출 → 누적 과금 |
| **보안** | 개발자, CI마다 실제 `secret access key` 배포 필요 → 키 유출면 확대 |
| **격리** | 공유 계정의 SQS 큐, S3 버킷을 여러 테스트가 동시에 만지면 메시지 간섭, 타이밍 이슈로 비결정적(flaky) |

LocalStack은 더미 자격증명(`accessKeyId: "test"`)만으로 동작하고, 컨테이너가 매번 깨끗한 상태에서 출발해 위 셋을 한 번에 해소한다.

## LocalStack의 동작 모델

- 모든 서비스가 **단일 엔드포인트 `4566` 포트**로 통합된다. SDK의 `endpoint`만 `http://localhost:4566`으로 바꾸면 호출 대상이 LocalStack으로 라우팅된다.
- `awslocal`은 AWS CLI 래퍼로, `--endpoint-url`을 자동으로 LocalStack에 박아 준다. `awslocal s3 mb s3://test-bucket`처럼 평소 CLI와 동일하게 쓴다.
- 실제 AWS가 아니므로 IAM 권한 검증, 리전 의미는 느슨하다. 검증 대상은 **호출 인터페이스와 비즈니스 플로우**이지 권한 정책이 아니다.

## 실행 방식 선택: Docker Compose vs Testcontainers

| 기준 | Docker Compose | Testcontainers |
|---|---|---|
| 컨테이너 수명 | 항상 떠 있음(상시) | 테스트 수명주기에 맞춰 생성, 파괴 |
| 단건 테스트 속도 | 빠름(이미 떠 있음) | 매번 기동 → 느림 |
| 병렬 실행 | 단일 컨테이너 공유 → 격리 직접 관리 | 컨테이너별 격리, Random 포트로 병렬 자유 |
| 설정 위치 | `docker-compose.yml` 별도 파일 | 테스트 코드 안에 인프라 선언 |

병렬 격리가 절실하면 [[TestContainers-Integration|Testcontainers]]가 유리하다. 반대로 컨테이너를 상시 띄워 두고 단건 반복 속도, 개발 생산성을 우선하면 Docker Compose가 단순하다. LocalStack 자체는 두 방식 모두 지원하므로 선택은 격리 요구와 속도 트레이드오프의 문제다.

## Docker Compose 구성

```yaml
version: "3.9"
services:
  localstack:
    image: localstack/localstack
    container_name: localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=ses,s3      # 필요한 서비스만 (전체 기동은 느림)
    volumes:
      - "./localstack-init:/etc/localstack/init/ready.d"
```

- `SERVICES`로 띄울 서비스를 좁힌다. 전체 서비스 기동은 시작 시간을 늘린다.
- 볼륨 마운트한 초기화 스크립트를 LocalStack이 준비 완료 시점에 자동 실행한다.

### 초기화 스크립트 (init.sh)

```sh
#!/bin/sh
echo "Init localstack"
awslocal s3 mb s3://test-bucket
awslocal ses verify-email-identity --email-address test@email.com
```

테스트가 전제로 하는 리소스(버킷 생성, SES 발신자 검증 등)를 미리 만들어 둔다.

### 초기화 훅 경로 (버전 주의)

| 경로 | 상태 |
|---|---|
| `/docker-entrypoint-initaws.d` | 구버전 방식. **LocalStack v2.0에서 제거(deprecated)** |
| `/etc/localstack/init/{boot,start,ready,shutdown}.d` | 현행 방식. 4개 생명주기 단계(BOOT, START, READY, SHUTDOWN) 훅 |

`ready.d`가 과거 `docker-entrypoint-initaws.d`와 동등(준비 완료 후 실행)하다. 셸 스크립트뿐 아니라 파이썬 스크립트도 둘 수 있고, boot.d를 제외하면 LocalStack과 같은 파이썬 인터프리터에서 실행된다. 오래된 블로그 예제는 구 경로를 쓰므로 v2.0+에서는 `ready.d`로 옮겨야 한다.

## 테스트 코드 (AWS SDK v3)

```javascript
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

const client = new SESClient({
  region: "local",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
  endpoint: "http://localhost:4566",   // LocalStack으로 라우팅
});

it("등록된 발송자로 메일 전송 성공", async () => {
  const res = await client.send(new SendEmailCommand({
    Source: "test@email.com",
    Destination: { ToAddresses: ["foo@domain.com"] },
    Message: { Subject: { Data: "제목" }, Body: { Html: { Data: "내용" } } },
  }));
  expect(res.$metadata.httpStatusCode).toBe(200);
});

it("미등록 발송자는 거부", async () => {
  await expect(() => client.send(new SendEmailCommand({
    Source: "invalid@email.com", /* ... */
  }))).rejects.toThrowError("MessageRejected");
});
```

`endpoint` 오버라이드와 더미 자격증명만 실제 코드와 다르고, 나머지 호출은 운영과 동일하다. 성공 경로뿐 아니라 **예외 경로(미검증 발신자 거부)**까지 실제 AWS와 같은 에러로 검증되는 게 단순 Mock 대비 강점이다.

## 격리, 멱등성 전략

단일 LocalStack 컨테이너를 여러 테스트가 공유하므로, 한 테스트가 바꾼 상태(업로드한 객체, 큐 메시지)가 다음 테스트로 샌다. 두 축으로 막는다.

- **순차 실행**: 같은 컨테이너를 만지는 테스트는 직렬화한다. Jest 기준 `--runInBand`로 파일 내 병렬을 끈다.
- **멱등성**: 각 테스트는 자신이 필요한 상태를 직접 셋업하고, 끝나면 정리(객체 삭제, 큐 purge)해 다음 실행에 같은 결과가 나오게 한다.

서비스 단위로는 병렬, 서비스 내부는 순차로 절충해 속도를 회복한다.

```json
{
  "scripts": {
    "test:ci-service-a": "jest app/service-a --runInBand",
    "test:ci-service-b": "jest app/service-b --runInBand",
    "test:ci-all": "run-p test:ci-*"
  }
}
```

## CI 환경 주의점

로컬은 컨테이너를 상시 띄워 두지만, CI는 매 파이프라인마다 새로 기동한다. HTTP 서버가 뜬 뒤에 초기화 스크립트가 도므로, **초기화 완료를 기다린 후 테스트를 시작**해야 한다. 로그를 폴링해 완료 마커를 기다리는 패턴.

```sh
#!/bin/sh
while true; do
  if docker logs localstack 2>&1 | grep -q 'Init finished'; then break; fi
  sleep 3
done
```

기다리지 않으면 버킷, 발신자가 아직 없는 상태에서 테스트가 먼저 실행돼 비결정적으로 깨진다.

## 실전 주의

- **S3 path-style**: SDK v3 + LocalStack 조합에서 가상 호스트 스타일 URL(`bucket.s3...`)이 로컬 도메인으로 안 풀려 실패하는 경우가 잦다. 클라이언트에 `forcePathStyle: true`를 줘 경로 스타일(`localhost:4566/bucket`)로 강제한다.
- **서비스별 미지원 기능**: LocalStack은 AWS의 모든 API를 1:1로 구현하지 않는다. 예로 2021~2022 시점 SES는 **API v2 미지원**이라, v2 SDK가 받는 404를 JSON으로 파싱하려다 깨졌다. v1 경로를 쓰는 식의 우회가 필요했다. 채택 전 해당 서비스의 지원 범위 확인이 필수.
- **리전, 자격증명 더미**: 검증 대상이 IAM, 리전 라우팅이 아니라면 더미 값으로 충분하다. 권한 정책 자체를 검증하고 싶다면 LocalStack의 한계를 인지하고 별도 수단을 쓴다.

## 면접 체크포인트

- 실제 AWS로 통합 테스트할 때의 비용, 보안, 격리 문제와 LocalStack이 각각을 어떻게 해소하는지
- Docker Compose와 Testcontainers의 트레이드오프(상시 기동 속도 vs 병렬 격리)
- 단일 컨테이너 공유 시 멱등성 확보 방법(순차 실행 + 테스트별 셋업, 정리)
- CI에서 초기화 완료를 기다리지 않으면 생기는 flaky 문제
- LocalStack이 검증해 주는 것(API 인터페이스, 플로우)과 못 하는 것(IAM 정책, 미구현 API)의 경계

## 출처
- [LocalStack을 활용한 AWS 통합테스트 — 인프랩 기술블로그](https://tech.inflab.com/202202-integration-test-with-localstack/)
- [Initialization Hooks — LocalStack Docs](https://docs.localstack.cloud/aws/capabilities/config/initialization-hooks/)

## 관련 문서
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Test-Isolation|Test Isolation]]
- [[Test-Fixture|Test Fixture 전략]]
- [[Test-Pyramid|Practical Test Pyramid]]
- [[Mock-Testing-Strategy|Mock 테스트 설계 전략]]
- [[Docker-Compose|Docker Compose]]
- [[AWS서비스(AWSServices)|AWS 서비스]]
