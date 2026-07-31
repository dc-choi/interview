---
tags: [security, cryptography, hsm, pkcs11, jwt, key-rotation, reliability, aws]
status: done
verified_at: 2026-07-31
category: "Security - 암호"
aliases: ["HSM Signing Operations", "PKCS #11 Signing Operations", "JWT Signing Key Rotation", "서명 키 무중단 전환"]
---

# HSM 서명 시스템 운영과 무중단 키 전환

HSM에 개인키를 안전하게 보관해도 서명 시스템의 운영 문제는 남는다. 상태를 가진 PKCS #11 세션, HSM 증설과 축소, 재시도와 대안 경로, 공개키 캐시와 키 전환을 하나의 수명 주기로 설계해야 한다.

## 서명 경로

```text
호출자
  -> 서명 정책 검증
  -> 서명 백엔드 선택
       -> 주 경로: HSM
       -> 대안 경로: KMS
  -> kid와 alg를 포함한 토큰 발급

검증자 -> kid에 대응하는 공개키와 허용된 alg 확인 -> 서명 검증
```

호출자 인증, claim, audience, TTL과 rate limit은 백엔드를 선택하기 전에 검증한다. 그래야 권한이나 입력 오류가 HSM 장애로 오인돼 KMS로 우회되지 않는다.

실제로 HSM과 KMS처럼 둘 이상의 백엔드를 운용할 때는 동일한 입력과 결과를 다루는 작은 signer 계약이 유용하다. 서로 다른 키를 쓰는 백엔드는 `kid`도 분리한다. 선택 가중치, 활성 키와 설정 버전은 원자적으로 배포하고 변경 이력과 즉시 되돌릴 값을 남긴다.

## PKCS #11 세션 모델

PKCS #11 라이브러리는 공유 라이브러리와 FFI를 통해 호출되며 로그인 상태와 세션을 유지한다. HTTP 클라이언트처럼 매 요청마다 연결하기보다 검증된 래퍼와 제한된 세션 풀을 사용한다.

- 스레드가 세션을 동시에 공유하지 않게 하고, 동시 실행 단위마다 독립 세션을 빌린다.
- 매 요청의 키 검색을 피하려면 래퍼가 반환한 키 객체를 클라이언트 수명 안에서 캐시하고 재초기화와 키 교체 시 무효화한다.
- 키 쌍에는 안정적인 `CKA_ID`와 label을 부여하고 래퍼의 조회 방식을 시험한다. 일부 래퍼는 빈 `CKA_ID`로 키 쌍을 찾지 못한다. provider가 정하는 slot 번호를 영구 식별자로 가정하지 않는다.
- key availability check는 기본적으로 키가 둘 이상의 HSM에 있음을 요구한다. 단일 HSM 개발 환경에서 끄더라도 운영 가용성 기준까지 낮추지는 않는다.

## deadline, 재시도와 대안 경로

모든 대기는 하나의 요청 deadline 안에 들어가야 한다.

```text
전체 deadline > 세션 대기 + HSM 시도 합계 + KMS 대안 서명 + 토큰 직렬화
```

| 실패 분류 | 처리 |
|---|---|
| 일시적 busy, throttling, 연결 단절, 장치 제거, timeout | 짧고 제한된 재시도 후 준비된 대안 경로 |
| 세션 풀 고갈 | 제한된 대기와 backpressure, 측정 후 풀이나 Pod 조정 |
| 인증, 권한, 키 없음, 알고리즘과 입력 오류 | 재시도와 우회 없이 실패 |
| 분류하지 못한 오류 | 조용히 우회하지 않고 실패와 진단 정보 기록 |

`CKR_FUNCTION_FAILED` 하나만으로 throttling이라고 단정할 수 없다. Client SDK 로그와 응답 상태를 함께 확인한다. Client SDK 5.8 이상에는 내장 재시도가 있으므로 애플리케이션 재시도를 더하기 전에 버전과 설정을 확인해 재시도 증폭을 막는다.

대안 키의 `kid`와 공개키는 장애 전에 검증자에게 배포돼 있어야 한다. KMS quota, 권한과 지연도 정기적으로 시험한다. 서명 결과를 외부에 공개하기 전의 암호 연산은 다시 시도할 수 있지만, 토큰 발급에 딸린 전체 업무 트랜잭션을 무조건 반복해서는 안 된다.

