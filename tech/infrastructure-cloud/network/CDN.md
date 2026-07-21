---
tags: [infrastructure, network, cdn, cloudfront, performance, cache]
status: done
category: "Infrastructure - Network"
aliases: ["CDN", "Content Delivery Network"]
verified_at: 2026-07-21
---

# CDN (Content Delivery Network)

정적, 동적 콘텐츠를 **사용자와 지리적으로 가까운 서버(Edge Location)** 에서 제공해 지연을 줄이는 네트워크. 오리진 서버의 부하를 분산하고 백본 네트워크, 캐시 계층을 활용해 전송 속도를 개선한다.

## 왜 필요한가

- **물리적 지연**: 데이터가 빛의 속도로 이동해도 대륙 간 RTT는 수백 ms. 오리진이 1곳이면 멀리 있는 사용자에게는 느릴 수밖에 없음
- **대역폭 비용**: 오리진에서 직접 전송하면 트래픽이 증가할수록 네트워크 비용 폭발
- **스파이크 흡수**: 갑작스러운 트래픽 증가 시 Edge에서 캐시 hit만 나면 오리진 부담 거의 없음
- **보안**: DDoS 트래픽 흡수, TLS 종료, WAF 연동

## 동작 원리

```
사용자 요청
  ↓ (DNS가 지연시간 등을 바탕으로 적합한 Edge로 라우팅)
Edge Location
  ├─ 캐시 hit → 즉시 응답
  └─ 캐시 miss → Regional Edge Cache → Origin(S3, ELB, 커스텀 서버)
                                        ↓
                                      응답을 Edge까지 캐시하면서 전달
```

- **Edge Location (PoP, Point of Presence)**: 사용자에게 가까운 캐시 서버
- **Regional Edge Cache**: Edge와 Origin 사이의 중간 캐시 계층. 동적 요청, 일부 HTTP 메서드와 같은 경우에는 이 계층을 건너뜀
- **Origin**: 원본 콘텐츠 서버 (S3, 로드밸런서, 외부 HTTP 서버 등)

## 주요 구성 요소

| 요소 | 역할 |
|---|---|
| **Cache Key** | 동일 리소스 판단 기준 (URL, 헤더, 쿠키, 쿼리스트링 조합) |
| **TTL (Time To Live)** | 캐시 유효 시간. 짧으면 원본 반영 빠름, 히트율 낮음, 길면 반대 |
| **Invalidation** | TTL 만료 전 강제 캐시 제거 (예: 긴급 패치 배포) |
| **Origin Shield** | 여러 Edge가 같은 Origin을 두드리지 않도록 중간 계층이 대표 요청 |

## 캐시 제어 헤더

- `Cache-Control: public, max-age=3600` — 1시간 캐시
- `Cache-Control: no-store` — 캐시 금지 (민감 데이터)
- `Cache-Control: private` — 개인별 응답은 공유 캐시 금지
- `Vary: Accept-Encoding` — 일반 HTTP 캐시에 헤더별 variant를 알린다. CloudFront에서는 `Vary`만으로 임의 request header가 cache key에 추가되지 않으므로 cache policy도 함께 설정
- `Cache-Control: public, s-maxage=60, stale-while-revalidate=59` — **동적 캐싱**. 모든 사용자에게 같은 공개 응답을 짧게 공유 캐시하고, 지원하는 캐시에서는 만료 후 stale 응답을 제공하면서 재검증할 수 있다. 실제 지연시간과 오리진 절감률은 캐시 hit율과 워크로드로 측정한다. 개인 프로필처럼 사용자별 응답에는 그대로 적용하면 안 된다.
- `ETag`/`Last-Modified` — 조건부 요청으로 재검증

## AWS CloudFront

대표적인 CDN. AWS가 정한 대상 서비스에서 CloudFront로 전송되는 데이터에는 별도 데이터 전송 요금이 부과되지 않지만, CloudFront 요청과 viewer 전송 등은 선택한 요금제와 리전에 따라 과금된다.

### 주요 기능

| 기능 | 설명 |
|---|---|
| **Edge Network** | 전 세계 수백 개 PoP + Regional Edge Cache 2계층 |
| **OAC (Origin Access Control)** | 일반 S3 bucket origin을 public으로 풀지 않고 CloudFront만 접근 허용. S3 website endpoint는 custom origin이라 OAC/OAI 사용 불가 |
| **Signed URL / Cookie** | 특정 사용자, 기간에만 접근 허용 (미디어 스트리밍, 유료 콘텐츠) |
| **Lambda@Edge / CloudFront Functions** | Edge에서 요청/응답 변조 — A/B 테스트, 헤더 조작, 인증 |
| **WAF, Shield 통합** | L7 방어, DDoS 방어 |
| **HTTPS / HTTP/2 / HTTP/3** | 기본 지원 |

### CloudFront Functions vs Lambda@Edge

