---
tags: [security, regex, ruby, memory-safety, input-validation, vulnerability]
status: done
verified_at: 2026-11-21
category: "Security - 웹 공격"
aliases: ["Regex Engine Attack Surface", "정규식 엔진의 공격면", "Untrusted Regex Patterns", "신뢰할 수 없는 정규식 패턴", "Onigmo"]
---

# 정규식 엔진의 공격면

정규식 엔진은 패턴 문자열을 내부 프로그램으로 컴파일하고, 그 프로그램으로 대상 문자열을 매칭하는 네이티브 코드다. 애플리케이션이 사용자 문자열로 패턴을 만들면 패턴 자체가 그 네이티브 코드의 입력이 된다. 검색 필터, 사용자 정의 규칙과 설정 화면처럼 패턴 문법을 사용자에게 여는 기능이 여기에 해당한다. 같은 런타임의 문자열 변환 함수도 언어의 경계 검사 밖에서 도는 C 코드라서, 정규식을 쓰지 않는 코드도 런타임 결함의 영향을 받을 수 있다.

## 시간 고갈과 메모리 손상은 다른 문제다

| 구분 | 정규식 서비스 거부(ReDoS) | 엔진의 메모리 손상 |
|---|---|---|
| 원인 | 정상 동작하는 엔진이 과도한 역추적으로 매칭 시간을 소진한다 | 컴파일, 매칭이나 변환 코드의 계산 오류로 버퍼 밖을 읽고 쓰거나 같은 메모리를 두 번 해제한다 |
| 결과 | CPU 점유와 응답 지연 | 크래시, 메모리 노출, 조건에 따라 원격 코드 실행 |
| 통제 | 매칭 시간 제한, 역추적을 키우는 패턴 피하기 | 수정된 런타임으로 업데이트. 사용자 문자열을 패턴으로 컴파일하지 않는 설계로 노출을 줄인다 |

