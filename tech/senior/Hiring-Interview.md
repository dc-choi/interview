---
tags: [senior, hiring, interview, leadership]
status: done
category: "시니어역량(SeniorEngineer)"
aliases: ["Hiring Interview", "채용 인터뷰"]
---

# 채용 인터뷰

## 프론트엔드 개발자 채용 면접 질문

### 기술 기초

**JavaScript**
- 이벤트 루프 동작 방식
- ESM vs CJS 차이
- this 바인딩 규칙

**TypeScript**
- 유틸리티 타입 활용
- 타입 추론 vs 명시적 타입 선언 기준
- 타입 단언 (as, !)의 적절한 사용
- zod를 이용한 런타임 유효성 검사
- type vs interface 차이와 선택 기준

### Git / 버전 관리
- Git 브랜치 전략 (Git Flow, Trunk-based 등)
- 커밋 메시지 컨벤션 (Conventional Commits 등)

### 배포 전략
- 블루/그린, 카나리, 롤링 업데이트의 차이와 선택 기준
- AWS & 인프라 경험도 함께 확인

### 기술부채 개선 경험
- 현재 도메인과 UI가 강결합된 구조에서 어떻게 개선할 것인지
- 기존 레거시와 새로운 코드가 혼재된 상황에서 기능 구현과 개선을 병행하는 방법
- 수치화 → 데이터 기반 의사결정 경험

### 협업 & 커뮤니케이션

**API 명세 관련**
- 백엔드 API 명세가 완전하지 않을 때 어떻게 커뮤니케이션하나요?
- API 명세서 문서화를 요구하거나 직접 정리해본 경험
- Swagger, Postman, Stoplight 같은 도구 사용 경험
- 협업 시 가장 효과적이었던 소통 방식

**코드 리뷰**
- 코드 리뷰를 어떻게 진행하는지 (코드 중복 줄이기 관점)
- 리뷰에서 가장 중요하게 보는 기준 (성능, 일관성 등)
- conflict나 의견 충돌이 생겼을 때 조율 방법
- 코드 리뷰 도입 후 팀 퀄리티가 개선됐던 경험

### AWS & 인프라 (보안 중심)

**S3 + CloudFront 정적 배포**
- S3 정적 웹사이트 배포 시 퍼블릭 액세스 차단과 보안 관리 방법
- S3 버킷 정책 구성 경험
- Presigned URL 활용 경험
- CloudFront 연동 시 Origin Access Control (OAC) 설정 경험

**인증**
- AWS Cognito나 다른 인증 시스템 사용 경험
- OAuth2/JWT 토큰 기반 인증 처리 구성 방법
- 토큰 만료 처리, silent refresh 방식
- Auth 관련 에러 디버깅 및 사용자 경험 개선 사례

**보안**
- 자격증명 유출이나 권한 관리 문제 경험
- IAM 권한 최소화 원칙 적용 경험
- 환경변수에 민감 정보가 노출되지 않도록 관리하는 방법
- 프론트엔드에서 민감한 정보가 노출되지 않도록 하기 위한 고려사항

## 관련 문서
- [[Toss-Evaluation-Criteria|토스 내부 평가 기준]]
- [[MOA-Study-Curriculum|MOA 스터디 커리큘럼 (멘토링 사례)]]
