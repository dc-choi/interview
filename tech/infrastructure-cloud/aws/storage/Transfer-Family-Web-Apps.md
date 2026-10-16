---
tags: [aws, transfer-family, s3, access-grants, identity-center]
status: done
verified_at: 2026-10-16
category: "Infrastructure - AWS"
aliases: ["Transfer Family Web Apps", "S3 브라우저 파일 공유"]
---

# Transfer Family Web Apps와 S3 접근 권한

Transfer Family web apps는 브라우저에서 S3 파일을 주고받는 인터페이스를 제공한다. 이 문서는 IAM Identity Center를 사용하는 구성의 인증, 데이터 접근 권한과 CORS를 구분한다. 로그인 성공만으로 S3 파일 접근까지 허용되지는 않는다.

## 인증과 데이터 접근의 흐름

| 구성요소 | 맡는 역할 |
|---|---|
| IAM Identity Center와 web app 사용자 할당 | 로그인할 사용자와 그룹을 연결한다 |
| Identity bearer role | 인증한 사용자 신원을 포함해 S3 Access Grants에 데이터 접근을 요청한다 |
| S3 Access Grants location과 IAM role | 접근할 S3 범위와 임시 자격 증명 발급에 사용할 역할을 연결한다 |
| 개별 grant | 사용자 또는 그룹에 허용할 bucket, prefix, object 범위와 읽기 또는 읽기/쓰기를 정한다 |
| S3 CORS | web app의 origin에서 보내는 브라우저 요청을 허용하도록 구성한다 |

S3 Access Grants **인스턴스**는 계정과 리전별로 하나이며, 등록된 location과 개별 grant를 담는다. 사용자 권한을 하나만 만들 수 있다는 뜻이 아니다. Web app의 grant는 읽기 전용 또는 읽기/쓰기를 지원하며 쓰기 전용은 지원하지 않는다.

Identity bearer role과 location role은 역할이 다르다. 전자는 사용자를 대신해 접근을 요청하고, 후자는 S3 Access Grants가 임시 자격 증명을 발급할 때 사용한다. Location role에는 필요한 S3 범위와 작업만 허용한다.

## 설정에서 분리할 세 가지

1. **앱 접근:** Identity Center의 사용자 또는 그룹을 web app에 할당한다.
2. **데이터 접근:** S3 location을 등록하고 대상 사용자 또는 그룹의 ID로 grant를 만든다. 고객별 공유라면 bucket 전체보다 필요한 prefix로 범위를 좁히는 구성을 검토한다.
3. **브라우저 접근:** 사용하는 각 bucket의 CORS `AllowedOrigins`에 web app의 실제 access endpoint를 넣는다. URL 끝에 `/`를 붙이지 않는다. 여러 web app이 같은 bucket을 쓰면 각각의 origin을 등록한다.

CORS와 grant는 서로 대체하는 설정이 아니다. 앱 로그인, 데이터 접근 허용과 브라우저 요청 처리를 나누어 확인한다.

## 검증 예시

아래는 구성 검증 제안이며 실제 AWS 환경에서 수행한 시험 결과는 아니다.

- 사용자 A에게 읽기 전용 자료 prefix와 읽기/쓰기 제출 prefix를 각각 부여한다.
- 자료 다운로드가 성공하고 같은 위치의 업로드는 거부되는지 확인한다.
- 제출 파일이 의도한 bucket과 prefix에 저장되는지 확인한다.
- 사용자 B에게 허용하지 않은 자료가 목록과 다운로드에서 노출되지 않는지 확인한다.
- 로그인은 성공하지만 파일 접근이 실패하면 사용자 할당, grant의 신원과 범위, location role, CORS를 구분해 진단한다.

브라우저 업로드를 자체 구현하는 경우의 전송 방식과 운영 조건은 [[S3-File-Upload|S3 파일 업로드]]에서 비교한다. 이 문서의 구성만으로 업로드 파일의 업무상 검수까지 완료되는 것은 아니다.

## 출처

- [AWS Transfer Family, Tutorial: Setting up a basic Transfer Family web app](https://docs.aws.amazon.com/transfer/latest/userguide/web-app-tutorial.html)
- [AWS Transfer Family, Configure IAM roles for Transfer Family web apps](https://docs.aws.amazon.com/transfer/latest/userguide/webapp-roles.html)
- [AWS Transfer Family, Configure Amazon S3 Access Grants for Transfer Family web apps](https://docs.aws.amazon.com/transfer/latest/userguide/webapp-access-grant.html)
- [Amazon S3, Working with S3 Access Grants instances](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-grants-instance.html)
- [AWS Transfer Family, Tutorial: Setting up AWS Transfer Family web app with selective multi-bucket access](https://docs.aws.amazon.com/transfer/latest/userguide/webapp-s3-tutorial.html)

## 관련 문서

- [[S3-File-Upload|S3 파일 업로드]]
- [[IAM|IAM 권한 관리]]
- [[storage|AWS 스토리지 서비스]]