| 항목 | CloudFront Functions | Lambda@Edge |
|---|---|---|
| 실행 위치 | Edge (최말단) | Regional Edge |
| 언어 | JavaScript runtime 2.0, ES 5.1과 일부 ES 6~12 기능 | 지원되는 Node.js, Python 런타임 |
| 실행 시간 | submillisecond 용도, compute utilization 제한 | viewer와 origin 이벤트 모두 최대 30초 |
| 용도 | 헤더 조작, URL 재작성 | 인증, 이미지 가공, 복잡한 로직 |
| 요금 | 매우 저렴 | 상대적으로 비쌈 |

### 요금 구조

- Pay-as-you-go는 주로 **요청 수 + viewer 아웃바운드 전송량**으로 과금하고 위치별 단가가 다르다. Flat-rate plan은 플랜에 포함된 요청, 전송량과 기능 범위로 계산하므로 같은 식을 그대로 적용하지 않음
- **지원되는 AWS 오리진에서 CloudFront로 보내는 데이터 전송은 별도 요금 없음**. 구체적인 서비스와 예외는 최신 요금표 확인

### 배포(Distribution) 유형

- **표준 배포**: 단일 웹사이트, 앱
- **다중 테넌트 배포**: SaaS 플랫폼에서 여러 고객 서브도메인을 중앙 설정으로 관리

## CDN 설계 원칙

### 무엇을 캐시할 것인가

- **정적 리소스**: 지리적으로 분산된 사용자가 반복 접근하는 HTML, CSS, JS, 이미지, 폰트, 동영상은 CDN의 강한 후보. 소규모 내부 서비스, 접근이 거의 없거나 캐시할 수 없는 콘텐츠는 비용과 복잡성을 비교
- **API 응답**: 공개 데이터, 집계 결과, 랭킹 등 — 개인화 없는 응답은 CDN 캐시 가능
- **개인화 응답**: `Cache-Control: private` 또는 캐시 제외

### Cache Key 설계

- client나 CloudFront Function에서 쿼리스트링 순서를 정규화해 `?a=1&b=2`와 `?b=2&a=1`이 같은 cache key를 만들게 함. CloudFront가 자동으로 순서를 정규화한다고 가정하지 않음
- 불필요한 UTM 파라미터는 Cache Key에서 제외 (캐시 hit율 향상)
- 언어별 응답은 `Accept-Language`를 CloudFront cache policy의 cache key에 포함. `Vary` 응답 헤더만으로는 부족함

### Invalidation 전략

- **버전 쿼리스트링**(`style.css?v=20260418`) — 새 버전 배포 시 파일명, 쿼리 변경
- **Invalidation API** — 기존 객체 강제 삭제. Pay-as-you-go에서는 요청 수가 아니라 제출한 path 수를 세며 계정 전체에서 매월 첫 1,000 path가 무료
- **`max-age` 또는 `s-maxage` + `stale-while-revalidate`** — fresh TTL이 지난 뒤 stale 응답을 허용할 추가 window를 별도로 지정

## 정적 사이트 배포 — S3 + CloudFront

SPA, 정적 블로그, 랜딩 페이지를 배포하는 표준 AWS 패턴. **S3가 원본 저장소, CloudFront가 글로벌 캐시**.

### 기본 아키텍처

```
사용자 → Route 53 (DNS) → CloudFront Edge → (캐시 miss) → S3 버킷 (origin)
                              ↓ HTTPS (ACM)
                            응답
```

### 구성 단계

1. **S3 general purpose bucket 생성** — 정적 파일 업로드. **Public Access 전부 차단** (CloudFront만 접근)
2. **CloudFront Distribution 생성** — S3 website endpoint가 아니라 일반 S3 bucket origin을 지정
3. **OAC(Origin Access Control)** 설정 — CloudFront만 S3 읽기 권한. 버킷 정책으로 `aws:SourceArn` 조건 추가
4. **Route 53 Alias 레코드** — 커스텀 도메인 → CloudFront 도메인
5. **ACM 인증서** — us-east-1에서 발급(CloudFront 요구사항). 도메인 검증 후 Distribution에 연결
6. **Default Root Object** — `index.html` 지정 (루트 접근 시 파일명 생략)

### OAI vs OAC

| 항목 | OAI (Origin Access Identity) | OAC (Origin Access Control) |
|---|---|---|
| 출시 | 구식 (레거시) | 2022+ 권장 |
| 지원 리전 | 제한 | 모든 리전 |
| 지원 암호화 | 제한적 | SSE-KMS까지 지원 |
| 동적 S3 요청 | 일부 시나리오 제한 | 정책에서 허용하면 `PUT`, `DELETE`도 서명 가능 |
| 요청 인증 | 레거시 OAI 방식 | SigV4로 origin 요청 서명 가능 |

