---
tags: [security, audit, logging, compliance, integrity]
status: done
verified_at: 2026-08-31
category: "보안(Security)"
aliases: ["Audit Log", "감사 로그", "감사 추적", "Audit Trail"]
---

# 감사 로그 (Audit Log)

감사 로그는 **누가 언제 무엇을 했는지를 사후에 추적하기 위한 증적**이다. 기본 목적은 책임 추적성(accountability)이며, 로그만으로 부인방지(non-repudiation)가 자동 성립하지는 않는다. 부인방지를 주장하려면 개인에 바인딩된 인증, 보호된 서명 키나 신뢰할 수 있는 timestamp, 변조를 막거나 독립 검증할 보관과 검증 절차가 함께 필요하다. 문제가 생긴 뒤에는 만들 수 없다는 점이 다른 로그와 결정적으로 다르다. 사고 조사 시점에 없는 필드, 잘려나간 구간, 지워진 레코드는 그대로 증적의 공백으로 남는다.

## 감사 로그는 운영 로그가 아니다

| 구분 | 운영(애플리케이션) 로그 | 감사 로그 |
|---|---|---|
| 목적 | 디버깅, 장애 분석, 성능 추적 | 행위 증명, 규제 대응, 내부 통제 |
| 주 독자 | 개발자, SRE | 감사인, 보안팀, 법무 |
| 유실 허용 | 샘플링과 drop 가능 | 유실이 곧 증적 상실 |
| 보존 | 비용 기준으로 수 주에서 수 개월 | 규제와 분쟁 시효에서 역산 |
| 쓰기 권한 | 서비스 계정이 자유롭게 | append-only, 삭제 권한 분리 |

같은 파이프라인에 섞으면 실패가 조용히 겹친다. 로그 폭증으로 수집기가 backpressure에 걸려 샘플링을 시작하면 감사 이벤트도 같은 비율로 잘리고, 인덱스 보존 정책을 통합하면 보존 기간이 짧은 쪽으로 수렴한다. 저장소, 보존 정책, 접근 권한을 처음부터 분리한다. 로그 폭증 대응과 카디널리티 관리 자체는 [[Incident-Detection-Logging|장애 감지와 로깅 전략]]을 따른다.

## 무엇을 남기나

전수 기록이 아니라 위험 기반 선별이다. 기준은 하나다. **되돌릴 수 없거나 나중에 분쟁이 생기는 행위인가.**

- 인증 성공과 실패, 세션 생성과 강제 종료
- 인가 거부, 권한과 역할 변경, 권한 위임과 대리 실행
- 민감 데이터 조회, 대량 조회와 export
- 설정 변경, 시크릿과 키 접근
- 관리자 작업, 사용자 계정 생성과 비활성화
- 금액, 잔액, 원장과 주문 상태 변경
- 삭제, 익명화, 데이터 보존 정책 변경

OWASP Logging Cheat Sheet도 인증 성공과 실패, 인가 실패, 사용자 관리 작업, 관리자 권한 사용, 민감 데이터 접근을 로깅 대상으로 명시한다. 이벤트 이름은 OWASP Logging Vocabulary Cheat Sheet의 카테고리(`authn`, `authz`, `privilege`, `sensitive`, `user`, `session`)처럼 고정된 어휘로 통일해 두면 알람 규칙과 조회 쿼리가 단순해진다.

## 레코드 스키마

필드명과 타입 규약은 [[Structured-Logging|구조화 로깅]]의 공통 규약을 그대로 따르고, 감사 로그는 그 위에 다음을 추가로 고정한다. 스키마 자체에 버전을 붙여 필드 추가와 의미 변경을 추적한다.

