---
tags: [web, http, api, convention]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["API Conventions", "API 컨벤션"]
---

# API 실무 컨벤션

설계 원칙([[REST]])과 별개로, **실무에서 매번 결정해야 하는 디테일**. 팀, 조직에서 한 번 정해놓지 않으면 매 API마다 다르게 써서 소비자가 혼란.

- [[API-Conventions-Format|시간(UTC, ISO 8601), JSON 키 네이밍, URI 컨벤션]]
- [[API-Conventions-Response|에러 응답, 페이지네이션, 필터링과 정렬, Envelope 응답 구조]]
- [[API-Conventions-Operations|버저닝, HTTP 메서드, 인증 헤더, 헬스 체크, 흔한 실수, 면접 체크포인트]]

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 12-2. 어플리케이션 레벨 의사결정 2](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-12.-%EC%96%B4%ED%94%8C%EB%A6%AC%EC%BC%80%EC%9D%B4%EC%85%98-%EB%A0%88%EB%B2%A8-%EC%9D%98%EC%82%AC%EA%B2%B0%EC%A0%95-2)
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 4. API 설계 원칙](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-4.-API-%EC%84%A4%EA%B3%84-%EC%9B%90%EC%B9%99%EA%B3%BC-%EC%A7%81%EB%A0%AC%ED%99%94-%ED%8F%AC%EB%A7%B7-%EA%B2%B0%EC%A0%95)

## 관련 문서
- [[REST|REST, URI 설계]]
- [[API-Documentation|API 문서화]]
- [[Idempotency|HTTP 멱등성]]
- [[HTTP-Status-Code|HTTP Status Code]]
