---
tags: [cs, fundamentals, checksum, crc, hash, cryptographic-hash, sha-2, hmac, integrity, hash-chain, blockchain]
status: done
verified_at: 2026-09-23
category: "CS - 기초"
aliases: ["Checksum and Hash", "체크섬과 해시", "체크섬", "Checksum", "CRC", "해시 함수", "Hash Function", "암호학적 해시", "SHA-2", "SHA-256", "HMAC", "무결성 검증", "해시 체인", "Hash Chain"]
---

# 체크섬과 해시: 무엇을 막는 요약값인가

체크섬, CRC, 해시는 모두 임의 길이의 데이터를 짧은 고정 길이 값으로 요약하고, 나중에 같은 방식으로 다시 계산해 비교하는 기법이다. 차이는 누구를 상대로 무엇을 확인하느냐에 있다. 체크섬과 CRC는 전송과 저장 중에 우연히 생긴 오류를, 일반 해시는 빠른 분산과 조회를, 암호학적 해시는 의도적으로 같은 값을 만들어 내려는 공격을 상대로 설계된다. 여기에 비밀키나 서명이 더해져야 누가 만들었는지까지 확인할 수 있다.

한 줄 요약: **요약값은 고유하지 않다. 출력 공간이 유한하므로 충돌은 반드시 존재하고, 도구마다 다른 것은 충돌이나 원하는 값을 만들어 내기가 얼마나 어려운가다. 공격자가 데이터와 요약값을 함께 바꿀 수 있으면 키 없는 요약값은 변조를 막지 못한다.**

## 공통 원리와 이름 궁합 비유

이름 궁합은 두 이름의 글자를 번갈아 늘어놓고 획수로 바꾼 뒤, 이웃한 두 수를 더해 일의 자리만 남기는 과정을 반복해 두 자리 점수를 만든다. 일의 자리만 남기는 것은 10으로 나눈 나머지를 취하는 모듈러 합이고, 긴 입력을 짧은 값으로 줄이는 요약 함수의 구조를 그대로 보여 준다. 동시에 한계도 보여 준다.

- **충돌**: 서로 다른 이름 쌍이 같은 점수를 받는다. 입력은 무한하고 점수는 100가지뿐이라 피할 수 없다(비둘기집 원리).
- **원하는 결과 만들기**: 100점이 나오는 이름 조합은 몇 번 계산해 보면 쉽게 찾는다. 정보가 줄어든다고 해서 결과로부터 입력을 만들어 내기 어려워지는 것은 아니다.

암호학적 해시가 다른 점은 이 두 번째 작업, 즉 특정 출력이나 충돌을 만드는 입력을 찾는 일이 계산적으로 불가능할 만큼 어렵게 설계됐다는 데 있다.

## 종류별 비교

| 종류 | 대표 예 | 설계 목적 | 고의 변조 대응 |
|---|---|---|---|
| 모듈러 합, 인터넷 체크섬 | IPv4, TCP, UDP 체크섬 | 가벼운 우연한 오류 검출 | 불가. 누구나 다시 계산 |
| CRC | Ethernet FCS, CRC32C, S3의 CRC64NVME | 버스트 오류와 비트 오류 검출 | 불가. 키가 없어 누구나 다시 계산 |
| 비암호 해시 | 해시 테이블의 해시, xxHash | 빠른 계산과 고른 분산 | 불가. 해시 DoS 대비가 따로 필요 |
| 암호학적 해시 | SHA-256, SHA-512, SHA-3 | 역상, 제2역상, 충돌 저항성 | 기준값을 신뢰 경로로 받을 때만 변조 탐지 |
| MAC | HMAC-SHA256 | 공유 비밀키로 무결성과 출처 확인 | 가능. 키 없이 유효한 값을 못 만듦 |
| 디지털 서명 | RSA-PSS, ECDSA, Ed25519 | 개인키 서명, 공개키 검증, 부인 방지 | 가능. 공개키 신뢰가 전제 |

## 체크섬: 싸게, 우연한 오류만

단순 합 체크섬은 데이터를 일정 단위로 더하고 넘치는 자리 올림을 버려, 결과를 `2^n`으로 나눈 나머지로 유지한다. 이름 궁합의 일의 자리 남기기와 같은 구조다.

