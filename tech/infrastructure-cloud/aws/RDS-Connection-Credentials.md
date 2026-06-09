---
tags: [infrastructure, aws, rds, database, security, credentials, nestjs]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS Connection", "RDS 연결", "RDS 자격증명", "RDS Secrets Manager", "IAM DB Auth"]
---

# RDS 앱 연결과 자격증명

> 상위 문서: [[RDS-Aurora|RDS / Aurora 관리형 DB]]

RDS는 결국 **엔드포인트 + 포트가 주어지는 평범한 DB**다. 애플리케이션 입장에서 로컬 DB와 다른 점은 세 가지뿐이다. 전송 구간 보안(SSL), 자격증명을 어떻게 안전하게 주입하나, 그리고 네트워크 경로(어느 VPC/SG에서 닿나). 운영 자동화 기능은 [[RDS-Aurora]], 네트워크 방화벽 설계는 [[RDS-Security-Group]]에 있고, 이 문서는 그 사이의 "앱에서 붙는 실무"를 다룬다.

## 연결 — host만 엔드포인트로 바꾸면 된다

평소 로컬 연결에서 host만 RDS 엔드포인트로 바꾸면 끝이다. 전송 구간은 SSL/TLS로 암호화하는 게 권장이다.

```typescript
// TypeORM (NestJS)
TypeOrmModule.forRoot({
  type: 'mysql',
  host: process.env.DB_HOST,        // mydb.xxxx.ap-northeast-2.rds.amazonaws.com
  port: 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true },// RDS CA로 서버 인증서 검증
});
```

```bash
# Prisma — DATABASE_URL의 host만 RDS 엔드포인트로
DATABASE_URL="mysql://user:pass@mydb.xxxx.ap-northeast-2.rds.amazonaws.com:3306/dbname?sslaccept=strict"
```

`rejectUnauthorized: true`나 `sslaccept=strict`는 RDS 서버 인증서를 실제로 검증하겠다는 뜻이다. 검증을 켜면 중간자 공격을 막지만, RDS 글로벌/리전 CA 번들(`rds-ca-rsa2048-g1` 등)을 신뢰 저장소에 넣어줘야 한다. CA를 안 넣고 끄면(`rejectUnauthorized: false`) 암호화는 되지만 인증서 검증을 포기하는 것이라 권장하지 않는다.

## 자격증명 관리 — 3단계 보안 격상

비밀번호를 어디에 두느냐가 보안 수준을 가른다. 단계가 올라갈수록 평문 노출과 수동 회전 부담이 줄어든다.

| 단계 | 방식 | 장점 | 한계 |
|---|---|---|---|
| 1 | 환경변수 (`.env`, 태스크 정의) | 가장 간단 | 평문 보관, 회전 수동, 유출 시 그대로 노출 |
| 2 | **Secrets Manager** | 자동 회전, RDS 네이티브 통합, KMS 암호화 | 호출당 과금, 런타임 fetch 코드 필요 |
| 3 | **IAM 데이터베이스 인증** | 비밀번호 자체가 없음, IAM으로 일원화 | 토큰 15분 유효, 초당 새 연결 수 제한 |

- **1단계 환경변수**: 대부분 여기서 시작한다. ECS 태스크 정의나 `.env`에 박는다. 빠르지만 회전하려면 사람이 직접 바꿔야 하고, 리포지토리/로그 유출 시 그대로 털린다.
- **2단계 Secrets Manager**: 비밀번호를 Secrets Manager에 두고 RDS와 통합하면 **주기적 자동 회전**까지 맡길 수 있다. 앱은 부팅 시 시크릿을 fetch해 쓰고, 회전돼도 새 값을 다시 읽는다. KMS로 암호화되고 IAM으로 접근 제어된다. (→ [[Secrets-Manager]])
- **3단계 IAM DB 인증**: 비밀번호 대신 **IAM이 발급한 15분짜리 인증 토큰**으로 붙는다. DB에 저장된 비밀번호가 아예 없으니 유출할 비밀번호도 없고, 권한을 IAM 정책 하나로 통제한다. 단점은 토큰이 짧고(만료 전 갱신 필요) 초당 새 연결 수에 제한이 있어, **커넥션 풀로 연결을 재사용**하고 토큰을 캐싱하는 전제에서 잘 맞는다. MySQL/PostgreSQL에서 지원.

