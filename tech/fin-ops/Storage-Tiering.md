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

## 전환 비용 최적화 (업로드 시점 vs Lifecycle vs CopyObject)

기존 객체를 더 싼 클래스로 옮길 때, 전환 자체에 요청 비용이 든다. 방법에 따라 단가가 다르다.

- **업로드 시점 지정이 최선**: 신규 객체는 PutObject에 `StorageClass`를 지정(예: `INTELLIGENT_TIERING`)하면 사후 전환이 필요 없어 **전환 비용 0**.
- **Lifecycle 전환**: 객체 1000개당 약 $0.01. 규칙만 걸면 자동이지만 단가가 높다.
- **CopyObject 수동 전환**: 같은 버킷으로 복사하며 클래스를 바꾼다. ListObjects(1000개당 ~$0.005) + CopyObject(1000개당 ~$0.0045)로 **Lifecycle의 약 절반(~2.2배 저렴)**. 같은 버킷 내 복사라 데이터 전송비는 0.

조합 전략: 앞으로 들어올 객체는 업로드 시점 지정, 이미 쌓인 대량 객체는 CopyObject 일괄 전환, 패턴이 계속 바뀌는 버킷은 Intelligent-Tiering으로 자동화. 전체 버킷 동시 적용은 피하고 **트래픽 높은 버킷부터 선별, 비용 모니터링하며 점진 적용**한다.

## Intelligent-Tiering 동작과 적용 조건

- 자동 전환: **30일 미접근 → IA, 90일 미접근 → Archive Instant Access**. 접근하면 다시 상위 티어로. **복원(조회) 비용 0** — Lifecycle로 Glacier에 내린 객체와 달리 꺼낼 때 추가 요금이 없다.
- 비용: 객체 1000개당 약 $0.0025의 모니터링 요금만 든다.
- **128KB 미만 객체엔 절감 효과 없음** — 모니터링, 자동 티어링 대상이 아니며 Frequent Access 티어에 남는다. 작은 객체가 많으면 Intelligent-Tiering으로 자동 절감되는 범위가 작다.
- 적용 조건: 객체 대부분이 128KB 초과, 간헐적 랜덤 액세스(콜드 전용 아님), 접근 패턴 예측이 어려움, 앞단에 CDN 같은 캐시 계층 존재.

## S3 Inventory로 사전 분석

전환 전에 객체 분포(크기, 개수, 현재 클래스)를 알아야 의사결정이 선다. S3 Inventory는 버킷 전체 객체 메타데이터를 CSV/ORC/Parquet 리포트로 정기 생성한다. Athena로 SQL 분석해 128KB 초과 객체 비중, 총 용량 등을 뽑아 Intelligent-Tiering 적합성을 판단한다.

```sql
SELECT COUNT(*) AS object_count,
       SUM(size)/1024/1024/1024 AS total_size_gb
FROM s3_inventory_table
WHERE size > 128 * 1024;   -- Intelligent-Tiering 티어 이동 대상
```

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
- 128KB 미만 객체가 대부분인데 Intelligent-Tiering 절감을 기대 → 자동 티어링 대상이 아니라 효과가 제한적
- gp2를 gp3로 안 바꿔 손쉬운 절감 방치
- 스냅샷/이전 버전이 무한 누적 → lifecycle 미설정

## 면접 체크포인트

- 저장 단가 vs 조회 요금/복원 지연의 트레이드오프
- S3 클래스 선택 기준(접근 빈도, 즉시성, 내구 AZ)
- 접근 패턴 불명 시 Intelligent-Tiering이 기본인 이유 (복원 비용 0, 128KB 조건)
- 전환 비용 최적화 — 업로드 시점 지정 > CopyObject > Lifecycle 순으로 저렴한 이유
- gp2→gp3 전환 이득, io2를 아끼는 이유
- lifecycle 자동 전환/만료와 스냅샷 누적 관리
- S3 Inventory + Athena로 전환 전 객체 분포를 분석하는 이유

## 출처

- [AWS — S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/)
- [AWS — EBS volume types (gp3 vs gp2)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html)
- [S3 비용 최적화 (Intelligent-Tiering, CopyObject 전환, S3 Inventory) — 인프랩 기술블로그](https://tech.inflab.com/20251029-optimize-s3/)

## 관련 문서

- [[S3|Amazon S3]]
- [[EBS|EBS (gp3/io2)]]
- [[AWS-Pricing|AWS 요금 구조]]
- [[Long-Term-Retention|장기 보존 (관측 데이터 티어링)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화]]
