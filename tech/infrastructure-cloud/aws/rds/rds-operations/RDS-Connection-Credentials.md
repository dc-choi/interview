---
tags: [infrastructure, aws, rds, database, security, credentials, nestjs]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS Connection", "RDS 연결", "RDS 자격증명", "RDS Secrets Manager", "IAM DB Auth"]
verified_at: 2026-07-21
---

# RDS 앱 연결과 자격증명

> 상위 문서: [[RDS-Aurora|RDS / Aurora 관리형 DB]]

RDS는 결국 **엔드포인트 + 포트가 주어지는 평범한 DB**다. 애플리케이션 입장에서 로컬 DB와 다른 점은 세 가지뿐이다. 전송 구간 보안(SSL), 자격증명을 어떻게 안전하게 주입하나, 그리고 네트워크 경로(어느 VPC/SG에서 닿나). 운영 자동화 기능은 [[RDS-Aurora]], 네트워크 방화벽 설계는 [[RDS-Security-Group]]에 있고, 이 문서는 그 사이의 "앱에서 붙는 실무"를 다룬다.

## 연결 — host만 엔드포인트로 바꾸면 된다

평소 로컬 연결에서 host만 RDS 엔드포인트로 바꾸면 끝이다. 전송 구간은 SSL/TLS로 암호화하는 게 권장이다.

```typescript
// TypeORM (NestJS)
import { readFileSync } from 'node:fs';

TypeOrmModule.forRoot({
  type: 'mysql',
  host: process.env.DB_HOST,        // mydb.xxxx.ap-northeast-2.rds.amazonaws.com
  port: 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: readFileSync(process.env.RDS_CA_BUNDLE_PATH!, 'utf8'),
    rejectUnauthorized: true,
  }, // RDS CA bundle로 서버 인증서 검증
});
```

```bash
# Prisma — DATABASE_URL의 host만 RDS 엔드포인트로
DATABASE_URL="mysql://user:pass@mydb.xxxx.ap-northeast-2.rds.amazonaws.com:3306/dbname?sslcert=/etc/ssl/certs/rds-global-bundle.pem&sslaccept=strict"
```

`rejectUnauthorized: true`나 `sslaccept=strict`는 RDS 서버 인증서를 실제로 검증하겠다는 뜻이다. 검증을 켜면 중간자 공격을 막지만, RDS 글로벌/리전 CA 번들(`rds-ca-rsa2048-g1` 등)을 신뢰 저장소에 넣어줘야 한다. CA를 안 넣고 끄면(`rejectUnauthorized: false`) 암호화는 되지만 인증서 검증을 포기하는 것이라 권장하지 않는다.

## 자격증명 관리 — 3단계 보안 격상

비밀번호를 어디에 두느냐가 보안 수준을 가른다. 단계가 올라갈수록 평문 노출과 수동 회전 부담이 줄어든다.

| 단계 | 방식 | 장점 | 한계 |
|---|---|---|---|
| 1 | 환경변수 (`.env`, 태스크 정의) | 가장 간단 | 평문 보관, 회전 수동, 유출 시 그대로 노출 |
| 2 | **Secrets Manager** | 자동 회전, RDS 네이티브 통합, KMS 암호화 | 호출당 과금, 런타임 fetch 코드 필요 |
| 3 | **IAM 데이터베이스 인증** | 애플리케이션이 장기 DB 비밀번호를 저장하지 않고 IAM 정책으로 새 연결을 인증 | 토큰은 생성 후 15분 동안 새 연결 인증에 사용 가능, 높은 새 연결 생성률과 엔진별 제약 확인 |

