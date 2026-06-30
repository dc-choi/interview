---
tags: [security, web-attacks, ssrf, cloud, owasp]
status: done
category: "Security - 웹 공격"
aliases: ["SSRF", "Server-Side Request Forgery", "서버 측 요청 위조"]
---

# SSRF (Server-Side Request Forgery)

공격자가 **서버에게 대신 요청을 보내게 만드는** 취약점. 서버가 사용자 입력값을 URL로 받아 외부 자원을 가져오는 기능이 있을 때, 공격자가 그 URL을 내부 시스템 주소로 바꿔치기해 서버를 심부름꾼으로 부린다. 서버는 보통 내부망에 접근할 권한이 있으므로, 외부에서 직접 닿지 못하는 자원이 서버를 경유해 노출된다.

## 동작 방식

서비스가 "사용자가 입력한 URL에서 이미지를 가져오는" 기능을 제공한다고 하자.

- 정상: `https://example.com/cat.png` → 서버가 받아와 처리
- 공격: `http://169.254.169.254/...`(클라우드 메타데이터) 또는 `http://internal-admin/...`(내부 서비스) → 서버가 내부 정보를 받아와 공격자에게 넘김

URL을 입력받는 모든 기능(이미지/문서 fetch, 웹훅, URL 미리보기, PDF 렌더링, 파일 임포트)이 잠재적 SSRF 표면이다.

## 클라우드에서 위험이 커지는 이유

AWS, GCP, Azure는 인스턴스 내부에서 자격증명, 설정을 조회하는 **메타데이터 API**를 제공한다(링크 로컬 주소 `169.254.169.254`). SSRF로 이 주소를 찌르면 인스턴스 역할의 임시 자격증명이 유출돼 **클라우드 권한 탈취**로 직결된다.

- 완화: AWS의 경우 IMDSv2(토큰 필요 방식)를 강제하면 단순 SSRF로 메타데이터를 못 읽게 막을 수 있다. 단, 애플리케이션 레벨 방어와 병행해야 한다.

## 방어

가장 좋은 방어는 **허용 목록(화이트리스트)** — 호출 가능한 URL과 스킴(scheme)을 명시적으로 제한한다.

- 허용할 도메인, 허용할 스킴(https만 등)을 화이트리스트로 고정. 블랙리스트는 우회가 쉬워 약하다.
- 화이트리스트가 불가피하게 어려우면 강하게 필터링: `localhost`/`127.0.0.1`, 사설 IP 대역(10/8, 172.16/12, 192.168/16), 링크 로컬(169.254/16), 불필요한 특수문자.
- **DNS rebinding, 리다이렉트 우회** 주의: 도메인을 검증해도 응답이 내부 IP로 리다이렉트되거나 DNS가 내부 IP로 해석될 수 있다. 최종 연결 직전 resolved IP를 재검증한다.
- 가능하면 내부망에서 외부로 나가는 egress 자체를 방화벽으로 제한한다(다층 방어).

## 면접 포인트

Q. SSRF가 뭔가?
- 서버가 사용자 입력 URL로 자원을 가져오는 기능을 악용해, 공격자가 서버에게 내부 주소로 요청을 보내게 만드는 취약점. 서버의 내부망 접근 권한을 빌려 쓴다.

Q. 클라우드에서 왜 더 위험한가?
- 메타데이터 API(169.254.169.254)로 인스턴스 임시 자격증명이 노출돼 클라우드 권한 탈취로 이어진다. IMDSv2 강제가 완화책.

Q. 어떻게 막나?
- 허용 URL/스킴 화이트리스트가 1순위. 불가피하면 localhost, 사설/링크로컬 IP, 특수문자 필터링. DNS rebinding, 리다이렉트 우회 때문에 최종 IP를 연결 직전 재검증하고, egress 방화벽으로 다층 방어한다.

## 출처

- [애플리케이션 보안 핵심 — 시큐어코딩, IDOR, SSRF, JWT, Spring Actuator (YouTube)](https://www.youtube.com/watch?v=RQv86D0M5YY&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=19)

## 관련 문서

- [[Application-Security|애플리케이션 보안 (클라우드 리스크, 4대 원칙)]]
- [[IDOR|IDOR / Broken Access Control]]
- [[Actuator-Exposure|Actuator 노출 (내부 정보 노출)]]