인터넷 체크섬(RFC 1071)은 이와 조금 다르다. 16비트 단위의 1의 보수 합을 구하며, 최상위 비트에서 넘친 자리 올림을 버리지 않고 최하위에 다시 더한다(end around carry). 마지막에 합의 1의 보수를 취해 헤더에 넣는다. 계산 절차와 검증은 [[TCP-Header#Checksum — 오류 검출|TCP 체크섬]]과 [[IPv4-Header#Header Checksum: 헤더만 지키는 검사|IPv4 헤더 체크섬]].

RFC 1071이 설명하는 대로 이 합은 교환 법칙과 결합 법칙이 성립해 어떤 순서로 더해도 결과가 같다. 계산을 나누고 증분 갱신하기 쉬운 장점이지만, 같은 성질 때문에 16비트 단위 두 개의 자리가 뒤바뀐 오류는 합이 같아 잡히지 않는다. 검출력보다 계산 비용을 우선한 선택이다.

## CRC: 비트 패턴 오류에 강한 검사

CRC(Cyclic Redundancy Check)는 데이터를 이진 다항식으로 보고 정해진 생성 다항식으로 나눈 나머지를 검사값으로 쓴다. 하드웨어 구현이 단순하고, RFC 3385가 정리하듯 통신과 자기 기록 매체에서 연속된 비트가 함께 깨지는 버스트 오류와 여러 독립 비트 오류를 잘 잡아 널리 쓰인다. 링크 계층의 Ethernet FCS가 대표적이다([[Physical-DataLink-Layer#프레임 구조|프레임 구조]]).

같은 크기라도 알고리즘에 따라 검출력이 다르다. SCTP는 작은 패킷에서 Adler-32의 오류 검출이 약하다는 이유로 체크섬을 32비트 CRC로 바꿨다(RFC 3309). 그래도 CRC는 우연한 오류용이다. 키가 없는 공개된 계산이라 데이터를 바꾼 공격자가 CRC도 새로 계산해 붙이면 검사를 통과한다.

## 해시 함수: 일반 해시와 암호학적 해시

**일반(비암호) 해시**는 해시 테이블에서 키를 버킷에 고르게 흩뿌리고 빨리 계산하는 것이 목표다([[Hash-Table|해시 테이블]]). 충돌은 자료구조가 처리할 정상 상황이며, 공격자가 같은 버킷에 몰리는 키를 대량으로 보내면 성능이 무너지는 해시 DoS가 가능하다([[Password-Hashing#해시 DoS|해시 DoS]]).

**암호학적 해시**는 NIST 정의상 출력 길이가 고정된 함수로서 다음 성질을 요구한다.

- **역상 저항성(one-way)**: 무작위로 정한 출력에 대응하는 입력을 찾기가 계산적으로 불가능하다.
- **제2역상 저항성**: 입력 하나가 주어졌을 때 같은 출력을 내는 다른 입력을 찾기가 계산적으로 불가능하다.
- **충돌 저항성**: 같은 출력을 내는 서로 다른 두 입력을 찾기가 계산적으로 불가능하다.

역산이 안 되는 이유를 정보가 사라져서라고만 설명하면 부족하다. 정보가 줄어드는 것은 체크섬과 이름 궁합도 같지만 둘 다 원하는 출력을 내는 입력을 쉽게 찾는다. 일방향성은 수학적 불가능이 아니라 현재 계산 능력으로 찾을 수 없다는 계산적 성질이고, 알고리즘이 약해지면 무너진다. 입력 1바이트만 바뀌어도 출력이 예측할 수 없게 달라지는 성질도 이 설계 목표에서 나온다. 단순 합은 입력이 조금 바뀌면 출력도 조금만 바뀐다.

해시는 암호화가 아니다. 암호화는 키를 가진 쪽이 되돌릴 수 있게 감추는 것이고, 해시는 키 없이 누구나 같은 값을 다시 계산해 비교하는 것이다. 그래서 해시값을 복호화한다는 표현은 성립하지 않는다. 반대로 입력 후보가 적은 값(전화번호, 짧은 비밀번호)은 후보를 모두 해싱해 맞춰 보는 방식으로 찾아낼 수 있어, 해시했다는 사실만으로 비밀이 보호되지는 않는다.

### 이름의 숫자와 보안 강도

SHA-2 계열 이름의 마지막 숫자는 출력 비트 수다(SHA-512/256처럼 슬래시가 있으면 뒤 숫자). FIPS 180-4에서 SHA-384는 SHA-512와 같은 계산에 다른 초기값을 쓰고 결과를 384비트로 잘라 낸 함수다. 출력이 길수록 보안 강도가 높아지지만 비트 수가 곧 보안 강도는 아니다. NIST SP 800-57 Part 1 Rev. 5의 기준은 다음과 같다.

| 함수 | 출력 | 충돌 저항이 필요한 용도(서명 등) | HMAC, 키 유도, 난수 생성 |
|---|---|---|---|
| SHA-1 | 160비트 | 80비트 이하 | 128비트 |
| SHA-256, SHA3-256 | 256비트 | 128비트 | 256비트 이상 |
| SHA-384, SHA3-384 | 384비트 | 192비트 | 256비트 이상 |
| SHA-512, SHA3-512 | 512비트 | 256비트 이상 | 256비트 이상 |

충돌 저항 강도가 출력 길이의 절반인 것은 무작위 입력으로 충돌을 찾는 데 필요한 시도 횟수가 생일 문제처럼 출력 공간의 제곱근 수준이기 때문이다. 선택은 요구 강도로 한다. 128비트 강도가 필요하면 SHA-256으로 충분하고, 더 긴 출력은 더 높은 강도가 필요할 때 쓴다. 숫자가 큰 쪽을 무조건 고르기보다 요구 강도, 연동 시스템과의 호환, 저장 크기를 함께 본다.

### 해시값의 표현

해시 출력은 바이트열이다. 흔히 보는 16진수 문자열은 그 바이트를 사람이 읽기 좋게 바꾼 인코딩이라 바이트 하나가 두 글자가 된다. SHA-256의 32바이트는 16진수로 64글자, Base64로 44글자(패딩 포함)다. npm `integrity` 같은 Subresource Integrity 문자열은 Base64를 쓰므로, 두 해시를 비교할 때는 알고리즘과 인코딩이 같은지 먼저 맞춘다.

### 알고리즘 상태

알고리즘 상태는 시점에 따라 바뀐다.

- **MD5**: RFC 6151은 디지털 서명처럼 충돌 저항성이 필요한 곳에 MD5를 더는 쓸 수 없다고 정리했다. 우연한 손상 확인용 체크섬으로 남아 있는 경우는 있다.
- **SHA-1**: NIST는 충돌 공격을 이유로 2022-12-15에 SHA-1 퇴역을 발표하고 2030-12-31까지 SHA-2나 SHA-3으로 옮기도록 권고했다.
- **비밀번호 저장**: SHA-256 같은 범용 해시는 너무 빨라 단독 사용에 부적합하다. 느리게 설계된 Argon2id, scrypt, bcrypt를 쓴다([[Password-Hashing|패스워드 해싱]]).

## 해시만으로는 변조를 못 막는다

해시가 변조를 드러내는 것은 비교 기준이 되는 해시값을 공격자가 바꿀 수 없는 경로로 받았을 때뿐이다. 데이터와 해시가 같은 채널로 오면 공격자는 데이터를 바꾸고 해시도 새로 계산해 함께 보낸다. 누가 만들었는지 확인하려면 비밀이 필요하다.

- **HMAC(RFC 2104)**: 암호학적 해시와 공유 비밀키로 메시지 인증값을 만든다. 키가 없는 제3자는 유효한 값을 만들 수 없다. 다만 양쪽이 같은 키를 가지므로 둘 중 누가 만들었는지는 제3자에게 증명하지 못한다. 해시에 키를 이어 붙이는 즉석 구성 대신 검증된 HMAC 구성을 쓴다.
- **디지털 서명**: 개인키로 서명하고 공개키로 검증한다. 서명자만 만들 수 있어 부인 방지까지 제공하며, 공개키를 믿을 근거(PKI 등)가 전제다([[Public-Key-Cryptography|공개키 암호]], [[RSA-Encryption|RSA 서명]]).

### 해시 체인과 블록체인

각 기록에 이전 기록의 해시를 넣으면 체인이 된다. 과거 기록 하나를 바꾸면 그 해시가 바뀌어 다음 기록에 적힌 이전 해시와 맞지 않고, 그 뒤 체인 전체가 어긋난다. Git 커밋이 부모 커밋의 해시를 담는 구조와 비트코인 백서의 타임스탬프 체인이 이 원리를 쓴다.

해시 체인만으로는 위 원칙을 벗어나지 못한다. 변조자가 바꾼 지점부터 끝까지 해시를 전부 다시 계산하면 체인은 다시 맞는다. 비트코인은 재계산 자체를 비싸게 만든다.

- **작업 증명**: 블록 해시가 일정 개수의 0비트로 시작할 때까지 nonce를 바꿔 가며 찾게 한다. 백서는 예시로 SHA-256을 들며, 평균 작업량은 요구하는 0비트 수에 지수적으로 늘지만 검증은 해시 한 번이면 된다고 설명한다.
- **가장 긴 체인**: 과거 블록을 바꾸려면 그 블록과 이후 모든 블록의 작업을 다시 하고 정직한 노드들의 누적 작업량을 앞질러야 한다. 뒤처진 공격자가 따라잡을 확률은 블록이 쌓일수록 지수적으로 줄어든다.

블록체인에서도 무결성의 기준은 해시값 자체가 아니라 많은 노드가 공유하고 재계산 비용으로 보호되는 최신 체인이다. 체인마다 쓰는 해시 함수와 합의 방식이 다르므로 대상 체인의 문서로 확인한다.

## 실무에서 만나는 곳

- **다운로드 파일의 SHA-256 값**: 같은 서버가 파일과 체크섬을 함께 제공하면 전송 오류나 미러 손상은 잡지만, 서버 자체가 탈취된 경우는 막지 못한다. 배포자 서명 검증이 그 공백을 채운다.
- **npm lockfile의 `integrity`**: 설치된 패키지 산출물의 `sha512`(또는 `sha1`) Subresource Integrity 문자열이다. 레지스트리에서 받은 tarball이 잠근 시점과 같은지 확인한다([[Supply-Chain-Security#방어|공급망 방어]]).
- **컨테이너 이미지 digest**: `image@sha256:...`는 내용 자체를 가리키는 식별자라 태그처럼 바뀌지 않는다([[Docker-Image-Pipeline|이미지 파이프라인]]).
- **S3 업로드 체크섬**: S3는 CRC64NVME, CRC32, CRC32C, SHA-1, SHA-256, MD5, xxHash 계열 등을 지원하고 CRC64NVME를 기본 알고리즘으로 쓴다. AWS 클라이언트가 업로드 때 체크섬을 보내면 S3가 서버에서 다시 계산해 일치할 때만 저장한다. 전송 중 손상 확인이 목적이라 빠른 CRC가 기본이다.
- **웹훅 서명**: GitHub은 `X-Hub-Signature-256` 헤더에 웹훅 secret과 payload로 만든 HMAC-SHA256 hex digest를 담는다. SHA-1 기반 `X-Hub-Signature`는 레거시 호환용이다. PG사 콜백의 HMAC 검증도 같은 구조다([[Payment-System-Principles#인증, 서명|결제 콜백 서명]]).

웹훅 서명은 파싱 전 원문 body로 계산해야 한다. JSON을 파싱한 뒤 다시 직렬화하면 공백과 키 순서가 달라져 값이 맞지 않는다. NestJS는 `NestFactory.create(AppModule, { rawBody: true })`로 켜고 `RawBodyRequest`의 `req.rawBody`(Buffer)로 읽는다. 비교는 상수 시간으로 한다. Node의 `crypto.timingSafeEqual()`은 길이가 다른 입력에 예외를 던지고, 주변 코드까지 상수 시간으로 만들어 주지는 않는다([[tech/os-runtime/nodejs/Security|Node.js 보안]]).

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

interface VerifySignatureInput {
  readonly rawBody: Buffer;
  readonly signatureHeader: string | undefined;
  readonly secret: string;
}

/**
 * `sha256=<hex>` 형식의 웹훅 서명을 원문 body로 다시 계산해 비교한다.
 * @param input 원문 body, 서명 헤더, 공유 비밀키
 * @returns 서명이 일치하면 true
 */
const isValidWebhookSignature = ({ rawBody, signatureHeader, secret }: VerifySignatureInput): boolean => {
  if (!signatureHeader) return false;

  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expected = Buffer.from(`sha256=${digest}`);
  const received = Buffer.from(signatureHeader);
  const isSameLength = expected.length === received.length;

  return isSameLength && timingSafeEqual(expected, received);
};
```

## 선택 기준

- 우연한 손상만 확인하면 되고 경로 보호는 TLS 같은 다른 계층이 맡는다면 CRC나 체크섬으로 충분하다.
- 내용 식별자, 중복 제거, 캐시 키처럼 충돌이 곧 오동작인 곳에는 암호학적 해시를 쓴다.
- 상대가 보낸 데이터가 위조되지 않았는지 확인해야 하면 HMAC이나 서명을 쓴다. 누가 보냈는지 제3자에게 증명해야 하면 서명이다.
- 비밀번호 저장은 범용 해시가 아니라 패스워드 해싱 함수다.
- MD5와 SHA-1이 남아 있는 곳은 충돌 저항성에 기대는지부터 확인한다.

## 면접 체크포인트

- 체크섬, CRC, 일반 해시, 암호학적 해시, HMAC, 서명이 각각 상대하는 위협
- 요약값이 고유하지 않은 이유(비둘기집 원리)와 충돌 저항성의 의미
- 인터넷 체크섬의 end around carry와 교환 법칙 때문에 놓치는 오류
- 역상, 제2역상, 충돌 저항성의 차이와 일방향성이 계산적 성질이라는 점
- 해시와 암호화의 차이, SHA 이름의 숫자와 충돌 저항 강도(출력의 절반), 16진수는 표현일 뿐이라는 점
- 해시 체인이 변조를 드러내는 원리와, 재계산을 막는 작업 증명과 가장 긴 체인 합의
- 해시를 데이터와 같은 채널로 받으면 변조를 막지 못하는 이유, HMAC과 서명의 차이(부인 방지)
- 웹훅 서명 검증에 원문 body와 상수 시간 비교가 필요한 이유
- MD5, SHA-1의 현재 위치와 비밀번호 저장에 범용 해시를 쓰지 않는 이유

## 출처

제공된 메모 두 건을 바탕으로 정리했으며 영상 본문과 자막은 직접 확인하지 못했다. 보완한 기술 설명은 아래 공식 자료와 대조했다.

- [이름궁합과 Checksum 그리고 해시 — 널널한 개발자 TV](https://www.youtube.com/watch?v=HtETF-NL81A&list=PLXvgR_grOs1CakfdJgCy_Df14U3DqRuPk)
- [Hash를 알아야 블록체인이 보인다! 첫 번째 — 널널한 개발자 TV](https://www.youtube.com/watch?v=gEvpZrsBL1E&list=PLXvgR_grOs1CakfdJgCy_Df14U3DqRuPk&index=2)
- [NIST, FIPS 180-4: Secure Hash Standard (SHS)](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)
- [NIST, SP 800-57 Part 1 Rev. 5: Recommendation for Key Management, Table 3](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final)
- [Bitcoin: A Peer-to-Peer Electronic Cash System — Satoshi Nakamoto](https://bitcoin.org/bitcoin.pdf)
- [Git, Pro Git: Git Internals - Git Objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
- [IETF, RFC 1071: Computing the Internet Checksum](https://www.rfc-editor.org/rfc/rfc1071.html)
- [IETF, RFC 3385: Internet Protocol Small Computer System Interface (iSCSI) Cyclic Redundancy Check (CRC)/Checksum Considerations](https://www.rfc-editor.org/rfc/rfc3385.html)
- [IETF, RFC 3309: Stream Control Transmission Protocol (SCTP) Checksum Change](https://www.rfc-editor.org/rfc/rfc3309.html)
- [NIST CSRC, Glossary: cryptographic hash function](https://csrc.nist.gov/glossary/term/cryptographic_hash_function)
- [IETF, RFC 6151: Updated Security Considerations for the MD5 Message-Digest and the HMAC-MD5 Algorithms](https://www.rfc-editor.org/rfc/rfc6151.html)
- [NIST Retires SHA-1 Cryptographic Algorithm — NIST](https://www.nist.gov/news-events/news/2022/12/nist-retires-sha-1-cryptographic-algorithm)
- [IETF, RFC 2104: HMAC: Keyed-Hashing for Message Authentication](https://www.rfc-editor.org/rfc/rfc2104.html)
- [npm Docs, package-lock.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json)
- [AWS, Amazon S3 User Guide: Checking object integrity in Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html)
- [GitHub Docs, Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [NestJS Documentation, Raw body](https://docs.nestjs.com/faq/raw-body)
- [Node.js Documentation, Crypto: crypto.timingSafeEqual(a, b)](https://nodejs.org/api/crypto.html)

## 관련 문서

- [[TCP-Header|TCP 헤더 (체크섬 계산)]]
- [[IPv4-Header|IPv4 헤더 (헤더 체크섬)]]
- [[Physical-DataLink-Layer|물리와 데이터링크 계층 (FCS)]]
- [[Hash-Table|해시 테이블]]
- [[Hash-Collision|해시 충돌]]
- [[Password-Hashing|패스워드 해싱 (암호학적 해시 조건, 해시 DoS)]]
- [[Public-Key-Cryptography|공개키 암호와 디지털 서명]]
- [[Supply-Chain-Security|공급망 보안 (lockfile 무결성)]]
- [[Payment-System-Principles|결제 시스템 원칙 (콜백 HMAC 서명)]]
- [[tech/os-runtime/nodejs/Security|Node.js 보안 (timingSafeEqual)]]
- [[기초(Fundamentals)|컴퓨터 기초 인덱스]]
