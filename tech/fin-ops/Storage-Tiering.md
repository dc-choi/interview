---
tags: [finops, aws, s3, storage, tiering, lifecycle, glacier, ebs]
status: done
category: "비용&운영(FinOps)"
aliases: ["Storage Tiering", "Storage tiering", "스토리지 티어링", "S3 storage class", "스토리지 클래스"]
---

# 스토리지 티어링 (Storage Tiering)

데이터는 시간이 지나면 **덜 자주 접근된다**. 모든 데이터를 가장 빠르고 비싼 등급에 두는 건 낭비다. 접근 빈도에 맞춰 싼 등급으로 자동으로 내리는 게 티어링이다. 저장 단가와 **조회 비용/지연을 맞바꾼다**. [[AWS-Pricing]]

## S3 스토리지 클래스

| 클래스 | 단가 | 조회 비용/지연 | 용도 |
|---|---|---|---|
| **Standard** | 높음 | 없음/즉시 | 자주 접근 |
| **Intelligent-Tiering** | 자동 | 자동 이동 | **접근 패턴 모를 때 기본** |
| **Standard-IA** | 중간 | 조회 요금 + 즉시 | 가끔 접근, 빠른 필요 |
| **One Zone-IA** | 더 낮음 | 조회 요금 | 재생성 가능한 비핵심(단일 AZ) |
| **Glacier Instant** | 낮음 | 조회 요금 + 즉시 | 분기 1회, 즉시 필요 |
| **Glacier Flexible** | 더 낮음 | 분~시간 복원 | 아카이브 |
| **Glacier Deep Archive** | 최저 | 12시간 복원 | 규정 보관, 거의 안 봄 |

**핵심 트레이드오프**: 저장 단가가 낮을수록 **조회 요금과 복원 지연이 커진다**. 자주 볼 데이터를 Glacier에 두면 조회 요금이 저장 절감을 넘어선다.

## Lifecycle Policy로 자동 이동

객체 나이에 따라 클래스를 자동 전환/만료한다.

```
0~30일: Standard
30~90일: Standard-IA
90~365일: Glacier Flexible
365일+: 만료(삭제) 또는 Deep Archive
```

접근 패턴이 불확실하면 수동 lifecycle 대신 **Intelligent-Tiering**이 안전하다(접근 빈도를 보고 자동 이동, 소액 모니터링 비용).

## EBS / EFS 티어링

- **EBS gp2 → gp3**: 같은 성능에 단가 ~20% 저렴 + IOPS/처리량 독립 설정. 대부분 전환 이득.
- **io2**: 고IOPS 전용(비쌈) — 정말 필요한 DB만.
- **EBS 스냅샷**: 증분 저장이지만 누적됨 → 보존 정책 필요. [[ECR-Cost-Reduction|ECR lifecycle]]과 같은 발상.
- **EFS Infrequent Access**: 자동으로 IA 클래스로 이동.

## 관측 데이터와 연결

로그/메트릭 장기 보존도 같은 원리 — 핫은 빠른 스토리지, 콜드는 S3/Glacier. [[Long-Term-Retention]]

## 흔한 함정

- 자주 보는 데이터를 Glacier에 → 조회 요금이 저장 절감 초과
- 작은 객체 다량을 IA/Glacier에 → 최소 객체 크기/기간 과금으로 역효과
- Intelligent-Tiering 모니터링 비용을 작은 객체에 적용 → 비효율
- gp2를 gp3로 안 바꿔 손쉬운 절감 방치
- 스냅샷/이전 버전이 무한 누적 → lifecycle 미설정

## 면접 체크포인트

- 저장 단가 vs 조회 요금/복원 지연의 트레이드오프
- S3 클래스 선택 기준(접근 빈도, 즉시성, 내구 AZ)
- 접근 패턴 불명 시 Intelligent-Tiering이 기본인 이유
- gp2→gp3 전환 이득, io2를 아끼는 이유
- lifecycle 자동 전환/만료와 스냅샷 누적 관리

## 출처

- [AWS — S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/)
- [AWS — EBS volume types (gp3 vs gp2)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html)

## 관련 문서

- [[S3|Amazon S3]]
- [[EBS|EBS (gp3/io2)]]
- [[AWS-Pricing|AWS 요금 구조]]
- [[Long-Term-Retention|장기 보존 (관측 데이터 티어링)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화]]
