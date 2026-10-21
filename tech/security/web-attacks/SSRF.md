---
tags: [security, web-attacks, ssrf, cloud, owasp]
status: done
verified_at: 2026-10-22
category: "Security - 웹 공격"
aliases: ["SSRF", "Server-Side Request Forgery", "서버 측 요청 위조"]
---

# SSRF (Server-Side Request Forgery)

공격자가 **서버에게 대신 요청을 보내게 만드는** 취약점. 서버가 사용자 입력값을 URL로 받아 외부 자원을 가져오는 기능이 있을 때, 공격자가 그 URL을 내부 시스템 주소로 바꿔치기해 서버를 심부름꾼으로 부린다. 서버는 보통 내부망에 접근할 권한이 있으므로, 외부에서 직접 닿지 못하는 자원이 서버를 경유해 노출된다.

## 동작 방식

서비스가 사용자가 입력한 URL에서 이미지를 가져오는 기능을 제공한다고 하자.

- 정상: `https://example.com/cat.png` → 서버가 받아와 처리
- 공격: `http://169.254.169.254/...`(클라우드 메타데이터) 또는 `http://internal-admin/...`(내부 서비스) → 서버가 내부 정보를 받아와 공격자에게 넘김

URL을 입력받는 모든 기능(이미지/문서 fetch, 웹훅, URL 미리보기, PDF 렌더링, 파일 임포트)이 잠재적 SSRF 표면이다.

## 클라우드에서 위험이 커지는 이유

AWS, GCP, Azure는 인스턴스 내부에서 자격증명, 설정을 조회하는 **메타데이터 API**를 제공한다(대표적인 링크 로컬 주소 `169.254.169.254`). SSRF로 필요한 메서드와 헤더 등 접근 조건까지 충족하면 임시 자격증명이 유출돼 **클라우드 권한 탈취**로 이어질 수 있다.

- 완화: AWS는 IMDSv2를 요구하고 IMDSv1을 비활성화한다. 토큰 발급과 요청 조건을 추가해 일부 SSRF를 완화하지만, 메서드와 헤더까지 제어할 수 있는 모든 SSRF를 없앤다고 가정하지 않는다. 애플리케이션 방어와 최소 권한을 병행한다.

## 방어

가장 좋은 방어는 **허용 목록(화이트리스트)** — 호출 가능한 URL과 스킴(scheme)을 명시적으로 제한한다.

- 대상이 정해진 연동은 host 허용 목록을 두고 scheme, port와 path를 서버가 구성한다. URL 문자열의 접두사나 특수문자만 검사하지 않고 실제 요청 클라이언트와 같은 해석 규칙으로 비교한다.
- 임의의 외부 URL이 필요한 기능은 IPv4와 IPv6의 loopback, 사설, link-local 및 조직 내부 범위를 함께 차단한다. DNS의 A와 AAAA 결과를 모두 검사하고 IPv4-mapped IPv6 등 다른 표현도 정규화한다. 일부 IPv4 문자열만 차단하는 목록은 충분하지 않다.
- **DNS rebinding, 리다이렉트 우회**: 자동 리다이렉트를 끄거나 매 hop에 같은 목적지 검증을 적용한다. 검사 후 클라이언트가 다시 DNS를 해석해 다른 주소로 연결하지 않도록 검증한 주소와 실제 연결 주소를 일치시키는 경로를 확인한다.
- 가능하면 내부망에서 외부로 나가는 egress 자체를 방화벽으로 제한한다(다층 방어).

## Spring Boot의 주소 필터 적용 경계

2026-10-22 확인한 Spring Boot 4.1.1 레퍼런스와 API 문서 기준이다. `InetAddressFilter`는 4.1.0부터 제공되며, HTTP 클라이언트가 호출할 수 있는 IP 주소를 제한하는 전략이다.

- `InetAddressFilter` bean은 자동 구성된 HTTP client builder에 적용한다. 직접 만든 클라이언트까지 같은 정책을 사용한다고 가정하지 말고 생성 경로를 확인한다.
- 개별 설정은 `HttpClientSettings.withInetAddressFilter(...)`로 전달한다. 공식 예제는 이 설정으로 `ClientHttpRequestFactoryBuilder.jdk().build(settings)`를 만들고 `RestClient`에 연결한다.
- `externalAddresses()`는 외부 IP를 허용하는 필터다. 특정 업무 대상만 허용하는 host 목록과는 범위가 다르다. `of(...)`는 IP와 CIDR 범위를 지정하고 `andNot(...)`으로 제외 조건을 조합할 수 있다.
- `all()`은 모든 주소에 일치하고 `none()`은 어느 주소에도 일치하지 않는다. 허용/차단 연결 확인에 활용할 수 있지만 그 결과만으로 DNS, redirect와 실제 네트워크 경로 전체를 검증했다고 보지 않는다.

주소 필터와 별도로 scheme, host, port, redirect 및 egress 정책을 검토한다. `@HttpExchange` 인터페이스를 사용할 때도 실제 요청을 담당하는 클라이언트의 설정 경로를 확인한다. 여기서는 공식 설정 계약을 대조했으며 실행 테스트는 수행하지 않았다.

## 면접 포인트

Q. SSRF가 뭔가?
- 서버가 사용자 입력 URL로 자원을 가져오는 기능을 악용해, 공격자가 서버에게 내부 주소로 요청을 보내게 만드는 취약점. 서버의 내부망 접근 권한을 빌려 쓴다.

Q. 클라우드에서 왜 더 위험한가?
- 메타데이터 API의 접근 조건을 충족하는 SSRF는 임시 자격증명 유출과 클라우드 권한 탈취로 이어질 수 있다. AWS에서는 IMDSv2 강제와 IMDSv1 비활성화가 완화책이다.

Q. 어떻게 막나?
- 허용 host와 서버가 구성한 요청을 우선한다. 임의 URL이 필요하면 IPv4/IPv6 목적지, DNS 결과와 각 redirect hop을 검사하고 검증한 주소로 실제 연결되는지 확인한다. egress 제한과 메타데이터 접근 통제도 함께 둔다.

## 출처

2026-10-02에는 URL 해석, DNS, IPv6와 리다이렉트 방어 및 IMDSv2의 완화 범위를 아래 공식 자료에 대조했다. 특정 HTTP 클라이언트의 연결 구현을 검증한 기록은 아니다.

2026-10-22에는 Spring Boot 주소 필터의 도입 버전과 구성 범위를 대조했다. OWASP와 AWS의 기존 방어 원칙도 함께 확인했으며, Spring 실행 환경에서의 우회 방어를 검증한 것은 아니다.

- [Spring Boot 4.1.1, Calling REST Services](https://docs.spring.io/spring-boot/reference/io/rest-client.html)
- [Spring Boot 4.1.1, InetAddressFilter](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/http/client/InetAddressFilter.html)
- [OWASP Cheat Sheet Series, Server Side Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Amazon EC2, Use the Instance Metadata Service to access instance metadata](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- [애플리케이션 보안 핵심 — 시큐어코딩, IDOR, SSRF, JWT, Spring Actuator (YouTube)](https://www.youtube.com/watch?v=RQv86D0M5YY&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=19)

## 관련 문서

- [[Application-Security|애플리케이션 보안 (클라우드 리스크, 4대 원칙)]]
- [[IDOR|IDOR / Broken Access Control]]
- [[Actuator-Exposure|Actuator 노출 (내부 정보 노출)]]
