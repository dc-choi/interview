---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# PostgreSQL, SQL Server와 Oracle CDC

세 source의 batch/증분과 CDC는 서로 다른 설정이다. CDC를 켜는 SQL은 원본 database의 운영 상태를 바꾸므로 아래는 공개 계약의 정리이며 실제 명령을 실행한 기록이 아니다.

## PostgreSQL

기본 TLS는 verify-full이며 사용자/password와 신뢰할 CA를 맞춘다. 공개 문서의 JDBC 42 및 서버 8.2 이상 호환 주장은 확인일 기준으로 읽고 실제 driver/server 조합을 확인한다. RDS 2019 CA 예시는 현재 권장 CA임을 뜻하지 않으므로 적용 때 갱신된 인증서를 확인한다.

Beta CDC는 logical replication slot과 publication을 source당 하나씩 사용한다. 한 source에서 여러 table을 읽을 수 있지만 다른 slot/publication이 필요하면 source를 분리한다. 자동 생성에는 CREATE/REPLICATION 등 추가 권한과 읽기 SELECT가 필요하다. exploration에는 작동 중인 runtime 조건을 확인한다.

## Microsoft SQL Server

사용자/password, Microsoft Entra Password, MSI와 service principal 모드를 구별한다. Entra Password를 NTLM/Kerberos로 해석하지 않는다. NTLM은 custom JDBC 경로를 검토한다.

기본 `encrypt=true`, `trustServerCertificate=false`이며 일반 port는 1433이다. Azure Redirect는 연결 후 다른 IP/11000~11999 경로를 쓸 수 있다. 넓은 allowlist를 자동 추가하기보다 Azure Proxy 모드와 네트워크 요구를 확인한다.

CDC는 database와 각 table에서 켜고 CDC schema에 대한 실행/읽기 권한을 맞춘다. source 설정만으로 원본 CDC 활성화가 완료되지는 않는다.

## Oracle Database

문서는 JDBC 21.x에 Oracle 12.1 이상을 요구한다. 더 오래된 서버는 custom driver 호환을 검토한다. 기본 TLS true, port 1521이며 SID와 service name은 대체 가능한 필드가 아니다.

Debezium CDC는 ARCHIVELOG, database/table supplemental logging과 LogMiner, catalog view 권한을 요구한다. archive/listener/alert 로그와 log history를 함께 진단한다. 로그 전환이 너무 드물면 ARCHIVE_LAG_TARGET 같은 원본 설정이 관련될 수 있지만 변경 전 원본 DBA 검토가 필요하다.

Oracle virtual table의 Foundry worker/password 조건은 CDC credential과 별도로 확인한다.

## Db2와 Redshift의 별도 조건

Db2 CDC도 Debezium과 runtime 구성을 확인한다. Db2 table export의 journaling은 IBM i/AS400에 필요하며 z/OS/LUW에도 같은 전제라고 확대하지 않는다.

Redshift는 endpoint, database, 사용자/password와 port 기본 5439를 지정한다. cloud identity assume-role에는 target IAM role 권한과 신뢰 정책이 필요하다. table export batch 기본 1,000, 최대 100,000은 Redshift 전용 계약이다.

## 출처

- [Palantir, postgresql](https://www.palantir.com/docs/foundry/available-connectors/postgresql)
- [Palantir, microsoft-sql-server](https://www.palantir.com/docs/foundry/available-connectors/microsoft-sql-server)
- [Palantir, oracle](https://www.palantir.com/docs/foundry/available-connectors/oracle)
- [Palantir, db2](https://www.palantir.com/docs/foundry/available-connectors/db2)
- [Palantir, aws-redshift](https://www.palantir.com/docs/foundry/available-connectors/aws-redshift)

## 관련 문서

- [[Palantir-Connector-Contracts]]