실무 권장은 최소 2단계다. 람다처럼 연결이 빈번하게 생성/소멸하면 [[RDS-Aurora|RDS Proxy]]를 끼워 IAM 인증과 커넥션 풀링을 함께 해결하는 패턴도 흔하다.

## 네트워크 접근과 연결 실패 디버깅

- **퍼블릭 액세스는 끈다**. RDS를 프라이빗 서브넷에 두고 같은 VPC 안(앱 서버, ECS 태스크, VPC 안의 람다)에서만 접근하게 한다. 외부에서 직접 붙어야 하면 배스천이나 SSM 포트 포워딩을 경유한다.
- **인바운드는 SG 참조로 연다**. IP를 박지 말고 앱 계층 SG를 소스로 참조한다. 설계는 [[RDS-Security-Group]].
- **connection timeout vs 인증 에러 구분이 디버깅의 핵심**:
  - 연결이 **timeout**으로 멈추면 거의 항상 네트워크 문제다. SG 인바운드 미허용, 서브넷 라우팅, 잘못된 AZ/VPC. 비밀번호와 무관하다.
  - **Access denied / authentication failed**는 네트워크는 뚫렸고 자격증명/권한이 틀린 것이다.
  - 이 둘을 헷갈려 비밀번호만 계속 고치면 SG 문제를 영영 못 잡는다.

## 책임 경계 — RDS가 안 해주는 것

RDS는 운영을 자동화하지만 경계가 있다. 이 경계가 책임 공유 모델이자 면접/시험 단골이다.

- **AWS가 한다**: 프로비저닝, OS와 엔진 **마이너 버전 패치 자동**(메이저 업그레이드는 보통 본인이 트리거), 자동 백업/PITR, Multi-AZ failover, 모니터링 인프라.
- **내가 한다**: 스키마 설계, 인덱스, 쿼리 튜닝, **파라미터 그룹** 설정, 커넥션 풀 사이징, 용량/비용 결정. 성능 문제의 대부분은 이쪽이다.
- **OS 레벨 SSH 접근은 불가**다. EC2에 직접 깐 DB와 가장 다른 점. OS나 에이전트 설치가 꼭 필요하면 **RDS Custom**(Oracle, SQL Server)이 호스트 접근을 일부 열어주는 예외다. 일반 워크로드에선 쓸 일이 없다.

## 비용 과금 항목

RDS 요금은 대략 다섯 축으로 쌓인다. 단가는 리전/인스턴스 타입마다 다르고 자주 바뀌므로 숫자는 요금 계산기로 확인한다.

- **인스턴스 가동 시간**: 클래스(`db.r6g` 등) × 시간. 가장 큰 비중. **예약 인스턴스/Savings Plans**로 절감.
- **스토리지 용량**: 할당 GB. gp3가 gp2보다 IOPS 분리 과금으로 보통 유리.
- **I/O**: 스토리지 타입에 따라 별도 과금(io1/io2의 프로비저닝 IOPS 등).
- **백업 스토리지**: DB 크기까지는 무료, **초과분만 과금**. 수동 스냅샷을 방치하면 누적된다.
- **데이터 전송**: 특히 **cross-AZ/cross-Region 전송비**. 앱과 DB를 같은 AZ에 두면 cross-AZ 전송비와 지연을 동시에 줄인다(단 가용성과 트레이드오프).

## 면접 체크포인트

- 앱에서 RDS 붙을 때 로컬과 다른 세 가지: SSL, 자격증명 주입, 네트워크 경로
- 자격증명 3단계와 왜 올라가는가: 환경변수 → Secrets Manager(자동 회전) → IAM DB 인증(비밀번호 없음)
- IAM DB 인증의 제약(15분 토큰, 초당 연결 수)과 커넥션 풀/RDS Proxy 전제
- connection timeout(네트워크/SG)과 auth 에러(자격증명)를 구분하는 디버깅 감각
- 책임 경계: AWS가 패치/백업/HA, 내가 스키마/인덱스/쿼리/파라미터. SSH 불가와 RDS Custom 예외
- 비용 다섯 축과 cross-AZ 전송비 회피

## 출처

- [Amazon RDS User Guide — Connecting, IAM database authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)
- [Using SSL/TLS to encrypt a connection to a DB instance — AWS 공식 문서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)

## 관련 문서

- [[RDS-Aurora|RDS / Aurora 관리형 DB]]
- [[RDS-Security-Group|RDS Security Group 구성]]
- [[RDS-Monitoring|RDS 모니터링]]
- [[Secrets-Manager|Secrets Manager]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[IAM|IAM]]
