---
tags: [infrastructure, network, cdn, cloudfront, performance, cache]
status: done
category: "Infrastructure - Network"
aliases: ["CDN", "Content Delivery Network", "CloudFront"]
---

# CDN (Content Delivery Network)

정적·동적 콘텐츠를 **사용자와 지리적으로 가까운 서버(Edge Location)** 에서 제공해 지연을 줄이는 네트워크. 오리진 서버의 부하를 분산하고 백본 네트워크·캐시 계층을 활용해 전송 속도를 개선한다.

## 왜 필요한가

- **물리적 지연**: 데이터가 빛의 속도로 이동해도 대륙 간 RTT는 수백 ms. 오리진이 1곳이면 멀리 있는 사용자에게는 느릴 수밖에 없음
- **대역폭 비용**: 오리진에서 직접 전송하면 트래픽이 증가할수록 네트워크 비용 폭발
- **스파이크 흡수**: 갑작스러운 트래픽 증가 시 Edge에서 캐시 hit만 나면 오리진 부담 거의 없음
- **보안**: DDoS 트래픽 흡수, TLS 종료, WAF 연동

## 동작 원리

```
사용자 요청
  ↓ (가장 가까운 Edge로 라우팅 — DNS Anycast)
Edge Location
  ├─ 캐시 hit → 즉시 응답
  └─ 캐시 miss → Regional Edge Cache → Origin(S3·ELB·커스텀 서버)
                                        ↓
                                      응답을 Edge까지 캐시하면서 전달
```

- **Edge Location (PoP, Point of Presence)**: 사용자에게 가까운 캐시 서버
- **Regional Edge Cache**: Edge와 Origin 사이 중간 계층 캐시 (AWS CloudFront 특유)
- **Origin**: 원본 콘텐츠 서버 (S3, 로드밸런서, 외부 HTTP 서버 등)

## 주요 구성 요소

| 요소 | 역할 |
|---|---|
| **Cache Key** | 동일 리소스 판단 기준 (URL·헤더·쿠키·쿼리스트링 조합) |
| **TTL (Time To Live)** | 캐시 유효 시간. 짧으면 원본 반영 빠름·히트율 낮음, 길면 반대 |
| **Invalidation** | TTL 만료 전 강제 캐시 제거 (예: 긴급 패치 배포) |
| **Origin Shield** | 여러 Edge가 같은 Origin을 두드리지 않도록 중간 계층이 대표 요청 |

## 캐시 제어 헤더

- `Cache-Control: public, max-age=3600` — 1시간 캐시
- `Cache-Control: no-store` — 캐시 금지 (민감 데이터)
- `Cache-Control: private` — 개인별 응답은 공유 캐시 금지
- `Vary: Accept-Encoding` — 동일 URL이라도 헤더에 따라 다른 응답 캐시
- `ETag`/`Last-Modified` — 조건부 요청으로 재검증

## AWS CloudFront

대표적인 CDN. AWS 생태계(S3·ALB·API Gateway) 오리진과 결합 시 **오리진→Edge 전송 무료**라는 요금 특혜가 있다.

### 주요 기능

| 기능 | 설명 |
|---|---|
| **Edge Network** | 전 세계 수백 개 PoP + Regional Edge Cache 2계층 |
| **OAC (Origin Access Control)** | S3 버킷을 Public으로 풀지 않고 CloudFront만 접근 허용 (OAI의 후속) |
| **Signed URL / Cookie** | 특정 사용자·기간에만 접근 허용 (미디어 스트리밍·유료 콘텐츠) |
| **Lambda@Edge / CloudFront Functions** | Edge에서 요청/응답 변조 — A/B 테스트·헤더 조작·인증 |
| **WAF · Shield 통합** | L7 방어, DDoS 방어 |
| **HTTPS / HTTP/2 / HTTP/3** | 기본 지원 |

### CloudFront Functions vs Lambda@Edge

| 항목 | CloudFront Functions | Lambda@Edge |
|---|---|---|
| 실행 위치 | Edge (최말단) | Regional Edge |
| 언어 | JavaScript (ES5 서브셋) | Node.js·Python |
| 최대 실행 시간 | 1ms | 5초(viewer)·30초(origin) |
| 용도 | 헤더 조작·URL 재작성 | 인증·이미지 가공·B2B 로직 |
| 요금 | 매우 저렴 | 상대적으로 비쌈 |

### 요금 구조

- **요청 수 + 아웃바운드 전송량**으로 과금
- **AWS 오리진 사용 시 오리진→CloudFront 전송은 무료**: S3·ELB·API Gateway
- 리전별 단가 차이 있음 (일본·한국은 미국보다 비쌈)

### 배포(Distribution) 유형

- **표준 배포**: 단일 웹사이트·앱
- **다중 테넌트 배포**: SaaS 플랫폼에서 여러 고객 서브도메인을 중앙 설정으로 관리

## CDN 설계 원칙

### 무엇을 캐시할 것인가