```text
schema_version : 감사 스키마 버전 (필드 의미가 바뀌면 증가)
actor          : 실행 주체 id, 인증 방식, 대리 실행이면 on_behalf_of와 실제 실행자를 분리
action         : 고정 어휘 (user.role.granted, payment.refund.issued)
target         : 자원 타입 + id (+ tenant)
occurred_at    : 행위 발생 시각 (UTC, RFC 3339)
recorded_at    : 수집 시각 (UTC) — 지연과 유실 구간 탐지용
source         : ip, user_agent, 서비스명, 환경(prod/stage)
outcome        : success | denied | error + 사유 + 적용된 policy_version
correlation    : trace_id, request_id
change         : before / after (또는 값 대신 참조 식별자)
```

- 발생 시각과 수집 시각을 분리해야 지연, 재전송과 공백 구간을 구분할 수 있다. OWASP는 서버 간 시각 동기화와 국제 표준 형식 표기를 요구한다. 로컬 타임존으로 남기면 계정과 시스템 간 대조가 무너진다.
- 성공만이 아니라 **결과를 반드시 남긴다.** outcome이 없으면 시도와 성사를 구분할 수 없고, 실패한 시도의 누적은 그 자체로 침해 탐지 신호다.
- 인가 거부를 남길 때 subject, action, resource, policy version과 결정 이유를 함께 넣는다. 정책 평가 구조(PDP/PEP)는 [[Access-Control-Models|접근 제어 모델]]을 참고한다.
- `correlation`은 요청 단위 추적 식별자와 같은 값을 쓴다 ([[Correlation-ID|Correlation ID]]).

## 어디서 남기나

| 계층 | 남기는 것 | 못 보는 것 |
|---|---|---|
| 애플리케이션 | 비즈니스 의미가 있는 행위, 승인, 금액 변경, 의도 | 앱을 우회한 직접 DB 접근, 콘솔 조작 |
| 인프라와 클라우드 | 계정, 리소스, API 호출 단위의 관리 행위 | 어떤 사용자의 어떤 업무였는지 |
| 데이터베이스 | 실제 행 변경 (트리거, CDC, DB audit plugin) | 왜 바꿨는지, 어떤 사용자 요청이었는지 |

비즈니스 의미를 아는 유일한 층은 애플리케이션이다. 인프라 계층의 API 호출 감사와 로그 파일 무결성 검증은 [[CloudTrail-Config|CloudTrail 설정]], 시크릿 접근 감사는 [[Secret-Management|시크릿 관리]]의 Vault Audit Log, 배포 파이프라인의 승인과 실행 이력은 [[Deployment-Automation-ChatOps|ChatOps 배포 자동화]]에 정리돼 있다. 엔티티 메타 필드를 자동으로 채우는 [[Spring-Data-JPA-Auditing|JPA Auditing]]은 최종 상태에 누가 마지막으로 손댔는지를 남기는 것이지 행위 이력이 아니라서 감사 로그를 대체하지 못한다.

### 트랜잭션과 감사 레코드의 원자성

업무 트랜잭션은 커밋됐는데 감사 레코드 발행이 실패하면 증적 없는 변경이 남고, 반대면 없던 일이 기록된다. 같은 트랜잭션 안에서 감사 테이블에 쓰거나 [[Transactional-Outbox|Transactional Outbox]]로 발행을 보장한다. 커밋 후 비동기로 큐에 넣는 구조는 그 사이 구간이 통째로 유실 창이다. 그리고 **감사 기록 실패 시 업무를 진행할지 막을지를 자원별로 미리 정한다.** 정하지 않으면 예외를 삼키는 코드로 수렴한다.

감사 로그는 append-only 저장이라는 점에서 [[Event-Sourcing|Event Sourcing]]과 닮았지만 목적이 다르다. 이벤트 소싱은 상태를 복원하기 위한 저장 모델이고 감사 로그는 증명하기 위한 증적이다. 이벤트 스트림을 감사 로그로 겸용하려면 보존 기간, 삭제 권한과 무결성 요구를 감사 쪽 기준으로 맞춰야 한다.

## 어떻게 보호하나

방어는 한 겹이 아니라 계층이다. 아래로 갈수록 강하고 비싸다.

