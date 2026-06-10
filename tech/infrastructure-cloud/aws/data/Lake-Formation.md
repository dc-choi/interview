---
tags: [infrastructure, aws, lake-formation, data-lake, analytics]
status: done
category: "Infrastructure - AWS"
aliases: ["Lake Formation", "AWS Lake Formation", "Data Lake"]
---

# AWS Lake Formation

**Data Lake**(중앙 집중식 데이터 저장소) 생성을 쉽게 해주는 서비스. AWS Glue 위에서 빌드되지만 사용자는 Glue와 직접 상호작용하지 않음.

## Data Lake란

- 모든 데이터(정형·반정형·비정형)를 한 곳에 모아 저장
- 다양한 분석 도구(Athena, Redshift, EMR, Apache Spark)로 활용

## Lake Formation 기능

- **데이터 수집·정제·카탈로깅·복제** 같은 복잡한 수작업을 자동화
- **기계 학습 변환** 기능으로 중복 제거 수행
- **블루프린트**: 데이터를 데이터 레이크로 이전 — S3·RDS·온프레미스 관계형 DB·NoSQL DB 등에서 지원
- **세분화된 액세스 제어**: 행·열 수준까지 권한 관리 (S3 객체 정책으로는 어려운 영역)
- Lake Formation에 주입된 모든 데이터에 대해 **중앙 권한 관리**

## 분석 도구 통합

- Athena, Redshift, EMR, Apache Spark 프레임워크 등

## 시험 빈출 포인트

- "**Data Lake** 구축" → Lake Formation
- "데이터 레이크에 **행·열 수준 액세스 제어**" → Lake Formation (S3 단독으로는 불가)
- "여러 분석 도구 통합 권한 관리" → Lake Formation

## 관련 문서

- [[Glue]] · [[Athena]] · [[Redshift]] · [[S3]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
