---
tags: [database, oracle, tablespace, datafile, storage]
status: done
verified_at: 2026-11-18
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

## 할당 공간과 확장 가능 공간

`DBA_FREE_SPACE`는 현재 datafile 안의 free extent를 보여 주며 autoextend 여유는 포함하지 않는다. `DBA_DATA_FILES`의 BYTES, AUTOEXTENSIBLE, MAXBYTES와 실제 filesystem/ASM 여유를 함께 읽는다. 현재 free 비율뿐 아니라 한도 대비 사용량과 성장 속도를 경보 기준으로 삼는다.

## 크기 조정 명령은 tablespace 유형마다 다르다

| 유형 | 늘리거나 줄이는 방법 | 실패 조건 |
|---|---|---|
| Bigfile permanent | `ALTER TABLESPACE ... RESIZE`로 단일 data file을 절대 크기로 바꾼다. 이 절은 bigfile에만 유효하다 | 새 크기보다 뒤쪽에 데이터가 있으면 축소가 오류로 끝난다 |
| Smallfile permanent | data file을 추가하거나 `ALTER DATABASE DATAFILE ... RESIZE`로 개별 file을 바꾼다 | 위와 같다 |
| Temporary | `ALTER TABLESPACE ... SHRINK SPACE [KEEP size]`로 줄인다. `KEEP`은 줄일 수 있는 하한이며, 생략하면 다른 저장 속성을 만족하는 한 최대한 줄인다. 개별 temp file은 `SHRINK TEMPFILE`을 쓴다 | 문서에 별도 실패 조건 없음 |
| Undo | Oracle 문서의 예시는 `ALTER DATABASE DATAFILE ... RESIZE`다. SQL 참조의 undo 제한 목록에는 `RESIZE`가 없지만 AWS 영상은 RDS의 undo에 `ALTER TABLESPACE`로 크기를 바꾸는 예를 보인다 | AWS 영상 기준으로 undo segment가 공간 안에 흩어져 있으면 축소가 실패할 수 있다 |

Undo를 원하는 크기로 줄이지 못하면 새 undo tablespace를 만들고 `UNDO_TABLESPACE`를 바꾼다. 이 파라미터는 `ALTER SYSTEM`으로 바꿀 수 있는 동적 파라미터다. 전환은 이전 tablespace의 트랜잭션 커밋을 기다리지 않으며, 진행 중인 트랜잭션이 있으면 이전 tablespace는 `PENDING OFFLINE`이 되어 새 트랜잭션의 undo를 받지 않고 삭제할 수도 없다. 모든 트랜잭션이 끝나면 자동으로 `OFFLINE`이 된다. 삭제는 어느 인스턴스도 쓰지 않고 남은 트랜잭션이 없을 때만 되며, 삭제하면 만료되지 않은 undo도 사라져 그 undo가 필요한 장기 쿼리에 영향을 줄 수 있다.

26ai 문서 기준으로 `DBMS_SPACE.SHRINK_TABLESPACE`는 tablespace 안의 객체를 옮겨 재구성한 뒤 data file을 가능한 최소 크기로 줄인다. 단순 resize가 뒤쪽 데이터 때문에 실패할 때의 대안이며, 사용하는 엔진 버전과 RDS에서의 제공 여부는 확인하지 않았다.

Smallfile data file 하나는 대개 2^22 - 1 block까지 담으므로 8K block이면 약 32GB가 상한이다(계산). Bigfile은 약 2^32 block으로 8K block에서 32TB, 32K block에서 128TB다.

### Amazon RDS for Oracle에서의 차이

RDS는 셸 접근을 주지 않고 고급 권한이 필요한 일부 시스템 프로시저와 테이블 접근을 제한하므로 일부 작업은 `rdsadmin` 패키지로 한다. 마스터 사용자의 DBA 역할에는 `ALTER DATABASE`와 `ALTER SYSTEM` 권한이 없으므로, Oracle 문서의 `ALTER DATABASE DATAFILE`과 `ALTER SYSTEM SET UNDO_TABLESPACE` 경로는 bigfile의 `ALTER TABLESPACE`, `rdsadmin` 프로시저와 파라미터 그룹으로 대신한다.