Ruby 4.0 문서는 패턴이나 대상 문자열이 신뢰할 수 없는 입력에서 오면 서비스 거부로 이어질 수 있으므로 시간 제한을 두라고 권한다. 클래스 기본값(`Regexp.timeout`)은 처음에 nil이고, 인스턴스 값도 nil이면 시간 제한이 없다. 시간 제한은 매칭 시간을 끊는 통제라서 컴파일 단계의 손상이나 제한 시간 안에 일어나는 버퍼 밖 쓰기를 막는다는 근거가 없다(해석). 아래 Ruby 권고도 업데이트 말고 다른 완화책을 제시하지 않았다. 자원 제한과 메모리 손상을 나눠 보는 원리는 [[Compressed-Input-Decoder-Security#압축 폭탄과 메모리 손상은 다른 문제다|압축 입력 디코더]]와 같고, Node.js의 ReDoS 대응은 [[Async-IO#REDOS (정규식 서비스 거부)|이벤트 루프 차단 방지]]에 있다.

## 사용자 문자열이 패턴이 되는 경로

Ruby 문서는 신뢰할 수 없는 입력이나 사용자 입력을 정규식 패턴으로 넘기지 말라고 권하며, 문자열이 패턴으로 컴파일되는 경로로 `Regexp.new`와 `Regexp.compile`, 정규식 리터럴 안의 보간, 문자열 인자를 컴파일하는 `String#match`와 `String#match?`를 든다. 패턴이 일으킨 크래시나 메모리 손상은 고쳐야 할 버그로 보지만, 크래시하지 않는 것은 목표일 뿐 보장이 아니라고 적는다. 신뢰할 수 없는 텍스트를 찾기만 하면 된다면 패턴으로 컴파일하지 않는다.

```ruby
# 사용자 문자열이 패턴 문법으로 해석된다
Regexp.new(input)
/#{input}/
text.match(input)          # 문자열 인자를 패턴으로 컴파일한다

# 정규식 엔진을 거치지 않는다(문자열 인자일 때)
text.include?(input)
text.index(input)
text.start_with?(input)

# 문법은 막지만 엔진은 거친다
Regexp.new(Regexp.escape(input))
Regexp.union(inputs)       # 각 문자열 인자를 escape한다
```

- **엔진을 거치지 않는 메서드를 먼저 쓴다:** Ruby 소스(`string.c`, master)에서 `include?`와, 문자열 인자를 받은 `index`와 `start_with?`는 정규식 엔진 없이 문자열을 찾거나 비교한다. Ruby 문서가 드는 예는 `include?`다. 대소문자를 무시하려고 `downcase`로 바꾼 뒤 비교하면 아래 대소문자 변환 결함의 경로에 들어간다(해석).
- **escape와 union이 막는 것과 남기는 것:** `Regexp.escape`와 `Regexp.union`은 특수 문자를 escape해 공격자가 문자 클래스 교집합 같은 문법을 고르지 못하게 하며, Ruby 문서도 이 둘을 대안으로 든다. 하지만 escape한 문자열도 엔진이 파싱, 컴파일하고 매칭하며, 애플리케이션이 붙인 `i` 플래그는 대소문자 무시 매칭 경로를 그대로 탄다. 아래 권고들은 조건을 공격자가 통제하는 패턴이나 그런 문자열로 만든 정규식이라고만 적고 escape한 리터럴 내용만으로 닿는지는 밝히지 않으므로, escape를 쓰는 코드도 업데이트 대상으로 둔다(해석). 대상 문자열만으로 닿는 결함도 있다.
- 고급 검색이나 사용자 규칙처럼 패턴 문법 자체를 제공해야 하는 기능은 패턴 길이와 허용 문법을 제한하고, 권한을 줄인 별도 워커에서 처리하는 방안을 검토한다(운영 제안). 워커 안의 코드 실행이 어디까지 닿는지는 [[Memory-Safety-Vulnerabilities#원격 코드 실행의 권한은 워커 계정에서 시작한다|워커 계정의 권한]]이 정한다.

## 사례: Ruby 정규식 엔진과 대소문자 변환 결함 7건 (2026-11-18)

Ruby의 정규식 엔진은 Onigmo(Oniguruma 개량판)이며 Ruby 저장소에 함께 들어 있다(`regparse.c`, `regcomp.c` 머리말). 2026-11-18 Ruby는 정규식 엔진과 문자열 대소문자 변환의 결함 7건을 공지했다. 일부 결함이 원격 코드 실행에 쓰일 수 있음을 보인 PoC를 알고 있다고 밝혔고, 4건의 보고자에는 Ada Logics와 Anthropic이 함께 적혀 있다. 아래 조건, CWE와 심각도는 2026-11-21 GitHub API로 조회한 각 GHSA 기준이다.

| 입력 경로 | 권고 | 결함 | 심각도 |
|---|---|---|---|
| 조작된 문자열의 대소문자 변환 | GHSA-34m4-m9fh-gqp5 | ISO-8859-1, Windows-1252 같은 일부 단일 바이트 인코딩에서 출력 버퍼 끝 뒤에 1바이트를 쓴다(CWE-193) | critical |
| 조작된 문자열의 대소문자 변환 | GHSA-87fm-7w84-j2px | 변환 결과가 4GiB를 넘으면 길이가 넘쳐 힙 버퍼 밖에 쓴다(CWE-190) | high |
| 공격자 패턴의 컴파일 | GHSA-7x2q-68qv-6p8x | 문자 클래스 교집합(`&&`)을 파싱하다 같은 버퍼를 두 번 해제한다(CWE-415) | critical |
| 공격자 패턴의 컴파일 | GHSA-3p8q-wmhx-vm2w | 컴파일된 프로그램 크기가 넘쳐 힙 버퍼 밖에 쓴다(CWE-190) | critical |
| 공격자 패턴의 문자열 변환 | GHSA-7whj-cfh7-xgm4 | `Regexp#to_s`가 힙 버퍼 밖에 써 정보 노출이나 코드 실행으로 이어질 수 있다(CWE-787) | high |
| 공격자 패턴의 매칭 | GHSA-wpqw-5qxg-m68r | 대소문자 무시 매칭의 범위 밖 읽기가 공격자가 조종하는 메모리 손상으로 이어진다(CWE-125) | high |
| 조작된 문자열의 매칭 | GHSA-pvgc-g7gj-pv6h | 대소문자 무시 역참조를 매칭하다 대상 문자열 끝 뒤를 읽어 메모리 노출이나 크래시가 난다(CWE-125) | medium |

- **영향과 수정:** 3.3.13 이하, 3.4.0~3.4.12, 4.0.0~4.0.9가 영향을 받고 4.0.10, 3.4.13, 3.3.14에서 고쳤다. 3.3은 보안 유지보수 단계라 수정을 받았고, 3.2 이하는 지원이 끝나 이 수정을 받지 못한다.
- **정규식을 쓰지 않아도 닿는다:** 두 대소문자 변환 결함은 조작된 문자열의 대소문자만 바꿔도 생긴다. 4GiB 조건의 결함은 요청 크기 제한이 그보다 훨씬 작으면 요청 하나로 닿기 어렵지만, 여러 입력을 이어 붙이는 처리까지 막는다는 보장은 아니다. 단일 바이트 인코딩 결함은 권고에 크기 조건이 없다(해석).
- **패턴을 고정해도 남는 경로:** GHSA-pvgc-g7gj-pv6h는 조작된 문자열의 매칭으로 생기므로, 사용자 패턴을 받지 않는 애플리케이션도 자기 패턴에 대소문자 무시 역참조가 있으면 대상에서 빼지 않는다(해석).
- **CVE 번호가 없는 권고:** CVE 번호는 요청 중이라 권고는 GHSA 식별자로 나왔고, 2026-11-21 조회한 7건의 생태계 칸은 비어 있었다. RubyGems 패키지가 아니라 인터프리터의 결함이므로 gem 의존성 스캔과 별도로 런타임 버전 목록에서 찾는다. CVE 번호를 기준으로 동작하는 스캐너와 알림은 번호가 붙기 전까지 이 결함을 놓칠 수 있다(해석, [[Dependency-Vulnerability-Scanning#언어 런타임은 버전 관리와 호스팅 책임으로 대응한다|언어 런타임 절]]).
- **번들 Ruby의 수정 경로:** 제품이 Ruby를 번들하면 수정은 그 제품의 릴리스로 들어온다. 2026-10 GitLab의 정규식 컴파일 정수 넘침(CVE-2026-110264)도 번들 Ruby 패치로 고쳐졌다([[AI-Accelerated-Threat-Defense#사례: 번들 런타임의 수정 경로|번들 런타임의 수정 경로]]). 이번 수정이 각 제품에 들어왔는지는 제품별 공지로 따로 확인한다(운영 제안).

## 운영 점검

- 사용자 문자열을 `Regexp.new`, 패턴 보간, 문자열 인자를 받는 `match`와 `match?`로 넘기는 코드를 찾는다. 검색만 필요하면 `include?`처럼 정규식 엔진을 거치지 않는 메서드로 바꾸고, 정규식이 꼭 필요하면 `Regexp.escape`나 `Regexp.union`으로 문법을 막되 업데이트는 그대로 한다(Ruby 문서와 위 해석).
- 웹 서버와 워커가 실제로 실행하는 Ruby 버전과 설치 경로(배포판 패키지, 버전 관리자, 컨테이너 이미지, 제품 번들)를 기록하고 수정 버전 이상인지 확인한다. 배포판 패키지는 상류 번호 대신 배포판 보안 권고의 수정 패키지 버전과 대조한다(운영 제안).
- 업데이트 뒤 앱 서버와 백그라운드 워커를 재시작해 새 인터프리터가 실행 중인지 확인한다. 재시작 전의 프로세스는 이전 인터프리터를 계속 쓴다(운영 제안).
- 사용자 정규식을 처리하는 프로세스의 비정상 종료를 탐지 신호로 모은다. GitLab도 Onigmo 네이티브 워커 크래시를 탐지 규칙으로 공개한 적이 있다(운영 제안).

## 점검 질문

- 정규식 시간 제한이 ReDoS에는 통제가 되지만 엔진의 메모리 손상에는 통제가 되지 못하는 이유는 무엇인가?
- Ruby에서 사용자 문자열이 패턴으로 컴파일되는 경로는 무엇이고, 문자 그대로 찾을 때는 무엇을 쓰는가?
- 정규식을 받지 않는 애플리케이션이 이번 Ruby 권고의 영향을 받을 수 있는 경로는 무엇인가?
- CVE 번호 없이 GHSA로만 나온 런타임 권고를 어떤 목록과 절차로 찾아 적용하는가?

## 출처

- [Security advisories: multiple vulnerabilities in Regexp and String case conversion — Ruby](https://www.ruby-lang.org/en/news/2026/11/18/multiple-vulnerabilities-in-regexp-and-string/) — 2026-11-18 게시. 2026-11-21 7건의 입력 경로, PoC 언급, 영향과 수정 버전, 지원 단계, CVE 요청 상태와 보고 기관 대조
- [Security advisories — GitHub, ruby/ruby](https://github.com/ruby/ruby/security/advisories) — 2026-11-21 GitHub API로 7건의 세부 조건, CWE, 심각도와 생태계 칸 대조
- [Ruby 4.0 Documentation, security](https://docs.ruby-lang.org/en/4.0/security/security_rdoc.html) — 2026-11-21 Untrusted patterns 절의 컴파일 경로, 크래시를 버그로 보는 목표와 리터럴 대안 대조
- [Ruby 4.0 Documentation, class Regexp](https://docs.ruby-lang.org/en/4.0/Regexp.html) — 2026-11-21 Timeouts 절의 권고와 기본값 대조
- [regparse.c — GitHub, ruby/ruby](https://github.com/ruby/ruby/blob/master/regparse.c) — 2026-11-21 master 머리말의 Onigmo 표기 확인
- [string.c — GitHub, ruby/ruby](https://github.com/ruby/ruby/blob/master/string.c) — 2026-11-21 master의 `include?`, `index`, `start_with?`가 문자열 인자를 정규식 없이 처리하는 부분 확인
- [Ruby 정규식과 문자열 대소문자 변환에서 취약점 7건 발견, 일부 원격 코드 실행 가능 — GeekNews](https://news.hada.io/topic?id=37458) — 2026-11-19 소개 글, 계기 자료. 사실은 위 1차 출처로 대조했다

## 관련 문서

- [[Compressed-Input-Decoder-Security|압축 입력 디코더의 공격면]] — 자원 제한과 메모리 손상의 구분, 내장 사본
- [[Memory-Safety-Vulnerabilities|메모리 안전성 취약점]] — 범위 밖 읽기와 해제 후 사용의 결과, 워커 권한
- [[AI-Accelerated-Threat-Defense#사례: 번들 런타임의 수정 경로|번들 런타임의 수정 경로]] — GitLab의 번들 Ruby 패치
- [[Dependency-Vulnerability-Scanning#언어 런타임은 버전 관리와 호스팅 책임으로 대응한다|언어 런타임의 버전 관리]]
- [[Async-IO#REDOS (정규식 서비스 거부)|Node.js의 ReDoS]]
- [[Command-Injection|Command Injection]] — 데이터를 코드로 해석하는 다른 경로