1. **append-only 설계**: 애플리케이션 DB 계정에 감사 테이블의 UPDATE, DELETE 권한을 아예 부여하지 않는다. 코드 규율이 아니라 권한으로 막는다.
2. **변조 탐지**: 레코드 해시를 이전 레코드 해시와 연결한 해시 체인은 신뢰할 수 있는 checkpoint가 있을 때 중간 수정과 삭제를 드러낸다. 체인과 모든 해시를 함께 고칠 권한이 있으면 공격자는 다시 계산할 수 있고, 외부 checkpoint나 기대 sequence가 없으면 끝부분 절단도 알기 어렵다. 정기 서명이나 timestamp를 write path 밖에 보관해 anchor를 만들고, 이는 탐지이지 방지는 아니라는 점을 분리한다.
3. **불변 저장(WORM)**: 보존 기간 동안 덮어쓰기와 삭제 자체를 스토리지가 거부한다. S3 Object Lock은 compliance 모드에서 루트 사용자를 포함해 누구도 보존 기간 내 객체 버전을 삭제하거나 덮어쓸 수 없다고 명시한다. 모드 차이와 설정은 [[S3-Features-Management|S3 기능과 관리]]를 본다.
4. **권한 분리**: 관찰 대상이 관찰 기록을 지울 수 없어야 한다. 운영 권한과 감사 로그의 조회, 보존 설정 변경 권한을 다른 주체에 둔다.
5. **열람의 감사**: 감사 로그를 누가 조회했는지도 남긴다. 조사 대상이 조사 범위를 먼저 확인하는 경로를 막는다.
6. **중단 탐지**: 감사 설정 변경 이벤트에 알람을 걸고 heartbeat로 수집 중단을 감지한다. 공격자의 첫 수순은 로깅을 끄는 것이고, 조용한 공백 구간은 사후에 복구할 수 없다.

## 감사 로그와 민감정보

변경 전후 값을 남기는 순간 개인정보가 그대로 딸려 들어온다. 마스킹 위치와 기법(redaction, tokenization, allowlist)은 [[PII-Masking|PII 마스킹]]을 따르고, 감사 로그 특유의 문제만 정리하면 이렇다.

- **최소 수집**: 변경 전후 값 대신 변경된 필드 이름과 참조 식별자만 남기고, 원문이 필요하면 별도 권한으로 접근하는 저장소에 둔다.
- **삭제 요구와 보존 의무의 충돌**: 개인정보 삭제 요구를 받아도 법령이나 계약상 보존 의무가 있는 감사 기록은 지울 수 없는 경우가 있다. 감사 레코드는 식별자를 pseudonym으로 두어 주체 식별 정보만 분리 삭제할 수 있게 설계하거나, 보존 근거와 범위를 문서로 남긴다. 어느 쪽이든 법무와 함께 정한다.
- **금지 항목**: OWASP는 세션 식별자, 액세스 토큰, 비밀번호, 암호키, 결제 카드 정보를 로그에 직접 기록하지 말라고 명시한다. 감사 로그도 예외가 아니다.

## 보존과 비용

보존 기간은 비용이 아니라 **규제와 조사 요구에서 역산한다.** 적용 법령의 보존 의무, 분쟁 시효, 내부 감사 주기 중 가장 긴 것을 기준으로 잡고 그 결과를 문서에 남긴다. 계층 구조와 아카이브 메커니즘 자체는 [[Long-Term-Retention|장기 보존]]과 같다.

- hot: 최근 구간, 인시던트 대응과 알람에 필요한 즉시 조회
- archive: 저비용 불변 저장, 조회 빈도는 낮지만 요구 시 반드시 나와야 함
- 복원 경로와 검색 가능성을 정기적으로 시험한다. 보관은 했는데 특정 사용자의 특정 날짜 행위를 못 찾으면 증적으로 쓸 수 없다.

## 운영 체크포인트

