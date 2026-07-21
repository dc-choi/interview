---
tags: [infrastructure, aws, cloudfront, cdn, cache, edge]
status: done
category: "Infrastructure - AWS"
aliases: ["CloudFront", "AWS CloudFront", "Amazon CloudFront"]
verified_at: 2026-07-21
---

# Amazon CloudFront

AWS의 **CDN(Content Delivery Network) 서비스**. HTTP/HTTPS origin의 캐시 가능한 콘텐츠를 전 세계 Edge Location에서 제공하고, 캐시 miss는 Regional Edge Cache 또는 origin으로 전달한다.

## 핵심 구성 요소

| 용어 | 의미 |
|------|------|
| **Origin Server** | 캐싱 대상 원본 서버 (S3, ALB, EC2, 외부 서버) |
| **Custom Origin** | ALB, EC2, S3 website endpoint, 외부 서버처럼 HTTP(S)로 연결하는 origin |
| **Edge Location (PoP)** | viewer 요청을 처리하는 분산 캐시 지점 |
| **Regional Edge Cache** | Edge와 Origin 사이 중간 캐시. 동적 요청, 일부 메서드와 같은 경우 건너뜀 |
| **Distribution** | origin, cache behavior, 인증서와 도메인 설정을 묶는 배포 단위. 여러 origin과 alternate domain name 구성 가능 |
| **TTL** | 캐시 유효 시간. Distribution, Behavior 단위로 조정 |

## 콘텐츠 전달 흐름

```
사용자 → DNS → 지연시간 등을 바탕으로 선택된 Edge Location
                                  ├─ 캐시 hit → 즉시 응답
                                  └─ 캐시 miss → Regional Edge Cache
                                                 ├─ hit → 응답 + Edge 캐시
                                                 └─ miss → Origin 요청 → cache policy에 따라 응답 캐싱
```

- CloudFront는 AWS의 글로벌 네트워크와 캐시 계층을 사용하지만 실제 지연시간과 가용성 개선 폭은 viewer 위치, origin과 cache hit율로 측정
- AWS가 정한 지원 origin에서 CloudFront로 보내는 데이터 전송에는 별도 요금이 없으며, viewer 전송과 요청 요금은 선택한 플랜에 따름

## Origin 접근 제어 — OAI vs OAC

일반 S3 bucket origin을 사용할 때 **버킷을 public으로 풀지 않고 CloudFront만 접근 허용**하는 메커니즘이다. S3 website endpoint는 custom origin으로 취급하므로 OAI와 OAC를 사용할 수 없다.

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
- **한계**: OAC와 달리 모든 S3 Region, SSE-KMS와 동적 `PUT`/`DELETE` 요청을 완전하게 지원하지 않음

### OAC (Origin Access Control) — 2022+ 권장

- OAI의 제약 해소를 위한 후속 기능
- **모든 S3 Region과 SSE-KMS 지원**, 정책에서 허용한 동적 `PUT`/`DELETE` 요청을 SigV4로 서명 가능
- 흐름: 클라이언트 → CloudFront 수신 → 캐시 miss 시 **OAC 서명 프로토콜로 요청 서명** → S3 버킷 정책이 `aws:SourceArn` 조건으로 승인/거부
- 일반 S3 bucket origin의 신규 구성에는 OAC를 권장한다. OAI 기존 구성도 호환성을 확인해 마이그레이션

## 접근 제어 기능

### Geolocation Restriction (지리적 제한)

- Distribution 단위로 **Allowlist / Blocklist** 국가 지정
- 지정 국가 IP는 응답 거부 (라이선스, 규제, 차단 대응)

### Signed URL / Signed Cookie

- 인증된 사용자만 Distribution 접근 허용. **만료 시각, IP 범위** 지정 가능
- 사용 흐름: public key와 **trusted key group** 구성 → 백엔드가 대응 private key로 URL/쿠키 서명 → 클라이언트에 전달. AWS account key pair 방식은 레거시이므로 신규 구성에 권장하지 않음
- 용도: 유료 미디어 스트리밍, 멤버십 콘텐츠, 다운로드 토큰
- **Signed URL**: 단일 파일 접근. **Signed Cookie**: 다수 파일 묶음 (HLS, DASH 스트리밍)

## 캐시 제어 — TTL과 Cache Invalidation

### TTL

- cache behavior의 cache policy가 Origin의 `Cache-Control`과 함께 실제 TTL을 결정한다. 헤더가 없으면 Default TTL을 사용
- Min/Max/Default TTL을 behavior별로 지정. **Minimum TTL이 0보다 크면 `no-cache`, `no-store`, `private`에도 최소 TTL이 적용될 수 있음**

### Cache Invalidation

- TTL 만료 전 캐시 객체를 무효화한다. 전 세계 edge 반영에는 전파 시간이 걸릴 수 있음
- 경로 패턴 무효화: `/images/*`, `/index.html`, 전체 `*`
- **비용 주의**: Pay-as-you-go는 AWS 계정 전체에서 월 첫 1,000 path가 무료이고 이후 path당 과금. Flat-rate plan은 해당 플랜 조건 확인
- 배포 루틴에 매번 사용하지 말고 **파일명 해시 전략**과 병행 (배포 산출물은 해시 파일명, `index.html`만 invalidate)

## 비용 — Price Class

