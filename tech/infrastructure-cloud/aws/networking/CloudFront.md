---
tags: [infrastructure, aws, cloudfront, cdn, cache, edge]
status: done
category: "Infrastructure - AWS"
aliases: ["CloudFront", "AWS CloudFront", "Amazon CloudFront"]
verified_at: 2026-07-15
---

# Amazon CloudFront

AWS의 **CDN(Content Delivery Network) 서비스**. HTTP/HTTPS로 S3, ALB, EC2, 외부 서버를 캐싱해 전 세계 Edge Location에서 콘텐츠를 빠르게 제공한다. AWS 백본 네트워크를 통해 Edge 간 콘텐츠 공유.

## 핵심 구성 요소

| 용어 | 의미 |
|------|------|
| **Origin Server** | 캐싱 대상 원본 서버 (S3, ALB, EC2, 외부 서버) |
| **Custom Origin** | AWS 외부의 HTTP 서버를 Origin으로 등록한 경우 |
| **Edge Location (PoP)** | 사용자 가까이에 위치한 캐시 서버. 전 세계 200+개 |
| **Regional Edge Cache** | Edge와 Origin 사이 중간 계층 캐시 (히트율 개선) |
| **Distribution** | Origin과 Edge를 묶는 배포 단위. 도메인 1개, 설정 1세트 |
| **TTL** | 캐시 유효 시간. Distribution, Behavior 단위로 조정 |

## 콘텐츠 전달 흐름

```
사용자 → DNS(Route 53/AWS DNS) → 가장 가까운 Edge Location
                                  ├─ 캐시 hit → 즉시 응답
                                  └─ 캐시 miss → Regional Edge Cache
                                                 ├─ hit → 응답 + Edge 캐시
                                                 └─ miss → Origin 요청 → 응답을 양쪽에 캐싱
```

- Edge 간, Edge↔Origin은 **AWS 백본 네트워크** → 일반 인터넷 경로보다 빠르고 안정
- ALB, EC2, S3 Website 같은 **AWS Origin**에서 Origin → CloudFront 전송은 무료

## Origin 접근 제어 — OAI vs OAC

S3를 Origin으로 사용할 때 **버킷을 Public으로 풀지 않고 CloudFront만 접근 허용**하는 메커니즘.

### OAI (Origin Access Identity) — 레거시

- Distribution마다 고유 Identity 부여, S3 버킷 정책의 `Principal`에 OAI ARN 명시
- 예시 버킷 정책:
```json
{
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity XXX" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::bucket-name/*"
}
```
- **한계**: SSE-KMS 제한, PUT/POST/DELETE 불가, SigV2

### OAC (Origin Access Control) — 2022+ 권장

- OAI의 제약 해소를 위한 후속 기능
- **SSE-KMS 지원**, POST 포함 HTTP Method 지원, **단기 자격 증명**(SigV4)
- 흐름: 클라이언트 → CloudFront 수신 → 캐시 miss 시 **OAC 서명 프로토콜로 요청 서명** → S3 버킷 정책이 `aws:SourceArn` 조건으로 승인/거부
- 신규 구성은 무조건 OAC. OAI 기존 구성도 마이그레이션 권장

## 접근 제어 기능

### Geolocation Restriction (지리적 제한)

- Distribution 단위로 **Allowlist / Blocklist** 국가 지정
- 지정 국가 IP는 응답 거부 (라이선스, 규제, 차단 대응)

### Signed URL / Signed Cookie

- 인증된 사용자만 Distribution 접근 허용. **만료 시각, IP 범위** 지정 가능
- 사용 흐름: 계정 보안자격증명에서 **CloudFront Key Pair 생성** → 백엔드에서 URL/쿠키 서명 → 클라이언트에 전달
- 용도: 유료 미디어 스트리밍, 멤버십 콘텐츠, 다운로드 토큰
- **Signed URL**: 단일 파일 접근. **Signed Cookie**: 다수 파일 묶음 (HLS, DASH 스트리밍)

## 캐시 제어 — TTL과 Cache Invalidation

### TTL

- Origin의 `Cache-Control` 헤더가 우선. 없으면 Distribution Default TTL 적용
- Min/Max/Default TTL을 Behavior별로 지정

### Cache Invalidation

- TTL 만료 전 캐시를 강제 갱신 → Origin 변경을 즉시 반영
- 경로 패턴 무효화: `/images/*`, `/index.html`, 전체 `*`
- **비용 주의**: 월 1,000 경로까지 무료, 이후 경로당 과금
- 배포 루틴에 매번 사용하지 말고 **파일명 해시 전략**과 병행 (배포 산출물은 해시 파일명, `index.html`만 invalidate)

