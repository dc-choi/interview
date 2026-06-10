---
tags: [observability, logging, pii, security, privacy, masking, compliance]
status: done
category: "관측가능성(Observability)"
aliases: ["PII Masking", "PII masking", "PII 마스킹", "민감정보 마스킹", "로그 마스킹"]
---

# PII 마스킹 (PII Masking)

로그/추적에 **개인정보(PII)나 민감정보가 그대로 찍히면** 그 자체가 유출 경로가 된다. 로그는 여러 시스템에 복제되고 오래 보관되므로, 한 번 평문으로 남으면 회수가 사실상 불가능하다. 마스킹은 관측성을 유지하면서 민감 필드를 가리는 일이다. [[Structured-Logging]]

## 무엇이 민감정보인가

- **PII**: 이름, 주민번호, 전화번호, 이메일, 주소, 생년월일.
- **인증/비밀**: 비밀번호, 토큰, API 키, 세션 쿠키, Authorization 헤더.
- **금융/결제**: 카드번호(PCI-DSS), 계좌번호.
- 결합 시 식별 가능한 준식별자(IP + 행동 로그)도 주의.

## 어디서 마스킹하나 — 빠를수록 좋다

| 위치 | 장점 | 약점 |
|---|---|---|
| **애플리케이션(생성 시점)** | 평문이 디스크/네트워크에 절대 안 남음 | 코드 곳곳에 적용 누락 위험 |
| **로그 파이프라인(수집 중)** | 중앙 일괄 규칙, 앱 변경 최소 | 앱→파이프라인 구간엔 평문 존재 |
| **저장 후(쿼리 시)** | 유연 | 이미 평문 저장됨 — 너무 늦음 |

원칙: **생성 시점 마스킹이 1순위**, 파이프라인 마스킹은 안전망. 이미 저장된 뒤 가리는 건 사고 대응이지 예방이 아니다. [[Log-Pipeline]]

## 기법

- **Redaction**: `card=****1234`처럼 일부만 남기고 가림.
- **Hashing/Tokenization**: 원본을 해시/토큰으로 치환해 **동일성 비교는 가능**(같은 사용자 추적)하되 원본 복원 불가. 추적 일관성이 필요할 때.
- **필드 허용목록(allowlist)**: 구조화 로깅에서 **허용된 필드만 통과**시키고 나머지는 기본 차단. 차단목록(denylist)보다 누락에 강하다.
- **민감 객체 마스킹 직렬화**: 로거 직렬화 단계에서 민감 타입을 자동 마스킹(예: `password` 키 패턴).

## 구조화 로깅과의 시너지

평문 문자열 로그는 정규식으로 잡아야 해 누락이 잦다. **구조화 로깅(JSON)이면 필드 단위**로 허용/마스킹을 강제할 수 있어 정확하다. [[Structured-Logging]]

## 컴플라이언스

개인정보보호법, GDPR, PCI-DSS는 민감정보의 저장/보관을 규제한다. 로그 보존 기간([[Long-Term-Retention]])과 결합해 **수집 최소화 + 마스킹 + 보존 한도**를 함께 설계해야 한다.

## 흔한 함정

- 에러 스택/요청 본문 통째로 로깅 → 그 안에 PII 동봉
- denylist 방식 → 새 필드가 추가되면 줄줄 샘
- 토큰/쿠키/Authorization 헤더를 디버그로 평문 출력
- 파이프라인에서만 마스킹 → 앱 로컬 파일엔 평문
- 마스킹을 해놓고 trace/예외 리포팅 툴엔 평문 전송

## 면접 체크포인트

- 로그가 유출 경로가 되는 이유(복제/장기 보존/회수 불가)
- 생성 시점 vs 파이프라인 vs 저장 후 마스킹의 트레이드오프
- redaction vs tokenization(동일성 유지) 선택 기준
- allowlist가 denylist보다 안전한 이유
- 구조화 로깅이 마스킹을 정확하게 만드는 점, 컴플라이언스 연계

## 출처

- [OWASP — Logging Cheat Sheet (data to exclude)](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [AWS — Protecting sensitive data with CloudWatch Logs data protection](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/mask-sensitive-log-data.html)

## 관련 문서

- [[Structured-Logging|구조화 로깅 (필드 허용목록)]]
- [[Log-Pipeline|로그 파이프라인 (중앙 마스킹)]]
- [[Long-Term-Retention|장기 보존 (수집 최소화)]]
- [[Correlation-ID|Correlation ID]]
