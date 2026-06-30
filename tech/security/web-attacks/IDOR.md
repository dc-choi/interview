---
tags: [security, web-attacks, authorization, owasp]
status: done
category: "Security - 웹 공격"
aliases: ["IDOR", "Insecure Direct Object Reference", "부적절한 인가", "Broken Access Control"]
---

# IDOR (Insecure Direct Object Reference)

안전하지 않은 직접 객체 참조. 실무에서는 **부적절한 인가(authorization) 문제**로 이해하면 쉽다. 사용자가 요청에 담아 보낸 식별자(ID)로 객체에 접근할 때, 서버가 "이 사용자가 이 객체에 접근할 권한이 있는가"를 확인하지 않아 남의 자원이 노출되는 취약점이다. OWASP Top 10의 1위 카테고리인 Broken Access Control의 대표 사례다.

## 동작 방식

```http
GET /mypage?memberId=111
```

본인이 `memberId=111`로 자기 정보를 조회하는 정상 요청에서, 공격자가 값만 `memberId=222`로 바꿔 보냈을 때 다른 사람의 정보가 보이면 IDOR다. URL 쿼리뿐 아니라 path 변수, 폼 필드, JSON 바디, 헤더 등 **클라이언트가 보내는 모든 식별자**가 대상이 된다.

핵심 원인: 서버가 "요청한 객체가 존재하는가"(인증된 사용자인가)만 보고, "요청자가 그 객체의 소유자/접근 권한자인가"(인가)를 검증하지 않았다.

## 인증 vs 인가 (구분이 핵심)

- **인증(Authentication)**: 너는 누구인가 — 로그인 통과 여부. IDOR가 난 API도 보통 인증은 통과돼 있다.
- **인가(Authorization)**: 너는 이 자원에 접근해도 되는가 — IDOR는 여기가 비어 있는 것.

→ 로그인했다고 모든 자원에 접근 가능한 게 아니다. 인증을 통과한 사용자도 자원 단위로 인가를 다시 봐야 한다.

## 방어

클라이언트 값은 믿지 말고, **서버에서 세션이나 토큰을 기준으로 소유권/권한을 검증**한다.

- 요청의 `memberId`를 그대로 쓰지 말고, 세션/토큰에서 꺼낸 사용자 ID로 조회하거나 대조한다. 예: `WHERE member_id = :sessionUserId`.
- 타인 자원 접근이 정당한 경우(관리자 등)는 역할(role) 기반 인가를 명시적으로 통과시킨다.
- 추측하기 어려운 식별자(UUID 등)는 **완화책일 뿐 방어가 아니다**. 순차 ID를 UUID로 바꿔도 인가 검증이 없으면 ID가 유출되는 순간 그대로 뚫린다. 근본 해법은 항상 서버 측 인가.

## 면접 포인트

Q. IDOR가 뭔가?
- 클라이언트가 보낸 식별자로 객체에 접근할 때 서버가 소유권/권한을 확인하지 않아 남의 자원이 노출되는 인가 취약점. `memberId=111`을 `222`로 바꿨더니 남의 정보가 보이면 IDOR.

Q. 어떻게 막나?
- 클라이언트가 준 ID를 신뢰하지 않고, 세션/토큰의 사용자 기준으로 인가를 검증한다. UUID로 바꾸는 건 추측을 어렵게 할 뿐 근본 방어가 아니다.

Q. 인증은 통과했는데 왜 뚫리나?
- 인증(누구인가)과 인가(접근해도 되나)는 다르다. IDOR는 인증은 됐지만 자원 단위 인가가 빠진 경우다.

## 출처

- [애플리케이션 보안 핵심 — 시큐어코딩, IDOR, SSRF, JWT, Spring Actuator (YouTube)](https://www.youtube.com/watch?v=RQv86D0M5YY&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=19)

## 관련 문서

- [[Application-Security|애플리케이션 보안 (OWASP Top 10, 4대 원칙)]]
- [[SSRF|SSRF]]
- [[Session|세션]]
- [[JWT|JWT]]
