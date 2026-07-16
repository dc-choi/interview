---
tags: [security]
status: done
category: "Security"
aliases: ["JWT"]
---

# JWT

JSON Web Token의 약자로, 사용자의 정보를 JSON 객체로 표현한 토큰이다.

토큰 기반 인증은 인증받은 사용자에게 토큰을 발급하고 요청 시 헤더에 포함해 검증한다.

서버 세션에 인증 정보를 저장하지 않아 stateless 구조가 되고 확장에 유리하다.

## 구조

1. header — 토큰 타입과 서명 알고리즘 메타데이터
2. payload — 토큰이 가진 claim. 기본 JWT에서는 암호화되지 않고 Base64URL 인코딩만 됨
3. signature — Base64URL(header) + `.` + Base64URL(payload)에 대해 HMAC, RSA, ECDSA 등으로 만든 서명 또는 MAC. 위변조 탐지에 사용

## 장점

1. header와 payload를 가지고 signature를 생성하여 데이터 위변조를 막을 수 있다.
2. 인증 정보에 대한 별도의 저장소가 필요없다. JWT는 토큰에 대한 기본정보와 전달할 정보 및 토큰이 검증됬음을 증명하는 서명 등 필요한 모든 정보를 자체적으로 가지고 있다.

## 단점

1. 토큰의 길이가 길어서 인증 요청이 많아지면 네트워크 부하가 심해진다.
2. payload 자체는 암호화되지 않아서 유저의 중요한 정보는 담을 수 없다.
3. 토큰은 한번 발급되면 유효기간이 만료될 때 계속 사용되어 탈취당하게 되면 대처하기 힘들다.

## 보안 전략

1. 토큰의 만료 기한(payload의 exp 클레임)을 짧게 설정하여 토큰이 탈취되어도 빠르게 만료되기 때문에 피해를 최소화 할 수 있다.
2. Refresh Token을 발급하여 Access Token이 만료되어도 Refresh Token을 검증하여 새로운 Access Token을 발급할 수 있다. 이렇게 하면 사용자가 자주 로그인할 필요도 없다. 하지만 서버는 Refresh Token을 별도로 저장하고 있어야 하므로 JWT의 장점을 완벽하게 누릴 수 없다는게 단점이다.

## 토큰 무효화의 어려움 (stateless의 양면)

JWT의 장점인 "서버가 세션 상태를 저장하지 않아도 된다"는 곧 "서버가 이미 발급한 토큰을 즉시 무효화하기 어렵다"는 뜻이기도 하다.

- 사용자가 로그아웃해도 만료 시간이 남아 있으면 토큰은 계속 유효하다.
- 토큰이 탈취돼도 서버가 강제로 폐기하기 어렵다.

현실적 보완책은 JWT를 완전히 stateless하게 두지 않고 **서버가 토큰 상태를 일부 제어**하는 것이다.

| 방식 | 내용 | 트레이드오프 |
|---|---|---|
| 짧은 만료 + Refresh Token | Access Token 수명을 짧게, 재발급은 Refresh로 | 탈취 피해 시간 축소. → [[Refresh-Token-Rotation]] |
| 블랙리스트 (Redis 등) | 로그아웃, 탈취된 토큰 ID(jti)를 저장소에 등록해 거부 | 매 요청 저장소 조회 → stateless 장점 일부 상실 |
| stateful token / 세션 | 서버가 토큰 상태를 직접 보유 | 무효화는 쉬움. 스케일아웃 시 공용 저장소(Redis) 필요 |

핵심: 즉시 무효화가 중요한 서비스일수록 순수 stateless를 고집하지 말고, 저장소를 끼워 제어권을 일부 되찾는 게 안전하다. JWT의 편의와 서버 제어력은 맞바꾸는 관계다.

## 토큰 저장 위치 (XSS와의 관계)

발급한 토큰을 클라이언트 어디에 두느냐가 탈취 위험을 좌우한다.

| 저장 위치 | 장점 | 위험 |
|---|---|---|
| 로컬 스토리지 | JS에서 자유롭게 접근(디코딩 등) | JavaScript로 읽혀서 [[XSS]] 발생 시 토큰 탈취 위험 큼 |
| 쿠키 + `HttpOnly` | JS 접근 차단 → XSS 탈취 방어 | 클라이언트에서 직접 디코딩이 필요한 구조면 제약. CSRF 대비 필요 |

보안 관점에서 인증 토큰은 **서버가 제어할 수 있는 방식**이 더 안전하다. 가능하면 세션 기반 또는 stateful token을 고려하고, 스케일아웃이 필요하면 Redis 같은 공용 저장소를 함께 쓴다. 쿠키 사용 시 `HttpOnly`, `Secure`, `SameSite`를 함께 건다 → [[Security-Headers]], [[CSRF]].

## 면접 포인트

Q. JWT로 로그아웃을 어떻게 구현하나?
- 순수 JWT는 즉시 무효화가 안 된다. 짧은 만료 + Refresh Token으로 피해 시간을 줄이고, 즉시 폐기가 필요하면 jti 블랙리스트(Redis)나 stateful 방식을 쓴다. 그만큼 stateless 장점은 일부 포기한다.

Q. 토큰은 어디에 저장하나?
- 로컬 스토리지는 XSS에 토큰이 노출된다. HttpOnly 쿠키가 XSS 탈취에 강하지만 CSRF 대비가 필요하다. 인증 토큰은 서버가 제어 가능한 방식이 더 안전하다.

## 출처
- [웹보안 — 딩코딩코 (개발자 취업 필수 개념 강의)](https://fern-freeze-290.notion.site/37aade118e3680908aeee8bb5a517c7d)

## 관련 문서
- [[Session]]
- [[OAuth2]]
- [[Refresh-Token-Rotation|Refresh Token Rotation]]
- [[XSS|XSS (로컬 스토리지 토큰 탈취)]]
- [[Application-Security|애플리케이션 보안]]