일반 S3 bucket origin의 신규 구성은 **OAC 사용**. 기존 OAI는 유지 가능하지만 점진적으로 OAC로 전환 권장. 정적 웹사이트 호스팅 endpoint를 custom origin으로 쓰면 OAC와 OAI 모두 적용할 수 없다.

### SPA 라우팅 문제 (404 대응)

React, Vue, Next.js(정적 export) 같은 SPA는 `/users/123` 같은 경로가 S3에 실제 파일로 없어서 S3 origin과 권한 설정에 따라 **403 또는 404가 반환**될 수 있다. 해결:

- **SPA route만 rewrite**: viewer-request 함수에서 알려진 asset 경로와 확장자 요청을 제외하고 client-side route를 `/index.html`로 바꿈. 모든 403/404를 200으로 바꾸면 실제 권한 오류와 누락 asset을 숨길 수 있음
- 정적 export가 실제 `.html` 파일을 생성하는 사이트라면 CloudFront Function으로 해당 경로에만 `.html`을 붙이거나 redirect

### 캐시 무효화 전략

SPA 배포 시 `index.html`은 새 배포를 빠르게 발견하도록 재검증하고, 내용 해시가 파일명에 포함된 자산(`assets/*.js`, `*.css`)은 긴 TTL과 `immutable`을 적용할 수 있다.

- `index.html`: `Cache-Control: no-cache` (매 요청마다 재검증)
- `assets/*.{js,css,png}` (해시 포함 파일명): `Cache-Control: public, max-age=31536000, immutable`
- 배포 시 Invalidation은 `/index.html`만 (자산은 파일명이 바뀌므로 자동 분리)

### 비용 포인트

- **지원되는 S3 origin → CloudFront 데이터 전송은 별도 요금 없음**
- CloudFront flat-rate Free Plan 기준 월 100GB 데이터 전송 허용량 (계정과 배포의 플랜 자격 조건이 있으므로 운영 전 확인)
- Pay-as-you-go invalidation은 계정 전체 월 1,000 path 무료, 이후 path당 과금. Flat-rate plan은 현재 플랜 조건 확인

## 흔한 실수

- **응답에 영향을 주지 않는 쿠키를 Cache Key에 포함** — 값의 종류가 많으면 불필요한 캐시 조각화로 hit율 저하
- **쿠리스트링 무시 설정** — 일부 파라미터가 응답에 영향을 주는데 캐시가 겹침
- **해시 자산 전체를 매번 broad invalidation** — 비용과 반영 대기 증가. 해시 파일명은 새 key로 배포하고 entry HTML처럼 필요한 path만 무효화
- **오리진에 `Cache-Control` 설정 누락** — CDN이 기본 TTL만 적용해 의도와 다름
- **민감 응답의 캐시 정책 누락** — `private` 또는 `no-store`뿐 아니라 해당 behavior의 **Minimum TTL을 0**으로 두고 cache policy를 함께 검증. Minimum TTL이 0보다 크면 CloudFront가 해당 지시자를 무시하고 최소 시간 동안 캐시할 수 있음

## 면접 체크포인트

- CDN이 지연을 줄이는 **두 가지 메커니즘** (지리적 근접성 + 오리진 부하 분산)
- Cache Key 설계가 히트율에 미치는 영향
- TTL과 Invalidation의 트레이드오프
- Signed URL을 사용해 **유료 콘텐츠 접근 제어** 하는 방법
- Lambda@Edge vs CloudFront Functions 선택 기준
- **정적 vs 동적 캐시**의 차이와 동적 콘텐츠 캐시 전략(cache policy, cache key, 짧은 TTL)

## 출처
- [AWS CloudFront 소개 — 공식 문서](https://docs.aws.amazon.com/ko_kr/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)
- [AWS CloudFront 콘텐츠 전달 방식](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html)
- [AWS CloudFront Functions JavaScript runtime 2.0](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-20.html)
- [AWS CloudFront Functions와 Lambda@Edge 비교](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html)
- [AWS CloudFront OAC로 S3 접근 제한](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [AWS CloudFront cache policy와 cache key](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html)
- [AWS CloudFront cache expiration과 Minimum TTL](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
- [CloudFront flat-rate pricing plans — AWS 공식 문서](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html)
- [CloudFront + S3로 정적 웹사이트 배포하기 — 요즘IT](https://yozm.wishket.com/magazine/detail/1360/)

## 관련 문서
- [[Image-Delivery-Optimization|이미지 전송 최적화 (Lambda@Edge 리사이즈, AVIF, GIF→MP4)]]
- [[Latency-Optimization|레이턴시 최적화 (CDN, 캐시 계층)]]
- [[Browser-URL-Flow|브라우저 URL 입력 프로세스]]
- [[Reverse-Proxy|Reverse Proxy]]
- [[Cache-Strategies|캐시 전략 (TTL, Invalidation)]]
- [[EC2|AWS EC2/ASG/ALB]]
