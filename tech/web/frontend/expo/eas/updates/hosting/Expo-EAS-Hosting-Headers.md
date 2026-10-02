---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Hosting 기본 response와 request headers"]
---

# EAS Hosting 기본 response와 request headers

Hosting은 asset에 ETag를 추가하여 If-None-Match 재검증을 지원한다. API route가 OPTIONS를 처리하지 않으면 permissive CORS response를 제공한다. 제한이 필요하면 route에서 OPTIONS를 명시적으로 처리한다.

## CORS, HTTPS와 오류 response

기본 CORS는 Origin을 반영하거나 *, 요청 headers를 반영하거나 *, methods GET/POST/PUT/PATCH/DELETE, Allow-Credentials=true, Expose-Headers=*, Max-Age=3600, Vary=Origin/Access-Control-Request-Headers다. CORS는 인증/권한 검증을 대신하지 않는다. browser의 credential/wildcard 규칙까지 검토하고 허용 origin allowlist를 적용한다.

Strict-Transport-Security가 없으면 max-age=31536000; includeSubDomains; preload를 추가한다. X-Powered-By/X-Aspnet-Version은 제거하고 X-Frame-Options를 Content-Security-Policy directive로 변환한다. unhandled JS error는 Accept:text/html이면 HTML crash page, 그 외 plaintext다. API client는 정상 JSON만 오는 것으로 가정하지 않는다.

## Incoming URL와 forwarded URL

request.url과 Host는 고정 deployment URL, Origin/X-Forwarded-Host는 client가 사용한 alias/custom domain을 나타낼 수 있다. 원문의 global origin은 incoming Origin과 같지만 범용 client Origin을 신뢰하는 인증 정책으로 확장하지 않는다. server API의 origin()은 [[Expo-SDK-Server]]에 있다.

Forwarded는 proxy별 for/host/proto list, X-Forwarded-For는 IP list, X-Forwarded-Proto는 보통 https, X-Real-IP는 원래 client IP다. 첫 Forwarded entry의 for는 원래 IP일 가능성이 높다는 원문 표현이며 신뢰하는 proxy 경계를 검토한다.

## Geo headers

| Header | 값 |
| --- | --- |
| eas-colo | Cloudflare datacenter code |
| eas-ip-continent | AF/AN/AS/EU/NA/OC/SA |
| eas-ip-country | ISO3166 Alpha2 두 글자, US/JP 등 |
| eas-ip-region | ISO3166-2 region, 보통 최대3글자 |
| eas-ip-city | optional 도시 이름 |
| eas-ip-latitude / eas-ip-longitude | optional 근사 위치 |
| eas-ip-timezone | 추정 timezone |
| eas-ip-eu | EU 관할로 추정되면 1 |

원문 table의 country 세 글자 설명은 뒤의 Alpha2 계약과 충돌하므로 두 글자를 기준으로 한다. geo 추정은 GPS 또는 사용자 확인과 같지 않다. 로그 보존과 개인정보 정책을 함께 결정한다.

## 출처

- [Expo Documentation, Default responses and headers](https://docs.expo.dev/eas/hosting/reference/responses-and-headers)

## 관련 문서

- [[Expo-EAS-Hosting-Cache]]
- [[Expo-EAS-Hosting-Observability]]
- [[Expo-SDK-Server]]