- **정적 리소스**: HTML·CSS·JS·이미지·폰트·동영상 — 무조건 CDN
- **API 응답**: 공개 데이터·집계 결과·랭킹 등 — 개인화 없는 응답은 CDN 캐시 가능
- **개인화 응답**: `Cache-Control: private` 또는 캐시 제외

### Cache Key 설계

- 쿼리스트링 순서까지 정규화 (`?a=1&b=2`와 `?b=2&a=1`을 같은 키로)
- 불필요한 UTM 파라미터는 Cache Key에서 제외 (캐시 hit율 향상)
- 언어별 응답은 `Accept-Language`를 Key에 포함

### Invalidation 전략

- **버전 쿼리스트링**(`style.css?v=20260418`) — 새 버전 배포 시 파일명·쿼리 변경
- **Invalidation API** — 기존 객체 강제 삭제 (요청당 요금 있음)
- **짧은 TTL + 긴 Max-Age** 조합 — stale-while-revalidate

## 정적 사이트 배포 — S3 + CloudFront

SPA·정적 블로그·랜딩 페이지를 배포하는 표준 AWS 패턴. **S3가 원본 저장소, CloudFront가 글로벌 캐시**.

### 기본 아키텍처

```
사용자 → Route 53 (DNS) → CloudFront Edge → (캐시 miss) → S3 버킷 (origin)
                              ↓ HTTPS (ACM)
                            응답
```

### 구성 단계

1. **S3 버킷 생성** — 정적 파일 업로드. **Public Access 전부 차단** (CloudFront만 접근)
2. **CloudFront Distribution 생성** — Origin을 S3로 지정
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
| 시그니처 | SigV2 | SigV4 |

신규 구성은 **OAC 사용**. 기존 OAI는 유지 가능하지만 점진적으로 OAC로 전환 권장.

### SPA 라우팅 문제 (404 대응)

React·Vue·Next.js(정적 export) 같은 SPA는 `/users/123` 같은 경로가 S3에 실제 파일로 없어서 **S3가 404 반환 → CloudFront가 404 전달**. 해결:

- **Error Response 재정의**: CloudFront에서 404·403 응답을 `index.html` + HTTP 200으로 변환
- **CloudFront Functions**로 요청 URL에서 `.html` 확장자 자동 부착·리다이렉트 처리

### 캐시 무효화 전략

SPA 배포 시 `index.html`은 항상 최신이 필요하고, 자산(`assets/*.js`·`*.css`)은 해시 파일명으로 빌드되어 무한 캐시 가능.

- `index.html`: `Cache-Control: no-cache` (매 요청마다 재검증)
- `assets/*.{js,css,png}` (해시 포함 파일명): `Cache-Control: public, max-age=31536000, immutable`
- 배포 시 Invalidation은 `/index.html`만 (자산은 파일명이 바뀌므로 자동 분리)

### 비용 포인트

- **S3 → CloudFront 전송 무료**
- CloudFront의 월 50GB 데이터 전송 무료 (계정별, 프리티어 아님)
- Invalidation은 월 1,000 경로 무료, 이후 경로당 과금 → 파일명 해시 전략이 비용에도 유리

## 흔한 실수

- **쿠키를 Cache Key에 포함시켜 hit율 0%** — 로그인 쿠키가 있으면 전부 다른 키로 취급
- **쿠리스트링 무시 설정** — 일부 파라미터가 응답에 영향을 주는데 캐시가 겹침
- **Invalidation을 배포 루틴으로 사용** — 비용 누적·실시간 반영 지연. 파일명 변경이 정석
- **오리진에 `Cache-Control` 설정 누락** — CDN이 기본 TTL만 적용해 의도와 다름
- **민감 데이터를 `private` 없이 전송** — 공유 캐시가 개인 데이터를 저장할 위험

## 면접 체크포인트

- CDN이 지연을 줄이는 **두 가지 메커니즘** (지리적 근접성 + 오리진 부하 분산)
- Cache Key 설계가 히트율에 미치는 영향
- TTL과 Invalidation의 트레이드오프
- Signed URL을 사용해 **유료 콘텐츠 접근 제어** 하는 방법
- Lambda@Edge vs CloudFront Functions 선택 기준
- **정적 vs 동적 캐시**의 차이와 동적 콘텐츠 캐시 전략(`Vary`·짧은 TTL)

## 출처
- [AWS CloudFront 소개 — 공식 문서](https://docs.aws.amazon.com/ko_kr/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)
- [CloudFront + S3로 정적 웹사이트 배포하기 — 요즘IT](https://yozm.wishket.com/magazine/detail/1360/)

## 관련 문서
- [[Latency-Optimization|레이턴시 최적화 (CDN·캐시 계층)]]
- [[Browser-URL-Flow|브라우저 URL 입력 프로세스]]
- [[Reverse-Proxy|Reverse Proxy]]
- [[Cache-Strategies|캐시 전략 (TTL·Invalidation)]]
- [[AWS|AWS EC2/ASG/ALB]]
