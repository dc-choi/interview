---
tags: [infrastructure, aws, secrets-manager, security, encryption]
status: done
category: "Infrastructure - AWS"
aliases: ["Secrets Manager", "AWS Secrets Manager"]
verified_at: 2026-10-13
---

# AWS Secrets Manager

자격 증명, API 키 같은 비밀을 저장하고 검색, 복제, 교체하는 수명 주기 관리 서비스.

## 핵심

- 자동 교체 일정을 구성할 수 있다. 지원 서비스의 **관리형 교체**를 쓰거나, 그 외 비밀은 **Lambda 교체 함수**를 사용한다.
- KMS로 암호화
- **RDS와 통합**: DB 자격 증명 자동 회전 가능
- 그 외 서비스나 DB는 지원되는 연동과 교체 방식을 확인하고, 애플리케이션에서 API나 SDK로 값을 조회할 수 있다.

## 애플리케이션에서 조회하는 흐름

1. DB 연결 정보나 API 키를 비밀로 저장하고, 코드에는 비밀 값 대신 조회할 이름 또는 ARN을 둔다.
2. Lambda라면 실행 역할에 필요한 비밀의 `secretsmanager:GetSecretValue` 권한을 부여한다. 고객 관리형 KMS 키로 암호화했다면 해당 키의 `kms:Decrypt` 권한도 필요하다. 비밀 조회 권한과 DB 연결에 필요한 네트워크 및 DB 권한은 별개다.
3. SDK로 `GetSecretValue`를 호출한다. 버전을 지정하지 않으면 `AWSCURRENT`를 반환하며, 문자열로 저장한 값은 `SecretString`에 복호화되어 나온다. JSON으로 저장했다면 이를 파싱해 연결 정보를 전달한다.
4. 조회 지연과 API 비용을 줄이기 위해 클라이언트 캐시를 검토한다. 캐시 갱신과 기존 연결의 재생성은 사용하는 라이브러리와 애플리케이션에서 확인한다. 중앙의 값이 바뀌었다는 사실만으로 실행 중인 모든 연결이 새 값을 쓴다고 가정하지 않는다.

저장 시 KMS 암호화와 사용 시 평문 노출을 구분한다. API는 애플리케이션이 사용할 수 있는 복호화 값을 반환하므로 응답 전체나 DB 연결 문자열을 로그에 남기지 않는다. `GetSecretValue` 호출은 CloudTrail에 기록되지만 서비스가 비밀 값을 로그에서 제외해 주는 것과 애플리케이션 로그 보호는 별개다.

자동 교체는 비밀 값과 대상 서비스의 자격증명을 갱신하는 절차다. 지원 서비스의 관리형 교체와 Lambda 함수 기반 교체를 구분하고, 도입할 때 조회 권한, 갱신 뒤 새 연결 성공, 캐시와 로그 노출을 함께 점검한다. ECS 환경 변수 주입의 갱신 경계는 [[ECS-Secrets-Injection|ECS 시크릿 주입]]을 따른다.

## 다중 리전 암호

- 여러 AWS 리전에 암호 복제 → 기본 암호와 동기화된 **읽기 전용 복제본** 유지
- 글로벌 애플리케이션, DR 시나리오

## Parameter Store와 비교

| 측면 | Secrets Manager | SSM Parameter Store |
|------|-----------------|---------------------|
| **자동 교체** | O (관리형 또는 Lambda 교체) | 기본 제공 X |
| **비용** | 공식 가격 예제 기준 비밀당 월 $0.40 + API 호출 비용. 적용 리전과 조건 확인 | Standard 저장은 추가 요금 없음. Advanced, 높은 처리량은 과금 |
| **RDS 통합** | O | X |
| **암호화** | KMS 강제 | KMS 선택 |
| **사용처** | 회전 필요한 자격 증명 | 일반 설정값, API 키 (회전 X) |

## 시험 빈출 포인트

- **DB 자격 증명 자동 회전** → Secrets Manager
- 회전 필요 없는 설정값 → SSM Parameter Store. 티어와 API 사용량으로 비용 비교
- 자동 교체 → Secrets Manager. 관리형 교체가 아닌 경우 Lambda 교체 함수 사용
- KMS 강제 암호화 → Secrets Manager

## 관련 문서

- [[SSM-Parameter-Store]], [[KMS]], [[RDS-Security-Group]]

## 출처

2026-10-13 부분 검증: 조회 API의 권한과 반환값, 로그 보호, 캐시 권고, 교체 방식과 가격 예제를 확인했다. 개별 애플리케이션의 교체 무중단 동작을 검증한 기록은 아니다.

- [AWS Secrets Manager, GetSecretValue](https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html)
- [AWS Secrets Manager, Best practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [AWS Secrets Manager, Rotate secrets](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [AWS Secrets Manager, What is AWS Secrets Manager?](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
- [AWS Secrets Manager pricing](https://aws.amazon.com/secrets-manager/pricing/)
- [AWS Systems Manager, Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