Edge Location 리전마다 단가가 달라 **사용 지역을 제한해 비용 절감** 가능.

| Price Class | 사용 리전 | 성능 | 비용 |
|------------|----------|------|------|
| **Price Class All** | 모든 CloudFront edge | 가장 넓은 지역 커버리지 | 사용 위치별 단가 적용 |
| **Price Class 200** | AWS가 정의한 대부분의 지역 | 제외 지역 viewer는 허용된 다른 edge로 라우팅될 수 있음 | All보다 비용 범위 축소 가능 |
| **Price Class 100** | AWS가 정의한 제한된 저비용 지역 | 제외 지역 viewer의 지연시간이 늘 수 있음 | 가장 제한된 커버리지 |

추가 요금 포인트:
- Pay-as-you-go는 요청 수와 viewer 아웃바운드 전송량, 위치별 단가를 중심으로 계산
- **지원되는 AWS origin → CloudFront 데이터 전송은 별도 요금 없음**. 구체적인 서비스와 예외는 최신 요금표 확인
- CloudFront flat-rate Free Plan은 현재 월 100GB 전송과 100만 요청을 포함하지만 계정, distribution 자격과 최신 플랜 조건을 운영 전 확인
- Pay-as-you-go invalidation 무료량은 계정 전체 1,000 path/월

## 보안 통합

- **HTTPS / HTTP/2 / HTTP/3** 기본 지원
- alternate domain name에 ACM 인증서를 연결할 때는 **us-east-1(N. Virginia)** 리전에서 발급 또는 import. 기본 CloudFront 도메인은 기본 인증서를 사용할 수 있음
- **AWS WAF 연동** — L7 공격 필터
- **AWS Shield Standard 자동 포함** — L3/L4 DDoS 방어 (Advanced는 유료)
- **Field-Level Encryption** — 민감 필드만 추가 암호화하여 Origin까지 전달

## Edge Compute — CloudFront Functions vs Lambda@Edge

| 항목 | CloudFront Functions | Lambda@Edge |
|------|----------------------|-------------|
| 실행 위치 | Edge (최말단) | Regional Edge |
| 언어 | JavaScript runtime 2.0 (ES5.1 준수, ES6 이후 일부 기능 지원) | Node.js, Python |
| 실행 시간 | submillisecond 용도, compute utilization 제한 | viewer와 origin event 모두 최대 30초 |
| 메모리 | 2MB | viewer event 128MB, origin event 최대 10GB |
| 용도 | 헤더 조작, URL 재작성, 간단한 인증 | 이미지 가공, A/B 테스트, 복잡한 인증, SSR |
| 요금 | 매우 저렴 | 상대적으로 비쌈 |

## 정적 사이트 패턴 — S3 + CloudFront

자세한 SPA 배포, OAC 설정, Error Response 처리는 [[CDN]] 참조. 핵심만 요약:

- 일반 S3 bucket의 Public Access 차단 → CloudFront만 OAC로 접근. S3 website endpoint에는 OAC 사용 불가
- ACM 인증서는 us-east-1 발급
- SPA route 대응: asset과 실제 권한 오류를 제외한 client-side route만 viewer-request에서 `/index.html`로 rewrite. 모든 403/404 일괄 200 변환은 피함
- `index.html`은 `no-cache`, 해시 파일명 자산은 `max-age=31536000, immutable`

## 시험, 면접 체크포인트

- **CDN의 두 가지 효과**: 지리적 근접성(지연 ↓) + Origin 부하 분산
- Origin 종류: AWS Origin (S3, ALB, API Gateway) vs Custom Origin (외부 HTTP)
- **OAI vs OAC** — 일반 S3 bucket origin 신규 구성은 OAC. OAC는 SSE-KMS, SigV4와 동적 요청 지원
- **Signed URL vs Signed Cookie** — 단일 vs 다수 파일, HLS/DASH는 Cookie
- **Geolocation Restriction** — Allowlist/Blocklist
- **TTL vs Cache Invalidation** — 무효화는 비용 발생, 파일명 해시 병행
- **Price Class** 3종과 트레이드오프
- **CloudFront Functions vs Lambda@Edge** 선택 기준 (실행 위치, 언어, 시간, 용도)
- alternate domain name용 ACM 인증서는 **us-east-1**에서 준비
- 지원되는 AWS origin → CloudFront 전송은 별도 데이터 전송 요금 없음, Shield Standard 포함

## 출처
- AWS SAA C03 학습 자료 — CloudFront
- [CloudFront flat-rate pricing plans — AWS 공식 문서](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html)
- [CloudFront Functions JavaScript runtime 2.0 — AWS 공식 문서](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-20.html)
- [CloudFront Functions와 Lambda@Edge 비교 — AWS 공식 문서](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html)
- [OAC로 S3 origin 접근 제한 — AWS 공식 문서](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [Signed URL trusted signer — AWS 공식 문서](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-trusted-signers.html)
- [CloudFront cache expiration — AWS 공식 문서](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)

## 관련 문서
- [[CDN|CDN 일반 개념, S3+CloudFront 정적 배포]]
- [[S3|S3 (Origin, OAC, Transfer Acceleration)]]
- [[EC2|EC2/ALB/Route 53]]
- [[AWS-Lambda|Lambda@Edge]]
- [[VPC|VPC]]
- [[IAM|IAM (Signed URL, OAC 정책)]]