- **1단계 환경변수**: 대부분 여기서 시작한다. ECS 태스크 정의나 `.env`에 박는다. 빠르지만 회전하려면 사람이 직접 바꿔야 하고, 리포지토리/로그 유출 시 그대로 털린다.
- **2단계 Secrets Manager**: RDS가 master user password를 관리하도록 구성하면 RDS가 secret 생성과 회전을 관리할 수 있다. 별도 DB user의 secret은 사용자가 지원되는 rotation 전략과 Lambda 등을 구성해야 하며 저장만으로 자동 회전되지 않는다. 애플리케이션이 부팅 때 한 번 읽은 값에는 새 `AWSCURRENT`가 push되지 않으므로 런타임 retrieval, client-side cache refresh, 인증 실패 시 refresh 후 reconnect/retry 또는 안전한 restart 전략이 필요하다. secret은 KMS로 암호화되고 IAM으로 접근 제어된다. (→ [[Secrets-Manager]])
- **3단계 IAM DB 인증**: 비밀번호 대신 IAM이 생성한 인증 토큰으로 **새 연결을 수립**한다. 토큰은 생성 후 15분 동안 연결 인증에 사용할 수 있지만, 이미 수립된 세션은 토큰 만료 때문에 종료되거나 토큰을 갱신할 필요가 없다. 표준 비밀번호 인증을 반드시 제거하는 기능도 아니므로 DB 사용자와 엔진 설정에 따라 병행될 수 있다. 높은 새 연결 생성률에는 메모리, 스로틀링과 엔진별 제약이 있으므로 **커넥션 풀로 연결을 재사용**하고 필요하면 RDS Proxy를 검토한다. 지원 엔진과 버전을 확인한다.

실무 권장은 최소 2단계다. 람다처럼 연결이 빈번하게 생성/소멸하면 [[RDS-Aurora|RDS Proxy]]를 끼워 IAM 인증과 커넥션 풀링을 함께 해결하는 패턴도 흔하다.

## 네트워크 접근과 연결 실패 디버깅

- **퍼블릭 액세스는 끈다**. RDS를 프라이빗 서브넷에 두고 같은 VPC 안(앱 서버, ECS 태스크, VPC 안의 람다)에서만 접근하게 한다. 외부에서 직접 붙어야 하면 배스천이나 SSM 포트 포워딩을 경유한다.
- **인바운드는 SG 참조로 연다**. IP를 박지 말고 앱 계층 SG를 소스로 참조한다. 설계는 [[RDS-Security-Group]].
- **connection timeout vs 인증 에러 구분이 디버깅의 핵심**:
  - 연결 **timeout**이면 먼저 DNS, SG, NACL, 라우팅과 VPC 경로를 확인한다. 다만 서버 과부하, 연결 백로그, 프록시나 TLS 협상 문제도 timeout으로 나타날 수 있어 네트워크만으로 단정하지 않는다. 일반적인 자격증명 오류는 명시적인 인증 실패 응답으로 구분된다.
  - **Access denied / authentication failed**는 네트워크는 뚫렸고 자격증명/권한이 틀린 것이다.
  - 이 둘을 헷갈려 비밀번호만 계속 고치면 SG 문제를 영영 못 잡는다.

## 책임 경계 — RDS가 안 해주는 것

RDS는 운영을 자동화하지만 경계가 있다. 이 경계가 책임 공유 모델이자 면접/시험 단골이다.

- **AWS가 제공하고 구성 후 운영하는 것**: 프로비저닝, OS 유지보수, 설정한 백업과 Multi-AZ failover 메커니즘, 모니터링 인프라. 마이너 엔진 자동 업그레이드는 `Auto minor version upgrade` 활성화, 대상 버전 eligibility와 maintenance 정책이 전제이며 보안 또는 지원 종료에 따른 강제 업그레이드 예외가 있다. DB instance의 자동 백업과 PITR도 사용자가 0이 아닌 retention을 설정해야 한다.
- **내가 한다**: 스키마 설계, 인덱스, 쿼리 튜닝, **파라미터 그룹** 설정, 커넥션 풀 사이징, 용량/비용 결정. 성능 문제의 대부분은 이쪽이다.
- 일반 RDS는 OS 레벨 SSH 접근을 제공하지 않는다. 호스트 운영 접근이 필요한 지원 시나리오에는 RDS Custom for SQL Server를 검토할 수 있다. RDS Custom for Oracle은 2027-03-31 지원 종료가 공지됐으므로 신규 선택을 피하고 AWS migration 안내를 확인한다. 엔진, 버전별 RDS Custom 지원과 shared-responsibility 요구를 현재 문서에서 확인한다.