## 비용 — Price Class

Edge Location 리전마다 단가가 달라 **사용 지역을 제한해 비용 절감** 가능.

| Price Class | 사용 리전 | 성능 | 비용 |
|------------|----------|------|------|
| **Price Class All** | 전 세계 모든 Edge | 최고 | 가장 비쌈 |
| **Price Class 200** | 가장 비싼 리전 제외 | 중간 | 중간 |
| **Price Class 100** | 가장 저렴한 리전만 (북미, 유럽 중심) | 낮음 | 가장 저렴 |

추가 요금 포인트:
- 요청 수 + Edge → 사용자 아웃바운드 전송량
- **AWS Origin → CloudFront 무료** (S3, ELB, API Gateway)
- 월 100GB 데이터 전송 허용량 (CloudFront flat-rate Free Plan 기준, 플랜 자격 조건과 최신 요금은 운영 전 확인)
- Invalidation 1,000 경로/월 무료

## 보안 통합

- **HTTPS / HTTP/2 / HTTP/3** 기본 지원
- **ACM 인증서** 필수 시 **us-east-1(N. Virginia)** 리전에서 발급해야 함 (CloudFront 글로벌 서비스 특성)
- **AWS WAF 연동** — L7 공격 필터
- **AWS Shield Standard 자동 포함** — L3/L4 DDoS 방어 (Advanced는 유료)
- **Field-Level Encryption** — 민감 필드만 추가 암호화하여 Origin까지 전달

## Edge Compute — CloudFront Functions vs Lambda@Edge

| 항목 | CloudFront Functions | Lambda@Edge |
|------|----------------------|-------------|
| 실행 위치 | Edge (최말단) | Regional Edge |
| 언어 | JavaScript runtime 2.0 (ES5.1 준수, ES6 이후 일부 기능 지원) | Node.js, Python |
| 최대 실행 시간 | 1ms | 5초(viewer), 30초(origin) |
| 메모리 | 2MB | 최대 10GB |
| 용도 | 헤더 조작, URL 재작성, 간단한 인증 | 이미지 가공, A/B 테스트, 복잡한 인증, SSR |
| 요금 | 매우 저렴 | 상대적으로 비쌈 |

## 정적 사이트 패턴 — S3 + CloudFront

자세한 SPA 배포, OAC 설정, Error Response 처리는 [[CDN]] 참조. 핵심만 요약:

- S3 버킷 Public 차단 → CloudFront만 OAC로 접근
- ACM 인증서는 us-east-1 발급
- SPA 404 대응: CloudFront Error Response 404/403 → `/index.html` 200으로 재매핑
- `index.html`은 `no-cache`, 해시 파일명 자산은 `max-age=31536000, immutable`

## 시험, 면접 체크포인트

- **CDN의 두 가지 효과**: 지리적 근접성(지연 ↓) + Origin 부하 분산
- Origin 종류: AWS Origin (S3, ALB, API Gateway) vs Custom Origin (외부 HTTP)
- **OAI vs OAC** — 신규는 OAC. OAC는 SSE-KMS, SigV4, POST 지원
- **Signed URL vs Signed Cookie** — 단일 vs 다수 파일, HLS/DASH는 Cookie
- **Geolocation Restriction** — Allowlist/Blocklist
- **TTL vs Cache Invalidation** — 무효화는 비용 발생, 파일명 해시 병행
- **Price Class** 3종과 트레이드오프
- **CloudFront Functions vs Lambda@Edge** 선택 기준 (실행 위치, 언어, 시간, 용도)
- ACM 인증서는 **us-east-1** 필수
- AWS Origin → CloudFront 전송 **무료**, Shield Standard 자동 포함

## 출처
- AWS SAA C03 학습 자료 — CloudFront
- [CloudFront flat-rate pricing plans — AWS 공식 문서](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html)
- [CloudFront Functions JavaScript runtime 2.0 — AWS 공식 문서](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-20.html)

## 관련 문서
- [[CDN|CDN 일반 개념, S3+CloudFront 정적 배포]]
- [[S3|S3 (Origin, OAC, Transfer Acceleration)]]
- [[EC2|EC2/ALB/Route 53]]
- [[AWS-Lambda|Lambda@Edge]]
- [[VPC|VPC]]
- [[IAM|IAM (Signed URL, OAC 정책)]]