- 감사 이벤트 목록을 위험 기준으로 정의하고 코드 리뷰에서 누락을 확인하는가?
- 감사 로그가 운영 로그와 다른 저장소, 다른 보존 정책, 다른 권한을 쓰는가?
- 감사 테이블이나 스트림에 UPDATE, DELETE 권한을 가진 주체를 열거할 수 있는가?
- 감사 기록 실패 시 업무를 막을지 진행할지가 자원별로 정해져 있는가?
- 로깅 중단과 감사 설정 변경에 알람이 걸려 있는가?
- 관리자 작업이 공유 계정이 아니라 개인 식별자로 남는가?
- 보존 기간의 근거와 복원 절차를 문서로 제시할 수 있는가?

## 흔한 실패

- 성공만 남기고 실패한 시도를 버려서 무차별 대입과 권한 탐색을 못 본다.
- outcome을 남기지 않아 시도와 성사를 구분하지 못한다.
- 시각을 로컬 타임존이나 서버 로컬 시계로 남겨 계정 간 대조가 불가능하다.
- 관리자 계정을 공유해 actor가 전부 같은 admin 하나다.
- 감사 로그를 앱 로그와 같은 인덱스에 넣어 보존 정책이 짧은 쪽으로 통일된다.
- 감사 기록 실패를 조용히 무시(try-catch 후 로그만)하고 업무는 그대로 커밋한다.
- 변경 전후 값에 개인정보 원문을 통째로 남겨 감사 로그가 최대 유출 표면이 된다.
- 운영자에게 감사 로그 삭제 권한이 남아 있어 통제가 자기 자신을 지키지 못한다.

## 면접 체크포인트

- 감사 로그와 운영 로그를 왜 분리하는지, 섞었을 때 무엇이 먼저 깨지는지 설명할 수 있는가
- 무엇을 감사 대상으로 고를지의 기준(되돌릴 수 없거나 분쟁이 생기는 행위)을 말할 수 있는가
- append-only, 해시 체인, WORM이 각각 방지와 탐지 중 무엇을 담당하는지 구분하는가
- 감사 로그를 지울 수 있는 주체가 누구인지 답할 수 있고 그 권한을 분리했는가
- 업무 트랜잭션과 감사 레코드의 원자성을 어떻게 보장하는지 설명할 수 있는가
- 삭제 요구권과 보존 의무가 충돌할 때의 처리 방향을 제시할 수 있는가

## 출처

- [OWASP Cheat Sheet Series, Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Cheat Sheet Series, Logging Vocabulary Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html)
- [NIST, SP 800-92 Guide to Computer Security Log Management](https://doi.org/10.6028/NIST.SP.800-92)
- [NIST, SP 800-92 Rev. 1 Cybersecurity Log Management Planning Guide (Initial Public Draft, 2023-10-11)](https://csrc.nist.gov/pubs/sp/800/92/r1/ipd)
- [NIST, SP 800-53 Rev. 5, Audit and Accountability Controls](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [AWS, Amazon S3 User Guide - Locking objects with Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-overview.html)

## 관련 문서

- [[CIA-Triad|CIA Triad와 무결성]]
- [[Access-Control-Models|접근 제어 모델과 인가 결정 로그]]
- [[Structured-Logging|구조화 로깅과 필드 규약]]
- [[PII-Masking|PII 마스킹]]
- [[Correlation-ID|Correlation ID]]
- [[Incident-Detection-Logging|장애 감지와 로깅 전략]]
- [[Long-Term-Retention|장기 보존]]
- [[CloudTrail-Config|CloudTrail 설정]]
- [[S3-Features-Management|S3 Object Lock과 WORM]]
- [[Secret-Management|시크릿 관리와 Vault Audit Log]]
- [[Deployment-Automation-ChatOps|ChatOps 배포 감사]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Event-Sourcing|Event Sourcing]]
- [[Spring-Data-JPA-Auditing|Spring Data JPA Auditing]]
- [[Payment-System-Principles|결제 시스템 원칙과 원장 추적]]
