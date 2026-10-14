---
tags: [security, secrets, credentials, aws, least-privilege, incident, guardduty]
status: done
verified_at: 2026-10-14
category: "보안(Security)"
aliases: ["Hardcoded Credentials", "하드코딩된 자격증명", "접속키 하드코딩", "CWE-798", "클라우드 접속키 탈취"]
---

# 하드코딩된 자격증명 — 소스 접근이 운영 접근이 되는 경로

소스 코드, 설정 파일, 스크립트 안에 클라우드 접속키, DB 비밀번호, 토큰 같은 자격증명을 평문으로 박아 두는 결함이다 (CWE-798). 코드는 자격증명보다 훨씬 넓게 복제된다. 저장소 clone, CI 캐시, 개발자 노트북, 메신저에 붙여 넣은 조각까지 전부 사본이므로, 코드를 읽을 수 있는 사람과 시스템은 누구나 그 키가 가리키는 운영 자원에 닿는다. [[API-Key-Exposure|연동 키 노출]]이 키 하나의 권한 범위 문제라면, 하드코딩은 키가 놓인 위치 때문에 노출 확률 자체가 1에 가까워지는 문제다.

## 멘탈 모델 — 저장소가 크레덴셜 금고와 같은 등급이 된다

하드코딩된 키가 하나라도 있으면 그 저장소의 보호 등급은 코드가 아니라 자격증명 금고 수준이어야 한다. 실제로는 저장소가 개발 편의를 위해 넓게 열려 있으므로, 공격자는 가장 약한 개발 계정 하나만 잡으면 된다.

- 개발 환경 접속 = 소스 열람 = 운영 키 획득 = 운영 인프라 접근. 단계마다 별도 방어선이 없으면 한 계정의 탈취가 전체 침해와 같아진다.
- 저장소에 한 번 커밋된 키는 히스토리에 남는다. 최신 커밋에서 지워도 유출로 취급하고 회전해야 한다. → [[Secret-Management|시크릿 관리]]의 Git 평문 누출 지점

## 피해를 키우는 증폭 요인

하드코딩 자체보다 아래 조건이 겹칠 때 사고 규모가 결정된다.

| 증폭 요인 | 효과 |
|---|---|
| 유효기간 없는 장기 정적 키 | 탈취 시점과 사용 시점 사이의 창이 무한대가 된다 |
| 개발자 전원이 전체 프로젝트에 접근 | 권한 분리가 없어 계정 하나가 전체 저장소, 전체 키로 이어진다 |
| 메신저, 위키로 자격증명 공유 | 유출 표면이 메신저 계정, 백업, 검색 인덱스로 증식한다 |
| 암호문과 암호화 키를 같은 경계에 저장 | 같은 침해로 둘 다 나가면 암호화는 방어가 아니다 |
| 짧은 접속 로그 보존 | 침해 범위 산정 자체가 불가능해지고 신고와 통지가 늦어진다 |
| 진단 결과의 미조치 | 모의해킹이 하드코딩을 찾아도 조치 추적이 없으면 리스크 문서화에 그친다 |
| 개발 인력 대비 극소수의 보안 전담 | 통제가 운영이 아니라 이벤트가 된다 |

## 방어 통제

### 예방 — 키가 코드에 들어가지 못하게

- 시크릿 스캐닝을 pre-commit과 CI에 붙인다. 단, 이는 신규 커밋만 막는다. 이미 박힌 키는 히스토리 전체 스캔과 일괄 회전을 따로 수행해야 제거된다.
- 자격증명을 코드와 설정에서 분리해 런타임에 주입한다. 저장과 주입 계층은 [[Secret-Management|시크릿 관리]]가 다룬다.
- 클라우드 접근은 장기 액세스 키 대신 역할과 임시 자격증명을 기본으로 한다. CI는 OIDC 연동 같은 단기 토큰 방식으로 키 자체를 없앤다. → [[IAM-Best-Practices|IAM 모범 사례]]

### 폭발 반경 축소 — 들어와도 멀리 못 가게

