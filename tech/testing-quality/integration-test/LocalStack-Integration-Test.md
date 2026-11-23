---
tags: [testing, integration-test, localstack, aws-emulator, aws, docker-compose, ci]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["LocalStack Integration Test", "LocalStack 통합 테스트", "AWS 통합 테스트"]
---

# LocalStack, AWS 통합 테스트

LocalStack은 AWS REST API 스펙을 흉내 내는 모킹 HTTP 서버를 도커 컨테이너로 띄워 주는 프레임워크다. S3, SQS, SNS, SES, DynamoDB, Lambda 같은 AWS 서비스를 로컬에서 실제 API와 동일한 인터페이스로 호출할 수 있어, AWS 의존 코드를 실제 계정 없이 통합 테스트한다. 핵심 가치는 실 환경에 가까운 검증을 실제 AWS 호출의 비용, 키 배포, 격리 부담 없이 얻는 것. LocalStack 라이선스와 토큰 관리 비용은 별도다(2026-03 전환 이후).

## 왜 실제 AWS로 통합 테스트하면 안 되나

| 문제 | 내용 |
|---|---|
| **비용** | 하루 수십 번 테스트마다 실제 리소스(S3 PutObject, SES 발송 등) 호출 → 누적 과금 |
| **보안** | 개발자, CI마다 실제 `secret access key` 배포 필요 → 키 유출면 확대 |
| **격리** | 공유 계정의 SQS 큐, S3 버킷을 여러 테스트가 동시에 만지면 메시지 간섭, 타이밍 이슈로 비결정적(flaky) |

