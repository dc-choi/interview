---
tags: [security, session, deserialization, secret-management]
status: done
verified_at: 2026-10-16
category: "Security - 웹 공격"
aliases: ["Signed Payload Deserialization", "서명된 페이로드 역직렬화"]
---

# 서명된 페이로드의 역직렬화

서명은 키를 모르는 주체의 변조를 검출하는 장치다. 페이로드를 숨기는 암호화나 객체 복원의 안전성을 보장하지 않는다. 키가 노출되면 정상 서명이 달린 공격자 입력도 만들어질 수 있다.

## 위험이 연결되는 경로

1. 클라이언트가 읽을 수 있는 세션에 비밀 값을 넣는다.
2. 그 값을 세션 서명 키로 재사용한다.
3. 공격자가 원하는 세션 데이터를 만들고 유효한 서명을 붙인다.
4. 서버가 서명 성공만 믿고 객체 역직렬화를 실행한다.

`pickle`처럼 복원 과정에서 코드를 실행할 수 있는 형식은 신뢰하지 않는 입력에 사용하지 않는다. 서명을 붙였다는 이유만으로 이러한 데이터 경계를 제거하지 않는다. 단순 데이터 형식을 쓰더라도 스키마와 권한, 상태 전이는 별도로 검증한다.

## DevSite 공개 연구 사례

2026-10-13 제공 발췌와 연구자의 2026-10-12 공개 기록을 대조했다. OAuth `client_secret`이 담긴 Flask 세션과 같은 값의 서명 키 재사용이 결합됐다. OAuth 콜백에서 세션의 flow를 `pickle.loads`로 복원해 인증 없는 코드 실행 경로가 생겼다는 보고다.

연구자는 시스템 명령 대신 `time.sleep(N)`과 서명 오류 등의 대조군으로 실행 경로를 검증했다고 적었다. 포상금은 공개 기록상 90,000달러이며 발췌의 약 1.2억 원은 환산 표현이다. 이 문서에서는 운영 서비스를 재시험하지 않았고 공개 연구의 재현 과정을 읽은 범위만 확인했다.

## 검토 기준

- 세션에 넣는 값이 기밀인지, 서명과 암호화를 혼동하지 않았는지 확인한다.
- OAuth, 세션과 다른 목적의 비밀 값을 분리한다. 유출 시 키 회전과 영향받은 세션 무효화를 함께 검토한다.
- 콜백이 기대한 flow, 사용자, 만료와 일회성 상태에 연결되는지 확인한다.
- 서명 성공 다음의 파서도 공격 표면으로 보고 객체 생성과 실행 능력을 제한한다.

## 출처

- [How I Found a $90,000 Remote Code Execution Vulnerability in Google — Simon Koeck](https://simonkoeck.com/writeups/google-devsite-flask-session-pickle-rce)
- [Python, pickle — Python object serialization](https://docs.python.org/3/library/pickle.html)

## 관련 문서

- [[Session|세션 보안]]
- [[Secret-Management|시크릿 관리]]
- [[Application-Security|애플리케이션 보안]]