## 세션 풀과 클러스터 확장

래퍼의 `maxSessions`는 처리량 목표가 아니라 HSM을 과부하에서 격리하는 bulkhead다. Pod별 값만 보지 말고 전체 Pod 수를 곱한 클러스터 총 세션과 HSM 처리 지연을 함께 본다.

- 래퍼가 `poolWaitTimeout`을 제공하면 전체 deadline보다 짧게 두고, 즉시 오류 대신 제한된 대기를 허용한다.
- HSM을 추가해도 기존 장기 세션이 즉시 고르게 재분배된다고 가정하지 않는다. SDK와 래퍼별로 분포를 확인하고 필요하면 풀 갱신이나 순차 재시작을 사용한다.
- HSM을 제거할 때는 부하를 N-1 용량 아래로 낮추고 대안 경로를 준비한다. 진행 중 세션은 실패할 수 있으므로 한 번에 하나씩 축소하며 오류율을 확인한다.
- 클러스터 전체에 동기화되는 token key를 사용한다. 한 HSM에만 존재하는 session key는 HSM 추가로 처리량이나 내구성이 늘지 않는다.

특정 환경에서 안정적이었던 세션 수나 증설 인식 시간은 기본값이 아니다. HSM 유형, 알고리즘, SDK, Pod 수와 실제 동시성으로 부하 시험해 정한다.

## 관측 가능성

애플리케이션 지표에는 signer, `kid`, `alg`, 설정 버전, 결과, 오류 분류, 시도 횟수, fallback 여부, 세션 대기와 서명 지연을 포함한다. 토큰 payload, HSM 사용자 암호와 인증서 개인키는 기록하지 않는다.

- 컨테이너에서는 Client SDK 로그를 표준 출력으로 보내 수집하는 방식을 우선한다. 파일 tailer는 사용하는 SDK나 런타임이 파일 출력만 지원할 때 선택한다.
- `HsmSessionCount`, token key와 session key 점유 지표, HSM 상태를 애플리케이션 지표와 함께 본다.
- CloudTrail은 클러스터 같은 제어 평면 API를 기록하고, HSM 감사 로그는 CloudWatch Logs로 전달된다.
- 어떤 호출자가 어떤 토큰을 요청했는지는 HSM 로그만으로 알 수 없으므로 발급 애플리케이션에 별도 감사 식별자를 남긴다.

## RS256에서 ES256으로 전환할 때

알고리즘 전환은 성능 최적화보다 호환성 마이그레이션에 가깝다.

- 검증자의 알고리즘 허용 목록과 P-256 지원 여부를 먼저 확인한다.
- 알고리즘이 바뀌면 새 키와 새 `kid`를 사용하고, header의 `alg`를 키 선택 대신 검증 조건으로 다룬다.
- JWS의 ES256 서명은 32바이트 `R`과 32바이트 `S`를 이어 붙인 64바이트 형식이다.
- AWS KMS의 ECDSA 서명은 DER 형식이므로 JWS를 만드는 계층에서 고정 길이 `R || S`로 변환한다. 모든 백엔드가 같은 JWT를 만드는지 end-to-end로 시험한다.

한 운영 사례에서 JWT 크기가 약 800바이트에서 500바이트로 줄었지만 claim과 header 크기에 따라 비율은 달라진다. 알고리즘별 처리량과 지연도 실제 HSM과 메시지 크기로 측정한다.

## 무중단 키 전환

전환 중 지켜야 할 불변식은 검증 가능한 키 집합이 현재 서명에 쓰는 키 집합을 항상 포함하는 것이다.

| 단계 | 작업과 통과 조건 |
|---|---|
| 1. 사전 조사 | 모든 검증자와 지원 중인 구버전, 허용 알고리즘, JWKS cache TTL과 갱신 방식, 토큰 최대 수용 기간과 clock skew 확인 |
| 2. 키 준비 | HSM과 대안 백엔드에 서로 다른 새 키를 만들고 각 서명과 공개키 검증 |
| 3. 검증 키 선배포 | 각 백엔드의 새 `kid`와 공개키, 허용 `alg`를 게시하고 가장 느린 검증자까지 갱신 확인 |
| 4. 점진 전환 | 새 키 서명 비율을 올리며 `kid`별 발급과 검증 오류, fallback과 지연 관측 |
| 5. 이전 서명 중단 | 새 키를 100% 사용하되 이전 공개키와 롤백 가능한 이전 개인키를 보호된 상태로 유지 |
| 6. 폐기 | 이전 토큰의 수용 기간과 clock skew가 끝난 뒤 공개키를 제거하고 개인키 접근을 영구 차단하며, 속성과 보존 정책이 허용하면 파기 |