- 개발과 운영 환경을 계정과 네트워크 수준에서 분리한다. 개발 환경 키로 운영 자원에 닿을 수 없어야 한다.
- 저장소와 프로젝트 접근을 필요한 사람으로 좁힌다. 권한 분리는 공격 성공률이 아니라 성공 시 피해 범위를 통제하는 장치다.
- 키마다 만료와 자동 회전을 둔다. 탈취 자체를 막지 못해도 창을 좁힌다. → [[Refresh-Token-Rotation|토큰 로테이션]]

### 탐지와 대응 — 첫 신호에서 자격증명을 끊는다

- 대량 반출은 CPU, 네트워크 송신량, 평소와 다른 API 호출 패턴으로 드러난다. 그러나 탐지가 자격증명 무효화와 경로 차단으로 이어지지 않으면 같은 주체가 다른 키로 다시 들어온다. 이상 징후 뒤의 첫 조치는 관련 키 전체의 회전이다.
- 접속 기록 보존 기간은 사후 대응 능력의 상한이다. 침해 범위와 정보주체를 특정할 수 있을 만큼 보존한다. → [[Audit-Log|감사 로그]], [[CloudTrail-Config|CloudTrail]]
- 진단, 모의해킹 결과는 소유자와 기한이 있는 조치 항목으로 추적한다.

## 클라우드 계정 키 — 반출 밖의 피해와 리전 통제

부분 검증(2026-10-14): 이 절의 AWS 리전 규칙, GuardDuty 권고와 finding 유형, STS 리전 설정, EC2 quota 적용 단위, 예산과 비용 이상 탐지의 데이터 지연을 공식 문서와 대조했다. 실제 계정 설정을 확인한 기록은 아니며, 다른 절과 티빙 사례는 다시 대조하지 않았다.

클라우드 계정의 접속키는 데이터를 읽는 열쇠이면서 그 권한 안에서 자원을 만들고 지우는 열쇠다. 그래서 데이터 반출과 별개로 두 가지 피해가 생긴다.

