---
tags: [security, crypto, encryption, deletion, privacy, kms]
status: done
verified_at: 2026-10-06
category: "Security - 암호"
aliases: ["Crypto-shredding", "Cryptographic Erase", "암호학적 삭제"]
---

# Crypto-shredding (암호학적 삭제)

데이터를 암호화해 저장하고, 지워야 할 때 키를 파기해 그 키로 만든 암호문 사본 전체를 읽을 수 없게 만드는 삭제 방식이다. 백업, 불변 로그와 cloud storage처럼 사본을 하나씩 덮어쓸 수 없는 곳에서 삭제 대상을 키로 좁힌다. 평문 사본이나 키 사본이 하나라도 남으면 그 경로로 데이터를 다시 읽을 수 있어 삭제가 끝나지 않는다.

## 정의

NIST SP 800-88r2(2025-09 발행, 2014-12의 r1을 대체)는 cryptographic erase(CE)를 암호화된 대상 데이터의 기밀성을 보호하는 하나 이상의 키에 key sanitization을 적용해, 복호화된 대상 데이터의 복구를 현실적으로 불가능하게 만드는 purge 기법으로 정의한다.

데이터 소유자가 물리 매체에 직접 접근할 수 없는 cloud storage 같은 논리 저장소에서는 CE가 유일하게 쓸 수 있는 purge 기법일 수 있다. 그래서 NIST는 민감 데이터를 넣기 전에 쓸 수 있는 purge 기법과 그 효과를 먼저 확인하라고 권고한다.

NIST 문서는 저장 매체의 sanitization 지침이다. 정보주체나 테넌트 단위의 crypto-shredding은 같은 키 파기 원리를 애플리케이션 범위에 적용한 것이므로 아래 전제를 그대로 점검한다(적용 해석).

## 키 계층이 파기 범위를 정한다