## 비용 과금 항목

RDS 요금은 대략 다섯 축으로 쌓인다. 단가는 리전/인스턴스 타입마다 다르고 자주 바뀌므로 숫자는 요금 계산기로 확인한다.

- **인스턴스 가동 시간**: 클래스(`db.r6g` 등) × 시간. 약정 할인을 쓸 때는 엔진, 클래스 등 특정 구성에 묶이는 RDS Reserved Instance와 1년 시간당 사용 약정으로 eligible RDS/Aurora 사용량에 적용되는 Database Savings Plans를 비교한다. 대상, 유연성, 기간과 할인율이 다르며 같은 사용량에 두 할인이 중복 적용되지는 않는다.
- **스토리지 용량**: 할당 GB. gp3와 gp2의 기본 성능, 프로비저닝 IOPS, 용량과 리전 단가를 실제 워크로드로 비교.
- **I/O**: 스토리지 타입에 따라 별도 과금(io1/io2의 프로비저닝 IOPS 등).
- **백업 스토리지**: 일반적인 무료 허용량은 리전 내 실행 중 RDS DB instance의 합산 provisioned storage를 기준으로 계산한다. 삭제 또는 장기 중지된 instance의 백업, cross-Region 복사, 허용량 초과분과 엔진별 예외는 현재 RDS 요금과 백업 문서를 확인한다. 수동 스냅샷도 보존하는 동안 사용량이 누적된다.
- **데이터 전송**: 특히 **cross-AZ/cross-Region 전송비**. 앱과 DB를 같은 AZ에 두면 cross-AZ 전송비와 지연을 동시에 줄인다(단 가용성과 트레이드오프).

## 면접 체크포인트

- 앱에서 RDS 붙을 때 로컬과 다른 세 가지: SSL, 자격증명 주입, 네트워크 경로
- 자격증명 경로의 tradeoff: 환경변수 → Secrets Manager(구성한 rotation과 runtime refresh 필요) → IAM DB 인증(앱의 장기 비밀번호 저장 제거, password auth 병행 가능)
- IAM DB 인증 토큰은 생성 후 15분 동안 새 연결 인증에 사용하며 기존 session에는 갱신 불필요. 높은 새 연결률에서는 커넥션 풀과 RDS Proxy 검토
- connection timeout(네트워크/SG)과 auth 에러(자격증명)를 구분하는 디버깅 감각
- 책임 경계: AWS가 구성된 maintenance, backup과 Multi-AZ 메커니즘을 운영하고, 사용자가 auto-minor eligibility, backup retention, Multi-AZ와 스키마/쿼리/파라미터를 선택. 일반 RDS host 접근 제한과 RDS Custom engine lifecycle 예외
- 비용 다섯 축과 cross-AZ 전송비 회피

## 출처

- [Amazon RDS User Guide — Connecting, IAM database authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)
- [Using SSL/TLS to encrypt a connection to a DB instance — AWS 공식 문서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)
- [RDS DB engine 업그레이드](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Upgrading.html)
- [자동 백업 retention](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html)
- [RDS backup storage 요금 조건](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.Retaining.html)
- [Database Savings Plans 요금](https://aws.amazon.com/savingsplans/database-pricing/)
- [Amazon RDS 요금](https://aws.amazon.com/rds/pricing/)
- [RDS Custom engine lifecycle](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-cev.html)
- [Secrets Manager 모범 사례와 client-side cache](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [RDS managed master credentials](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html)

## 관련 문서

- [[RDS-Aurora|RDS / Aurora 관리형 DB]]
- [[RDS-Security-Group|RDS Security Group 구성]]
- [[RDS-Monitoring|RDS 모니터링]]
- [[Secrets-Manager|Secrets Manager]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[IAM|IAM]]
