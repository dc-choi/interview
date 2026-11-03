---
tags: [aws, redshift, iam, s3, permissions]
status: done
verified_at: 2026-11-04
category: "Infrastructure - AWS"
aliases: ["Redshift 사용자 정리와 계정 간 데이터 전송"]
---

# Redshift 사용자 정리와 계정 간 데이터 전송

Redshift의 데이터베이스 사용자 권한과 AWS 리소스 접근 역할은 별도 계층이다. 사용자 삭제는 객체 소유권과 권한 의존성을 확인하고, S3 전송은 SQL 권한, IAM 역할, 암호화와 리전 조건을 함께 확인한다.

## 사용자 삭제 전에는 모든 데이터베이스를 확인한다

`DROP USER`는 superuser 또는 해당 명령 권한이 필요하다. 사용자가 객체를 소유하거나 객체에 대한 권한을 갖고 있으면 삭제가 막힐 수 있다. `rdsdb`와 데이터베이스 관리자 사용자는 삭제할 수 없다.

특히 **삭제 명령은 현재 데이터베이스만 검사한다.** 다른 데이터베이스에 소유 객체가 남아 있어도 오류 없이 사용자가 삭제되고, 그 객체의 소유자가 `unknown`이 될 수 있다. 삭제 성공을 전체 의존성 정리의 증거로 삼지 않는다.

데이터를 보존하는 사용자 정리 절차는 다음과 같이 설계한다.

1. 대상 사용자가 접근했던 데이터베이스를 각각 확인한다. 객체 소유권, 받은 권한, 다른 사용자에게 부여한 권한과 기본 권한을 구분한다.
2. 유지할 객체는 후임 사용자에게 소유권을 이전한다. 사용자 삭제를 위해 업무 테이블까지 삭제하는 방식을 기본값으로 삼지 않는다.
3. 필요한 권한은 적절한 주체가 다시 부여하도록 검토하고, 대상 사용자와 연결된 권한을 회수한다. 기본 권한은 기존 객체의 권한과 별도로 확인한다.
4. 의존성을 다시 조회한 뒤 사용자를 삭제하고, 남은 소유권과 애플리케이션 접근을 확인한다.

AWS Labs의 `admin.v_find_dropuser_objs`는 소유 객체와 소유권 이전용 DDL 문자열을 찾는 보조 view다. `admin.v_generate_user_grant_revoke_ddl`은 권한의 부여와 회수 DDL을 생성하며 기본 ACL도 다룬다. Redshift에 기본 설치된 시스템 view로 가정하지 않는다. 생성된 DDL은 검토할 자료이며 자동 실행이나 모든 의존성 탐지의 보장은 아니다. 예를 들어 소유권 이전 문자열에는 새 소유자를 지정해야 한다. 이 문서는 view 소스를 대조했으며 실제 클러스터에서 실행하지 않았다.

## 계정 간 전송은 역할 체인의 방향을 맞춘다

다음은 provisioned 클러스터가 다른 계정의 S3에 접근하는 역할 체인 방식이다.

| 계층 | 필요한 연결 |
| --- | --- |
| 클러스터의 첫 역할 | 클러스터에 연결하고 다음 역할 ARN에 대한 `sts:AssumeRole`을 허용 |
| S3 계정의 다음 역할 | 신뢰 정책으로 앞 역할을 허용하고 필요한 버킷과 객체 권한을 부여 |
| SQL의 `IAM_ROLE` | 첫 역할부터 순서대로 ARN을 쉼표로 연결. 전체를 작은따옴표로 감싸고 체인 안에 공백을 넣지 않음 |

역할을 맡을 권한과 맡겨 주는 신뢰 정책은 둘 다 필요하다. COPY는 소스 버킷의 목록 조회와 객체 읽기 권한이 필요하며, UNLOAD는 조회 대상의 SQL `SELECT` 권한과 목적지 S3 쓰기 권한도 필요하다. 역할 체인만 연결했다고 실제 데이터 접근까지 확인된 것은 아니다.

SSE-KMS 객체 읽기에는 `kms:Decrypt`, 암호화된 객체 쓰기에는 `kms:GenerateDataKey`가 필요하다. multipart upload에는 두 권한이 모두 필요하다. 실제 접근 주체에 대한 KMS 키 정책과 IAM 권한도 확인한다. S3용 KMS 키의 리전은 버킷과 같아야 하며, 이것을 Redshift와 버킷이 항상 같은 리전이어야 한다는 뜻으로 확대하지 않는다.

## 다른 계정과 다른 리전은 별도 조건이다

| 작업 | 리전 조건 |
| --- | --- |
| S3의 CSV 등 일반 파일 COPY | 버킷이 클러스터와 다른 리전이면 해당 데이터 리전의 `REGION`을 지정 |
| S3 Parquet/ORC COPY | 버킷과 Redshift 데이터베이스가 같은 리전이어야 하며 `REGION` 매개변수를 지원하지 않음 |
| S3 UNLOAD | 목적지 버킷이 다른 리전이면 `REGION`을 지정 |

따라서 계정 간 전송에서 리전 간 COPY/UNLOAD가 전부 불가능하다고 단정하지 않는다. 계정 경계는 IAM과 리소스 접근 권한으로, 리전 경계는 명령과 파일 형식의 지원 조건으로 각각 판단한다.

## 검증할 결과

적용 점검 제안으로, 작은 데이터와 별도 출력 접두사에서 권한을 확인한 뒤 행 수, 컬럼 대응과 대표 값을 비교한다. UNLOAD의 기본 동작은 덮어쓸 파일이 있으면 실패한다. `ALLOWOVERWRITE`는 덮어쓰고 `CLEANPATH`는 대상 경로의 기존 파일을 지우므로, 단순한 재시도 해결책으로 추가하지 않는다. 사용자 삭제와 전송 모두 이 문서에서는 실제 AWS 자원으로 재현하지 않았다.

## 출처

- [AWS, DROP USER](https://docs.aws.amazon.com/redshift/latest/dg/r_DROP_USER.html)
- [v_find_dropuser_objs.sql — AWS Labs](https://github.com/awslabs/amazon-redshift-utils/blob/master/src/AdminViews/v_find_dropuser_objs.sql)
- [v_generate_user_grant_revoke_ddl.sql — AWS Labs](https://github.com/awslabs/amazon-redshift-utils/blob/master/src/AdminViews/v_generate_user_grant_revoke_ddl.sql)
- [AWS, Chaining IAM roles in Amazon Redshift](https://docs.aws.amazon.com/redshift/latest/mgmt/authorizing-redshift-service-chaining-roles.html)
- [AWS, Permissions to access other AWS Resources](https://docs.aws.amazon.com/redshift/latest/dg/copy-usage_notes-access-permissions.html)
- [AWS, Using server-side encryption with AWS KMS keys](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html)
- [AWS, COPY from Amazon S3](https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-data-source-s3.html)
- [AWS, COPY from columnar data formats](https://docs.aws.amazon.com/redshift/latest/dg/copy-usage_notes-copy-from-columnar.html)
- [AWS, UNLOAD](https://docs.aws.amazon.com/redshift/latest/dg/r_UNLOAD.html)

## 관련 문서

- [[Redshift|Redshift 개요]]
- [[IAM|AWS IAM]]
- [[S3|S3]]
- [[AWS-Analytics|AWS 분석 서비스]]