새 키 검증 오류가 늘면 이전 키가 아직 유효한 동안 서명 가중치를 되돌린다. 이전 공개키 제거와 개인키 폐기는 되돌리기 어려우므로 서로 다른 승인 단계로 둔다.

## 최소 장애 시험

- HSM timeout과 throttling에서 재시도 횟수와 전체 deadline이 지켜지는가
- 인증과 권한 오류가 KMS로 우회되지 않는가
- KMS 대안 경로가 예상 피크와 HSM 장애 부하를 감당하는가
- HSM 증설 후 세션과 요청이 실제로 분산되는가
- HSM 축소 중 진행 요청 실패를 drain과 fallback이 흡수하는가
- 새 `kid`를 모르는 캐시된 검증자가 안전하게 갱신하는가
- HSM과 KMS의 ES256 결과가 모두 표준 JWS 형식으로 검증되는가
- 이전 키 토큰이 최대 TTL과 clock skew 동안 계속 검증되는가

## 면접 체크포인트

### HSM 장애 시 KMS로 모두 우회하면 안전한가

- **의도**: 가용성 대안이 보안 정책을 우회할 수 있음을 이해하는지 확인한다.
- **핵심 답변**: timeout 같은 허용된 일시 오류만 제한적으로 우회하고, 권한, 키와 입력 오류는 실패시킨다. 대안 공개키, quota와 동일한 서명 형식도 미리 검증한다.
- **흔한 오답**: HSM 오류로 보이는 모든 예외를 KMS로 보내면 된다고 답한다.
- **꼬리질문**: 재시도 총시간과 fallback 전환율에 어떤 경보를 둘 것인가?

### 키를 바꾸기 전에 왜 공개키를 먼저 배포하는가

- **의도**: 발급과 검증의 비동기 배포, 캐시 경계를 이해하는지 확인한다.
- **핵심 답변**: 새 키로 발급하는 순간 모든 검증자가 새 `kid`를 해석할 수 있어야 하므로 공개키를 먼저 배포하고 캐시 갱신을 확인한다.
- **흔한 오답**: 개인키만 교체하면 검증자가 자동으로 따라온다고 답한다.
- **꼬리질문**: 이전 공개키는 언제 제거할 수 있는가?

## 관련 문서

- [[HSM-Key-Custody|HSM과 서명 키 관리]]
- [[JWT|JWT와 서명 검증]]
- [[KMS|AWS KMS]]
- [[External-Service-Resilience|외부 서비스 장애 대응]]
- [[Backpressure|Backpressure]]
- [[CloudTrail-Config|AWS 감사 로그]]

## 출처

- [당근이 AWS CloudHSM으로 대규모 서명키 관리 시스템을 구축한 방법, 3부 — AWS 기술 블로그](https://aws.amazon.com/ko/blogs/tech/how-karrot-built-a-large-scale-signing-key-management-system-with-aws-cloudhsm-part3/)
- [AWS CloudHSM application integration best practices — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/bp-application-integration.html)
- [AWS CloudHSM Client SDK 5 configuration parameters — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/configure-tool-params5.html)
- [Troubleshooting HSM throttling — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/troubleshoot-hsm-throttling.html)
- [AWS CloudHSM Client SDK logs — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/hsm-client-logs.html)
- [AWS CloudHSM monitoring best practices — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/bp-monitoring.html)
- [Getting CloudWatch metrics for AWS CloudHSM — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/hsm-metrics-cw.html)
- [AWS CloudHSM performance — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/performance.html)
- [Sign — AWS KMS API](https://docs.aws.amazon.com/kms/latest/APIReference/API_Sign.html)
- [JSON Web Signature, kid — RFC 7515](https://www.rfc-editor.org/rfc/rfc7515.html#section-4.1.4)
- [JSON Web Algorithms, ES256 — RFC 7518](https://www.rfc-editor.org/rfc/rfc7518.html#section-3.4)
- [JSON Web Token Best Current Practices — RFC 8725](https://www.rfc-editor.org/rfc/rfc8725.html)