LocalStack에 보내는 AWS 자격증명은 더미 값(`accessKeyId: "test"`)이면 되고, 컨테이너가 매번 깨끗한 상태에서 출발해 위 셋을 한 번에 해소한다. 다만 이는 AWS 자격증명 이야기이며, 2026-03-23 이후 `latest` 이미지는 컨테이너 시작에 LocalStack 자체의 auth token을 따로 요구한다([[#2026-03 이후 인증 토큰과 라이선스|아래 절]]).

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
services:
  localstack:
    image: localstack/localstack
    container_name: localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=ses,s3      # 이 두 서비스만 사용하도록 제한
    volumes:
      - "./localstack-init:/etc/localstack/init/ready.d"
```

- `SERVICES`는 나열한 서비스만 load하고 나머지 서비스 사용을 막는 제한 옵션이다. 서비스는 기본적으로 첫 요청에 lazy load되므로 이 값을 생략해도 모든 서비스가 시작 시점에 뜨지는 않는다. `EAGER_SERVICE_LOADING=1`을 켜면 모든 서비스를 시작 시 load해 기동 시간이 늘어난다.
- 볼륨 마운트한 초기화 스크립트를 LocalStack이 준비 완료 시점에 자동 실행한다.
- 위 구성은 인증 토큰 없이 동작하던 Community 이미지 기준이다. 2026-03-23 이후 `latest`에서는 그대로 뜨지 않으므로 아래 절에서 토큰 설정이나 버전 고정을 먼저 정한다.

### 2026-03 이후 인증 토큰과 라이선스

2026-11-24 LocalStack 공식 블로그, 문서와 요금제 페이지 기준이며 직접 실행해 확인하지 않았다.

- **이미지 통합:** 2026-03-23부터 LocalStack for AWS는 단일 이미지로 배포된다. `localstack/localstack`과 `localstack/localstack-pro`가 같은 이미지가 되고, `latest`를 받아 실행하면 계정과 auth token을 요구한다. 컨테이너 시작에 auth token이 필수인 credential이 됐고 CI도 예외가 아니다.
- **토큰 종류:** 개인용 Developer Token과 워크스페이스용 CI Auth Token이 있다. CI 파이프라인에는 CI Auth Token을 CI의 secret 저장소에 두고 `LOCALSTACK_AUTH_TOKEN` 환경 변수로 넣는다. 라이선스 서버에 닿지 못해 오프라인으로 활성화한 경우 24시간마다 다시 활성화해야 한다.
- **이전 버전 고정:** 전환 예고 글은 Community 이미지(`localstack/localstack`)의 전환 전 버전 태그를 로컬과 CI 모두에서 인증 없이 계속 실행할 수 있다고 밝힌다. 블로그의 고정 예시는 4.12이고, GitHub 릴리스 기준 전환 직전 마지막 릴리스는 v4.14.0이다(Docker Hub 태그는 대조하지 않았다). 전환 뒤 릴리스는 2026.03.0부터 연도.월.패치 형식이다. 요금제 FAQ는 Community 판이 더 이상 제품 업데이트를 받지 않는다고 밝히고, GitHub 저장소는 2026-03-23 보관 처리됐다. 고정한 이전 버전은 보안 수정을 포함한 backport를 받지 않는다. LocalStack은 고정하면 AWS와의 차이와 미패치 CVE가 쌓인다며 인증 버전(비상업은 무료 Hobby, 상업은 유료 플랜)으로 옮기라고 권하는데, 판매자의 주장이다. 실제 위험의 크기는 컨테이너가 loopback에만 묶인 테스트용인지, 공유 러너에서 도는지, 이미지 취약점 검사를 하는지에 따라 달라진다(이 문서의 판단). 위 Compose 예시의 `"4566:4566"`은 호스트 IP를 지정하지 않아 모든 호스트 주소에 게시되므로, loopback에만 묶으려면 `"127.0.0.1:4566:4566"`으로 적는다.
- **요금제와 범위:** 무료 Hobby 플랜은 비상업 용도 전용이고 에뮬레이트 서비스는 30개 이상이다. 상업용은 Base(55개 이상), Ultimate(110개 이상), Enterprise(LocalStack for AWS가 제공하는 서비스와 기능 전체)로 나뉜다. Hobby 약관이 상업 이용을 금지하므로 2026-03-23 이후의 인증 이미지를 회사 업무에 쓰려면 유료 플랜이 필요하다. 전환 전 Community 판은 Apache-2.0으로 배포됐으므로(GitHub 저장소 기준) 그 태그 고정은 이 조건 밖이다. Hobby는 사용 텔레메트리 공유를 끌 수 없다. 라이선스 문서의 서비스 표는 포함 여부만 나타내며 API 지원 수준을 뜻하지 않는다고 명시하므로, 서비스가 목록에 있어도 쓰려는 operation의 지원을 따로 확인한다.
- **판단:** 회사 프로젝트에서 LocalStack을 계속 쓸지는 라이선스 비용, CI 토큰 관리와 버전 고정의 위험을 같이 본다. 대안을 검토할 때는 아래 AWS Emulator 비교처럼 지원 서비스, 충실도와 보안 경계를 같은 기준으로 대조한다.

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

- **순차 실행(완화책)**: 컨테이너 하나를 공유한다는 제약이 강제하는 수단이지 격리 설계 자체는 아니다. Jest 기준 `--runInBand`로 병렬을 끄면 경합이 드러날 확률만 낮아지고 순서 의존과 잔여 상태는 그대로 남는다. 정공법은 워커별로 컨테이너나 리소스 네임스페이스를 나누는 것이다 ([[Test-Isolation|테스트 격리]]).
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

## AWS Emulator와 비교

AWS가 공개한 공식 로컬 에뮬레이터 AWS Emulator도 같은 용도다. 아래는 2026-11-16 공식 사용자 가이드와 저장소 기준이며 직접 설치하거나 실행하지 않았다.

| 기준 | LocalStack(위 구성) | AWS Emulator |
|---|---|---|
| 실행과 연결 | 컨테이너의 `4566` 포트, SDK `endpoint` 지정 | Linux는 RPM과 Debian 패키지, macOS와 Windows는 제공 Dockerfile로 만든 이미지. 기본 `127.0.0.1:9297`에서 받고 환경 변수로 CLI와 SDK를 연결. Rust SDK 테스트는 테스트 프로세스 안에서 인스턴스마다 상태를 따로 두는 embedded mode |
| 자격 증명 | 더미 값 | 실행마다 새 키를 만들어 `~/.aws/emulator/<port>/`에 쓰고, 기본값에서는 서명 없는 요청과 다른 키로 서명한 요청을 거부 |
| 상태와 수명 | 컨테이너가 떠 있는 동안 유지 | 메모리에만 두고 종료하면 삭제. 재시작하면 깨끗한 상태가 되고 `--idle-timeout`으로 스스로 멈추게 할 수 있다. 장시간 실행과 부하 테스트는 시험하지 않았다고 명시 |
| 리전과 계정 | 더미 리전 | 어떤 값이든 받지만 리전과 계정별로 자원을 나누지 않는다. 여러 리전은 포트를 달리한 에뮬레이터를 따로 띄운다 |

- **충실도를 수치로 공개한다:** 서비스마다 SDK로 실제 AWS의 결과, 상태와 오류를 단언하는 fidelity test를 두고 통과 수와 전체 수를 릴리스마다 공개한다. 점수는 같은 테스트 버전끼리만 비교한다. 테스트와 러너는 별도 저장소 aws-emulator-evaluation-suite(CC0-1.0)에 공개돼 있고, 각 테스트는 격리된 AWS 계정 둘 이상에서 실제 동작을 확인했다고 밝힌다. 러너는 loopback 엔드포인트만 받고 에뮬레이터가 만든 키로 서명하며 사용자의 AWS 자격 증명, 프로필과 프록시 설정을 빼고 실행한다. 이 격리 규칙으로 보면 배포된 러너 그대로는 실제 AWS를 호출해 새 동작을 기록하는 데 쓸 수 없다(README에 명시된 내용이 아닌 추론). 저장소는 AI 에이전트가 관리하는 읽기 전용이라 이슈와 PR을 받지 않는다(2026-11-24 README 기준). 구현하지 않은 operation은 HTTP 501 `NotImplemented`로 바로 실패한다. 지금은 control plane API가 가장 가깝고 data plane과 CloudFormation, Terraform, CDK 지원은 서비스마다 다르며, 대조 기준 리전은 `us-west-2`(글로벌 서비스는 `us-east-1`)다.
- **보안 판단에는 쓰지 않는다:** IAM 정책, 권한 경계, 리소스 기반 정책, KMS 키 정책과 계정이나 리전 사이의 접근을 AWS처럼 평가하지 않는다. 자기 키로 서명한 요청은 거부하지 않으므로 AWS가 거부할 요청이 통과하거나 그 반대가 될 수 있다. LocalStack의 IAM 한계와 같은 경계다.
- **실제 AWS 호출을 막는다:** `AWS_ENDPOINT_URL`이 설정되지 않으면 코드는 찾은 자격 증명으로 실제 AWS를 호출한다. 테스트를 실행하는 같은 스크립트에서 변수를 설정하고 실제 자격 증명 변수는 지운다. 함수 코드처럼 에뮬레이터가 대신 실행하는 코드는 격리되지 않고 사용자 권한으로 돈다.
- **운영 조건:** 익명 사용, 오류 텔레메트리가 기본으로 켜져 있으며 `--telemetry off`나 `EMULATOR_TELEMETRY=off`로 끈다. 보안 수정은 최신 릴리스에만 나온다.

## 면접 체크포인트

- 실제 AWS로 통합 테스트할 때의 비용, 보안, 격리 문제와 LocalStack이 각각을 어떻게 해소하는지
- Docker Compose와 Testcontainers의 트레이드오프(상시 기동 속도 vs 병렬 격리)
- 단일 컨테이너 공유라는 제약이 순차 실행을 강제하는 이유와, 순차 실행이 격리 설계를 대신하지 못하는 이유
- CI에서 초기화 완료를 기다리지 않으면 생기는 flaky 문제
- LocalStack이 검증해 주는 것(API 인터페이스, 플로우)과 못 하는 것(IAM 정책, 미구현 API)의 경계
- 2026-03 단일 이미지 전환 뒤 CI에서 토큰을 쓸지, 이전 버전에 고정할지 고를 때 생기는 비용과 보안 위험

## 출처
- [LocalStack을 활용한 AWS 통합테스트 — 인프랩 기술블로그](https://tech.inflab.com/202202-integration-test-with-localstack/)
- [LocalStack Docs, Initialization Hooks](https://docs.localstack.cloud/aws/capabilities/config/initialization-hooks/)
- [LocalStack Docs, Configuration](https://docs.localstack.cloud/aws/capabilities/config/configuration/)
- [LocalStack Docs, Auth Token](https://docs.localstack.cloud/aws/getting-started/auth-token/)
- [LocalStack Docs, LocalStack Plans](https://docs.localstack.cloud/aws/licensing/)
- [LocalStack, Pricing](https://www.localstack.cloud/pricing)
- [Announcing the LocalStack for AWS 2026.03.0 Release — LocalStack Blog](https://blog.localstack.cloud/localstack-for-aws-release-2026-03-0/)
- [The Road Ahead for LocalStack — LocalStack Blog](https://blog.localstack.cloud/the-road-ahead-for-localstack/)
- [LocalStack for AWS Is Moving to a Single Image. Here are Your Next Steps — LocalStack Blog](https://blog.localstack.cloud/localstack-single-image-next-steps/)
- [localstack/localstack — GitHub](https://github.com/localstack/localstack) — 2026-11-24 보관 상태, 라이선스와 릴리스 목록 확인
- [Docker Docs, Port publishing](https://docs.docker.com/engine/network/port-publishing/)
- [Docker Docs, Compose version top-level element](https://docs.docker.com/reference/compose-file/version-and-name/)
- [AWS Emulator User Guide, What is AWS Emulator?](https://docs.aws.amazon.com/emulator/latest/userguide/what-is-service.html)
- [AWS Emulator User Guide, Fidelity in AWS Emulator](https://docs.aws.amazon.com/emulator/latest/userguide/fidelity.html)
- [AWS Emulator User Guide, Security in AWS Emulator](https://docs.aws.amazon.com/emulator/latest/userguide/security.html)
- [aws/aws-emulator — GitHub](https://github.com/aws/aws-emulator) — 2026-11-16 실행 방식과 텔레메트리 설정 대조
- [aws/aws-emulator-evaluation-suite — GitHub](https://github.com/aws/aws-emulator-evaluation-suite)
- [AWS가 마침내 자체 AWS 에뮬레이터를 만들었다 — GeekNews](https://news.hada.io/topic?id=37001)

## 관련 문서
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Test-Isolation|Test Isolation]]
- [[Test-Fixture|Test Fixture 전략]]
- [[Test-Pyramid|Practical Test Pyramid]]
- [[Mock-Testing-Strategy|Mock 테스트 설계 전략]]
- [[Docker-Compose|Docker Compose]]
- [[AWS서비스(AWSServices)|AWS 서비스]]