- 자원 남용: 컴퓨팅 자원을 만들 수 있는 키라면 공격자가 인스턴스를 띄워 암호화폐 채굴 같은 자기 작업에 쓰고, 그 사용량은 계정의 요금으로 잡힌다. GuardDuty는 EC2 인스턴스가 암호화폐 활동과 연관된 IP 주소와 통신하거나 도메인을 조회하면 `CryptoCurrency:EC2/BitcoinTool.B`, `CryptoCurrency:EC2/BitcoinTool.B!DNS` 같은 High 등급 finding을 만든다. 채굴이나 암호화폐 관리 같은 블록체인 활동에 쓰지 않는 인스턴스에서 나온 finding이면 AWS는 침해를 가정하고 조치하라고 권한다.
- 삭제: 삭제 권한까지 가진 키라면 인스턴스, IAM 자원과 데이터 저장소를 지워 대응과 복구를 방해할 수 있다. 같은 키로 지울 수 있는 곳에만 백업이 있으면 복구 수단도 함께 사라진다. 백업 보호는 [[Backup-Restore#AWS Backup의 보존 기간과 삭제 보호|백업 보존과 삭제 보호]]를 따른다.

두 피해의 범위는 키의 권한이 정한다. 애플리케이션과 CI의 키에 업무에 필요하지 않은 컴퓨팅 자원 생성, IAM 변경과 삭제 권한을 주지 않으면 같은 유출이라도 피해가 줄어든다. → [[API-Key-Exposure|권한 범위가 곧 공격 표면]]

### 쓰지 않는 리전도 감시 대상이다

- EC2 On-Demand 인스턴스 quota는 리전마다 vCPU 수로 따로 적용되고 사용량에 따라 자동으로 늘 수 있다. 쓰지 않는 리전도 그 리전의 quota만큼 남용될 수 있으므로 quota를 비용 상한 장치로 믿지 않는다.
- AWS는 GuardDuty를 지원 리전 전체에서 켜라고 권한다. 쓰지 않는 리전의 무단 활동이나 비정상 활동도 finding으로 만들기 위해서다. 평소 쓰는 리전만 감시하면 다른 리전의 남용은 청구서나 다른 증상으로 늦게 드러날 수 있다. 계정과 리전별 적용 상태는 [[GuardDuty-Investigation#경보가 없을 때 보호 범위부터 확인한다|GuardDuty 보호 범위 확인]]으로 점검한다.
- 예산 알림과 비용 이상 탐지는 청구 데이터 지연이 있어 실시간 탐지가 아니다. 보안 finding을 대신하지 않는 보조 신호로 둔다. → [[Budget-Alert|예산 알람]], [[Cost-Anomaly|비용 이상 탐지]]

### 리전을 닫는 방법

- 2019년 3월 20일 이후 출시된 opt-in 리전은 기본 비활성이다. 켜기 전에는 IAM 데이터와 자격 증명이 그 리전에 전파되지 않아 서비스에 접근할 수 없으므로, 필요 없는 opt-in 리전은 켜지 않는다.
- 그 전에 출시된 기본 리전(서울과 버지니아 북부 포함)은 켜거나 끌 수 없다. 쓰지 않는 기본 리전은 SCP나 IAM 정책의 `aws:RequestedRegion` 조건으로 막고, 전역 서비스 예외와 적용 범위는 [[AWS-Control-Tower#리전 차단은 적용 범위와 예외를 함께 확인한다|리전 차단]]에서 확인한다.
- IAM 계정 설정의 리전별 STS 활성화는 그 리전 엔드포인트에서 임시 자격 증명을 발급할지에 관한 설정이다. AWS는 어떤 사용자와 역할이 리전에 접근할지를 `aws:RequestedRegion`으로 통제하라고 안내하므로 STS 비활성화를 리전 차단으로 쓰지 않는다.
- opt-in 리전을 다시 꺼도 IAM 접근만 막히고 이미 만든 자원은 지워지지 않으며 과금도 계속되므로, 끄기 전에 그 리전의 남은 자원을 정리한다.
- 꺼 둔 opt-in 리전과 IAM 정책의 리전 차단은 유출된 키에 `account:EnableRegion`이나 IAM 정책 변경 권한이 있으면 공격자가 되돌릴 수 있다. 애플리케이션과 CI 키에는 이 권한을 주지 않는다.

## 사례 — 하드코딩된 운영 접속키로 3954만 계정 유출

한 OTT 서비스(티빙)에서 2026년 5월 말 활성, 휴면, 탈퇴, 테스트 계정을 합쳐 약 3954만 개 계정의 정보가 유출됐다. 공격자는 개발 환경 접속키를 탈취해 개발 시스템에 들어간 뒤, 소스 코드에 하드코딩된 운영 환경 접속키 43개 중 2개로 AWS 기반 운영 인프라로 이동했다. 1차 대량 반출은 CPU 사용률 급증으로 중단됐지만, 다음 날 다른 접속키로 재시도해 약 24GB의 이용자 데이터가 반출됐다.

증폭 요인이 대부분 겹친 사례다. DB 접속 자격증명이 평문으로 저장돼 있었고, 사내 메신저로 자격증명을 공유한 정황이 확인됐으며, 개발자 전원이 전체 개발 프로젝트에 접근할 수 있었다. 접속 기록은 6일 정도만 남아 추적이 제한됐고, 정보보호 전담 인력은 개발 인력 149명 대비 4명 내외였다. 2024년 모의해킹에서 접속키 하드코딩이 이미 발견됐지만 조치되지 않았다. 일부 전화번호와 이메일은 암호화 키까지 함께 유출돼 복호화가 가능한 상태였다. 고난도 취약점이 아니라 기본 통제가 여러 단계에서 동시에 작동하지 않은 사고로 볼 수 있다.

## 사례 — 회사 AWS 계정 탈취와 늦은 인지

2019년 AWS Summit에서 한 스타트업 개발자가 공유한 사례다. 모니터링이 없던 상태에서 새벽 6시에 서비스가 멈췄고, 약 2시간 반 뒤 대표의 전화로 장애를 알았다. 콘솔에는 만든 적 없는 인스턴스들이 실행 중이었고 기존 IAM과 EC2 자원은 사라져 있었다. 공격자가 띄운 인스턴스에는 접속할 키가 없어 내부를 확인하지 못한 채 서비스를 다시 띄웠고, 장애 발생 약 4시간 20분 뒤 복구했다.

이 사례의 침입 경로는 확인되지 않는다. 발표는 신입이 접속키를 관리하는 환경에서 조직 저장소의 사본이 공개되고 그 안에 접속키가 있으면 탈취된다는 위험을 예로 들었다. 대책으로 든 리전 닫기는 서비스하지 않는 리전은 끄되 버지니아 북부는 꺼지지 않는다는 설명으로 보아 계정의 리전 설정보다 IAM 계정 설정의 리전별 STS 비활성화에 가깝다(전사문 기준이며 슬라이드는 확인하지 못했다). 계정의 리전 설정으로는 서울을 포함한 기본 리전을 끌 수 없고 STS 비활성화는 위에서 본 대로 리전 차단이 아니므로, 쓰지 않는 기본 리전은 위의 `aws:RequestedRegion` 차단으로 막는다. 보안 경보 없이 장애가 첫 신호가 된 점은 위의 탐지 공백과 같은 유형이다.

## 면접 체크포인트

- 하드코딩된 키가 왜 저장소의 보호 등급을 자격증명 금고 수준으로 끌어올리는지 설명할 수 있는가.
- 시크릿 스캐닝이 신규 커밋만 막는다는 한계와, 이미 커밋된 키의 처리 절차(히스토리 스캔, 회전)를 말할 수 있는가.
- 장기 정적 키 대신 역할과 임시 자격증명을 쓰는 이유를 폭발 반경 관점으로 설명할 수 있는가.
- 탐지 뒤 첫 조치가 왜 자격증명 회전이어야 하는지, 로그 보존 기간이 대응 능력을 어떻게 제한하는지 말할 수 있는가.
- 클라우드 접속키 유출이 데이터 반출 외에 자원 남용과 삭제로 이어지는 경로와, 쓰지 않는 리전을 감시하고 막는 방법(GuardDuty 전 리전 활성화, opt-in 리전, `aws:RequestedRegion`)을 말할 수 있는가.

## 출처

- [티빙 3954만 계정 유출…문제는 ‘해킹 기술’이 아니라 내부 통제였다 — GeekNews](https://news.hada.io/topic?id=33482)
- [티빙 3954만 계정 유출…문제는 ‘해킹 기술’이 아니라 내부 통제였다 — 데일리시큐](https://www.dailysecu.com/news/articleView.html?idxno=208329)
- [신입 개발자가 스타트업에서 AWS로 살아남는 이야기 — Amazon Web Services Korea, 조용진](https://www.youtube.com/watch?v=r6TFnNQsQLY)
- [AWS Account Management, Enable or disable AWS Regions in your account](https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html)
- [Amazon GuardDuty, Regions and endpoints](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_regions.html)
- [Amazon GuardDuty, GuardDuty EC2 finding types](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-ec2.html)
- [AWS IAM, Manage AWS STS in an AWS Region](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_enable-regions.html)
- [Amazon EC2, Instance type quotas](https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-instance-quotas.html)
- [AWS IAM, AWS STS Regions and endpoints](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_region-endpoints.html)
- [AWS Cost Management, Managing your costs with AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- [AWS Cost Management, Detecting unusual spend with AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html)

## 관련 문서

- [[Secret-Management|시크릿 관리]] — 코드와 설정에서 분리해 저장, 주입, 회수
- [[API-Key-Exposure|API 연동 키 노출과 최소 권한 스코프]] — 노출 여부와 권한 범위의 곱
- [[IAM-Best-Practices|IAM 모범 사례]] — 역할, 임시 자격증명, 최소 권한
- [[Audit-Log|감사 로그]] — 접속 기록 보존과 영향 범위 특정
- [[Incident-Runbook|장애 대응 절차]] — 이상 징후 이후의 차단과 에스컬레이션
- [[GuardDuty-Investigation|GuardDuty 경보 조사]] — 계정과 리전별 탐지 범위 확인
- [[AWS-Control-Tower|AWS Control Tower]] — 승인 리전 밖의 호출 차단과 예외
- [[Backup-Restore|백업과 복구]] — 운영 자격증명으로 지울 수 없는 백업