봉투 암호화에서는 data key가 데이터를 암호화하고 key-wrapping key(KMS key 등)가 data key를 암호화한다([[KMS#Envelope Encryption (봉투 암호화)|봉투 암호화]]). 어느 계층의 키를 파기하는지에 따라 읽을 수 없게 되는 범위가 달라진다.

- data key의 평문과 감싼 사본을 모두 파기하면 그 data key로 만든 암호문을 복호화할 수 없다.
- key-wrapping key와 그 감싼 사본을 모두 파기하면 그 key가 보호하던 data key를 복호화할 수 없으므로, 그 data key들로 만든 암호문도 복호화할 수 없다.
- 대상 키를 파기할 때는 그 아래 계층의 키도 모두 제거한다. 대상 키가 나중에 복구될 때를 대비한 추가 보호다.

정보주체별 data key를 파기하면 범위가 한 사람이고, 테넌트별 KMS key를 파기하면 그 테넌트 전체다. 회원 탈퇴나 고객사 계약 종료처럼 실제로 지워야 하는 단위에 키 단위를 맞춘다(설계 판단).

```text
쓰기: GenerateDataKey -> 평문 data key로 데이터 암호화 -> 평문 data key 폐기 -> 감싼 data key만 key store에 저장
파기: key store의 감싼 data key와 그 백업 사본 제거 -> 메모리와 cache의 평문 data key 제거 -> 실행 기록
```

## 전제 조건

| 점검 | 근거 | 애플리케이션에서 볼 곳 |
|---|---|---|
| 평문으로 저장된 적이 없다 | CE는 암호화된 데이터의 키만 파기할 수 있다. 평문으로 저장된 적이 있는 민감 데이터에는 다른 sanitization 기법이 필요하다 | 로그, 검색 색인, cache, 분석 저장소와 export 파일의 평문 사본은 따로 지운다([[Soft-Delete-and-Data-Lifecycle#사본별 삭제 전파와 완료 시점\|사본별 삭제 전파]]) |
| 키의 모든 사본을 파기할 수 있다 | 대상 키의 모든 사본이 sanitize 가능해야 한다. 백업되거나 escrow된 매체는 키를 어디에 어떻게 보관했는지 높은 확신이 없으면 CE를 신뢰하지 않고, 그 사본에는 별도 sanitization 정책을 적용한다 | key store의 백업과 복제본, 다중 리전 키의 다른 리전 키, CloudHSM 키 스토어의 클러스터 백업과 삭제에 실패해 클러스터에 남은 키 머티리얼, `EXTERNAL` 원본 키의 외부 사본(키 머티리얼만 삭제했으면 다시 가져와 복구되고, 비대칭과 HMAC 키는 KMS 키를 삭제한 뒤에도 같은 머티리얼로 새 키를 만들 수 있다, [[KMS\|KMS]]) |
| 이미 풀린 키가 남지 않는다 | CE 전에 풀려 휘발성 메모리에 올라간 키도 제거해야 한다 | 애플리케이션 메모리와 data key cache(적용 해석) |
| 키를 외부에서 다시 주입할 수 없다 | 대상 키나 그 아래 계층의 키가 키 관리 서버나 key escrow에 있으면 나중에 복호화에 쓰일 수 있다 | KMS, 별도 key escrow |
| 암호 강도가 충분하다 | 운영 모드를 포함한 보안 강도가 128비트 이상이어야 하고 ECB 모드는 허용되지 않는다 | 알고리즘과 운영 모드 |

감싼 data key를 암호문과 같은 DB에 두면 DB 백업에도 감싼 data key가 남는다. key-wrapping key가 살아 있는 한 그 백업을 복원해 복호화할 수 있으므로, 운영 DB의 key 행만 지워서는 crypto-shredding이 끝나지 않는다. 백업 속 사본까지 지울 수 없으면 한 계층 위의 key-wrapping key를 파기해야 하고, 그러면 같은 key 아래의 다른 데이터도 함께 읽을 수 없게 된다. 이때 백업 속 감싼 data key는 남으므로 상위 key의 모든 사본을 파기했는지에 의존하게 된다. 그래서 key store를 데이터 백업과 분리하고 key store 백업의 보존 기간을 삭제 기한 안으로 둔다. 키를 잃으면 그 키로 보호한 데이터도 읽을 수 없으므로 key store의 복구 가능성과 삭제 기한을 함께 설계한다(설계 판단).

## 한계와 법적 판단

- **장기 기밀성:** 수십 년 동안 기밀성을 지켜야 하는 데이터는 암호문이 남아 있는 동안 위험이 이어진다. 알고리즘 약점이 발견되거나 양자 컴퓨팅 같은 계산 능력으로 키를 복구할 수 있게 되면 데이터도 복구될 수 있어, NIST는 이런 경우 CE가 적합하지 않을 수 있다고 본다.
- **암호문의 잔존:** 키를 파기해도 암호문은 백업 보존 기간이 끝날 때까지 남는다. Google Cloud는 고객 데이터를 암호화한 키가 없으면 그 데이터가 백업 시스템에 남아 있는 기간에도 복구할 수 없다고 설명한다(2026-10-06 확인).
- **한국 법령의 파기 기준:** 표준 개인정보 보호지침(개인정보보호위원회고시 제2025-4호, 2025-04-11 시행) 제10조는 복원이 불가능한 방법을 현재의 기술수준에서 사회통념상 적정한 비용으로 파기한 개인정보의 복원이 불가능하도록 조치하는 방법으로 정의한다. CE를 이 기준의 파기로 인정한 감독기관 해석은 이 문서의 출처에서 확인하지 못했다. 적용 전에 법무 검토를 거친다([[Privacy-Operations-for-Small-Business#탈퇴하거나 계약이 끝나면 언제 지우는가|대표의 개인정보 운영]]).

## 운영 체크포인트

- 실행 기록에는 파기한 키의 계층(data key, key-wrapping key, key-derivation key), 암호화되지 않은 영역과 그 처리 방법, 키가 저장된 위치 일부를 sanitize하지 못했을 때 성공과 실패를 보고할 수 있는지를 남긴다.
- 한국 법령에 따른 파기 기록과 개인정보 보호책임자의 결과 확인은 [[Privacy-Operations-for-Small-Business|대표의 개인정보 운영]]을 따른다.
- AWS KMS 고객 관리형 키는 삭제를 예약하면 7~30일(기본 30일)의 대기 기간을 거쳐 삭제되며, 실제 삭제는 예약보다 최대 24시간 늦을 수 있다. 삭제된 뒤에는 그 키로 암호화한 데이터를 복호화할 수 없지만 다중 리전 복제 키와 가져온 키 머티리얼을 쓰는 비대칭, HMAC 키는 예외이고, 삭제 예약이 그 키로 암호화한 data key에 바로 영향을 주지 않을 수 있다(2026-10-06 확인). 대기 기간을 삭제 완료 시점에 넣고, 확신이 없으면 비활성화부터 한다([[KMS#고객 관리형 키 (CMK)|KMS 키 삭제]]).
- 키를 파기한 뒤 백업 복원 리허설에서 대상 데이터가 실제로 복호화되지 않는지 확인한다(설계 판단, [[Backup-Restore|백업과 복원]]).

## 면접 체크포인트

- crypto-shredding이 백업과 불변 로그의 삭제를 다루는 방식과 그 전제
- 감싼 data key를 데이터와 같은 백업에 두면 실패하는 이유
- 정보주체별 키와 테넌트별 키의 파기 범위 차이
- 로그, 검색 색인, cache의 평문 사본이 CE로 해결되지 않는 이유
- 장기 기밀성이 필요한 데이터에 CE가 부적합할 수 있는 이유

## 출처

- [NIST, SP 800-88r2 Guidelines for Media Sanitization](https://csrc.nist.gov/pubs/sp/800/88/r2/final)
- [NIST, Cryptographic Erase](https://csrc.nist.gov/glossary/term/cryptographic_erase)
- [Google Cloud, Data deletion on Google Cloud](https://docs.cloud.google.com/docs/security/deletion)
- [AWS KMS, Delete an AWS KMS key](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html)
- [국가법령정보센터, 표준 개인정보 보호지침](https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000257592)

## 관련 문서

- [[KMS|AWS KMS (봉투 암호화, 키 삭제 대기)]]
- [[Event-Sourcing|Event Sourcing (append-only 이벤트와 개인정보)]]
- [[Soft-Delete-and-Data-Lifecycle|Soft delete와 데이터 생명주기]]
- [[Backup-Restore|백업과 복원]]
- [[Privacy-Operations-for-Small-Business|대표의 개인정보 운영]]
- [[HSM-Key-Custody|HSM과 서명 키 관리]]