- 크기를 정하지 않고 만든 tablespace는 `AUTOEXTEND ON`에 최대 크기 없음으로 생성된다. AWS는 permanent와 temporary tablespace에 적절한 최대 크기를 지정하라고 권장한다.
- Bigfile은 `ALTER TABLESPACE ... RESIZE`로, smallfile은 `ADD DATAFILE`로 늘린다. data file 단위 조정은 `rdsadmin.rdsadmin_util.resize_datafile`과 `autoextend_datafile`을 쓴다.
- Temporary tablespace는 read replica를 포함해 `resize_temp_tablespace`, `resize_tempfile`, `autoextend_tempfile`로 조정할 수 있다. AWS 영상은 기본 인스턴스에서 shrink 명령으로 temporary tablespace를 줄이는 예를 보인다.
- RDS for Oracle에서 file 하나의 최대 크기는 인스턴스의 ext4 파일 시스템 제한으로 16TiB다. 따라서 기본 block 크기 8K에서 bigfile의 이론 상한 32TB로 표시되더라도 data file은 16TiB까지만 늘릴 수 있다.
- 같은 영상 기준으로 undo 전환은 인스턴스에 연결된 사용자 지정 DB 파라미터 그룹의 `UNDO_TABLESPACE`를 새 tablespace로 바꿔 적용한다. 동적 파라미터라 적용에 다운타임은 없지만 변경 뒤 재부팅을 권장한다.

## 출처

- [Oracle AI Database 26ai, Managing Tablespaces](https://docs.oracle.com/en/database/oracle/oracle-database/26/admin/managing-tablespaces.html)
- [Oracle AI Database 26ai, Managing Data Files and Temp Files](https://docs.oracle.com/en/database/oracle/oracle-database/26/admin/managing-data-files-and-temp-files.html)
- [Oracle AI Database 26ai, Tablespaces in a PDB](https://docs.oracle.com/en/database/oracle/oracle-database/26/dbiad/db_tablespaces.html)
- 강의: [Tablespace 이해](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5059), [Tablespace 관리](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5060)
- [Oracle AI Database 26ai, DBA_DATA_FILES](https://docs.oracle.com/en/database/oracle/oracle-database/26/refrn/DBA_DATA_FILES.html)
- [Oracle AI Database 26ai, DBA_FREE_SPACE](https://docs.oracle.com/en/database/oracle/oracle-database/26/refrn/DBA_FREE_SPACE.html)
- [Oracle AI Database 26ai, ALTER TABLESPACE](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/ALTER-TABLESPACE.html)
- [Oracle AI Database 26ai, Managing Undo](https://docs.oracle.com/en/database/oracle/oracle-database/26/admin/managing-undo.html)
- [Oracle AI Database 26ai, UNDO_TABLESPACE](https://docs.oracle.com/en/database/oracle/oracle-database/26/refrn/UNDO_TABLESPACE.html)
- [Oracle AI Database 26ai, Physical Database Limits](https://docs.oracle.com/en/database/oracle/oracle-database/26/refrn/physical-database-limits.html)
- [AWS, Working with tablespaces in RDS for Oracle](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.CommonDBATasks.TablespacesAndDatafiles.html)
- [AWS, RDS for Oracle limitations](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Oracle.Concepts.limitations.html)
- [AWS, Resizing tablespaces, data files, and tempfiles in RDS for Oracle](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.CommonDBATasks.ResizeTempSpaceReadReplica.html)
- [AWS, Performing common database tasks for Oracle DB instances](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.CommonDBATasks.Database.html)
- [Amazon RDS for Oracle DB インスタンスでテーブルスペースのサイズを変更する方法を教えてください。 — Amazon Web Services](https://www.youtube.com/watch?v=Fcc7UDPoUkc)


## 관련 문서

- [[oracle|Oracle Database]]
- [[Oracle-11g-Historical-Setup|Oracle 11g 학습 환경]]
- [[Schema-Design|Schema design]]
