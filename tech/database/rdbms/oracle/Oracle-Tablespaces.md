---
tags: [database, oracle, tablespace, datafile, storage]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Oracle Tablespaces", "Oracle 테이블스페이스"]
---

# Oracle tablespace와 공간 관리

Tablespace는 Oracle의 논리적 저장 단위이고 data file은 물리적 저장 단위다. 11g의 단일 database 중심 예제를 현재 환경에 적용할 때는 어느 container의 tablespace인지부터 확인한다.

## 저장 계층

```text
CDB
└── PDB
    └── tablespace
        └── segment (table, index 등)
            └── extent
                └── Oracle data block
```

- 하나의 permanent tablespace는 하나 이상의 data file 또는 하나의 bigfile로 구성된다.
- Table과 index 같은 저장 객체는 segment를 만들고, segment는 extent 단위로 공간을 할당받는다.
- Extent는 여러 Oracle block의 묶음이고 block은 database I/O의 논리적 기본 단위다.
- Procedure, package와 trigger는 schema object지만 일반 table/index와 같은 사용자 data segment라고 단순화하면 안 된다. 정의와 compiled code는 data dictionary가 관리한다.

## 현재 multitenant 환경

현재 Oracle은 CDB와 PDB를 구분한다. 각 PDB에는 자체 `SYSTEM`과 `SYSAUX`가 있고, temporary/user tablespace를 구성할 수 있다. Local undo mode에서는 자체 undo tablespace도 가진다.

- Application schema와 object는 일반적으로 대상 PDB의 별도 user tablespace에 둔다.
- `SYSTEM`과 `SYSAUX`는 Oracle 관리 정보를 위한 공간이며 application data의 기본 저장소로 쓰지 않는다.
- Temporary tablespace는 sort, hash와 temporary result를 위한 transient segment를 관리한다.
- Undo tablespace는 transaction consistency와 rollback에 필요한 undo record를 관리한다. 11g의 수동 rollback segment 설명을 현재 기본 운영 모델로 사용하지 않는다.

Command를 실행하기 전에 `SYS_CONTEXT('USERENV', 'CON_NAME')` 등으로 현재 container를 확인한다.

## Locally managed가 기본

현재 permanent tablespace는 locally managed 방식이 기본이다. Data file header의 bitmap으로 extent를 추적하며 `AUTOALLOCATE` 또는 `UNIFORM` 크기를 선택한다. Automatic segment space management도 일반적인 기본값이다.

11g 강의의 `DEFAULT STORAGE`, `PCTINCREASE`, free extent 수집을 신규 설계의 표준으로 옮기지 않는다. Locally managed tablespace에서는 free extent coalescing이 필요하지 않다.

## 생성과 용량 확장

경로를 직접 쓰는 방식과 Oracle Managed Files(OMF)를 쓰는 방식은 환경 구성에 따라 다르다. 다음은 OMF가 구성된 환경의 형태다.

```sql
CREATE TABLESPACE app_data
  DATAFILE SIZE 1G
  AUTOEXTEND ON NEXT 128M MAXSIZE 10G
  EXTENT MANAGEMENT LOCAL AUTOALLOCATE
  SEGMENT SPACE MANAGEMENT AUTO;
```

용량은 data file을 추가하거나 기존 file을 resize하거나 `AUTOEXTEND`를 설정해 늘릴 수 있다. 다음을 함께 관리한다.

- `AUTOEXTEND`는 무한 저장소가 아니다. `MAXSIZE`, filesystem/ASM 여유, thin provisioning과 alert threshold를 둔다.
- 작은 `NEXT` 값은 잦은 확장을, 지나치게 큰 값은 예기치 않은 공간 소비를 만들 수 있다.
- Resize로 축소할 때 file 뒤쪽에 사용 중인 block이 있으면 실패한다.
- Bigfile/smallfile, backup, recovery와 standby 전략을 확인한 뒤 file 구성을 바꾼다.

## 관측할 dictionary view

| 질문 | 대표 view |
|---|---|
| Tablespace type, status, extent 관리 | `DBA_TABLESPACES` |
| Permanent/undo data file와 autoextend | `DBA_DATA_FILES` |
| Temporary file | `DBA_TEMP_FILES` |
| Permanent tablespace free extent | `DBA_FREE_SPACE` |
| Segment별 할당량 | `DBA_SEGMENTS` |
| 여러 container를 함께 조회 | 권한이 허용된 `CDB_*` view |

Free space 한 시점만 보지 말고 성장률, autoextend 상한, reclaim 가능 공간과 workload를 함께 본다. `DBA_FREE_SPACE_COALESCED`와 `ALTER TABLESPACE ... COALESCE`를 정기 작업으로 삼는 방식은 locally managed 환경의 기본 운영법이 아니다.

## 변경과 삭제의 안전선

- Tablespace를 offline/read only로 바꾸기 전에 application, recovery와 standby 영향을 확인한다.
- `DROP TABLESPACE ... INCLUDING CONTENTS AND DATAFILES`는 object와 물리 file을 함께 제거할 수 있는 파괴적 DDL이다.
- 삭제 전에 대상 container, 소유 segment, foreign dependency, backup과 복구 절차를 확인한다.
- 운영 변경은 예측 용량, 실행 시간, lock/availability 영향과 rollback 대체 절차를 migration에 남긴다.

## 출처

- [Oracle AI Database 26ai, Managing Tablespaces](https://docs.oracle.com/en/database/oracle/oracle-database/26/admin/managing-tablespaces.html)
- [Oracle AI Database 26ai, Managing Data Files and Temp Files](https://docs.oracle.com/en/database/oracle/oracle-database/26/admin/managing-data-files-and-temp-files.html)
- [Oracle AI Database 26ai, Tablespaces in a PDB](https://docs.oracle.com/en/database/oracle/oracle-database/26/dbiad/db_tablespaces.html)
- 강의: [Tablespace 이해](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5059), [Tablespace 관리](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5060)

## 관련 문서

- [[oracle|Oracle Database]]
- [[Oracle-11g-Historical-Setup|Oracle 11g 학습 환경]]
- [[Schema-Design|Schema design]]
