---
tags: [ai, llm, reliability, error-handling, retry, fallback, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Failure Handling", "LLM Error Handling", "LLM 오류 처리", "LLM 실패 처리"]
---

# LLM 애플리케이션의 실패 처리 (LLM Failure Handling)

LLM 호출 경로의 실패를 분류하고, HTTP 200 안의 의미적 실패를 검증하고, 재시도와 폴백으로 복구하는 판단을 세 문서로 나눠 둔다. 상위: [[LLM-Operations|LLM 선택, 서빙과 운영]].

## 목차

- [[LLM-Failure-Handling-Classification|실패 분류와 오류 응답]]: 기술적 실패와 의미적 실패, 지속성과 범위 분류, 모델을 바꿔서 풀리는 실패의 범위, 상태 코드보다 오류 본문, 429 속도 한도와 지출 한도 구분, 모르는 오류 type의 기본 분기와 request-id 기록
- [[LLM-Failure-Handling-Response-Validation|200 응답 검증, 입력 크기와 스트리밍]]: stop_reason 분기, 구조화 출력이 보장하는 범위와 값 검증, 보내기 전 토큰 계산과 줄이는 순서, 바이트와 개수 한도, 스트림 중간 오류와 이어 쓰기 복구, 10분 넘는 요청
- [[LLM-Failure-Handling-Recovery|재시도, 폴백과 부분 완료]]: SDK 기본 재시도와 단일 계층 재시도, Bedrock 가져온 모델의 준비 상태, 폴백 범위와 잠복 결함, 서버 측 fallbacks의 한계, Bedrock 리전 간 추론, 모델 단위 서킷 브레이커와 동시성, 도구 멱등 키와 부분 완료, 트레이드오프와 운영 체크포인트

## 함께 볼 문서

- [[LLM-Operations|LLM 선택, 서빙과 운영]]
