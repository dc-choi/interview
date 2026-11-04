---
tags: [security, secure-coding, java, deserialization, xml, injection]
status: done
verified_at: 2026-11-04
category: "보안(Security)"
aliases: ["Java Secure Coding Guidelines", "Secure Coding Guidelines for Java SE", "Java SE 시큐어코딩 가이드라인", "자바 시큐어코딩 지침"]
---

# Java SE 시큐어코딩 가이드라인

Oracle의 Secure Coding Guidelines for Java SE는 Java 언어와 표준 API를 쓸 때 취약점이 생기기 쉬운 지점을 FUNDAMENTALS-0, INPUT-1 같은 지침 ID로 정리한 문서다. 보안 기능을 구현하는 소프트웨어보다 일반 Java 코드를 안전하게 만드는 데 초점을 두고, 새 Java SE 기능과 버전 공통 모범 사례를 반영해 주기적으로 갱신된다. 이 문서의 지침 번호와 내용은 2026-11-04 확인한 Document version 11.0(Last updated June 2025) 기준이다. OWASP 지도와 웹 공통 원칙은 [[Application-Security|애플리케이션 보안 / 시큐어코딩]]에 두고, 여기서는 Java 고유의 API와 설정을 다룬다.

11.0은 0 Fundamentals, 1 Denial of Service, 2 Confidential Information, 3 Injection and Inclusion, 4 Accessibility and Extensibility, 5 Input Validation, 6 Mutability, 7 Object Construction, 8 Serialization and Deserialization, 9 Access Control의 10개 장과 JNI 방어적 사용을 다루는 부록 A로 구성된다. 지침 ID는 장 접두사와 번호를 쓴다(DOS-1, CONFIDENTIAL-2, EXTEND-5, MUTABLE-3, OBJECT-4, SERIAL-6, ACCESS-20 등).

## 멘탈 모델: 영리한 검증보다 명백한 안전

- **FUNDAMENTALS-0** (Prefer to have obviously no flaws rather than no obvious flaws): 안전하다는 것을 확인하는 데 영리한 논리가 필요하지 않은 코드를 설계하고 작성한다.
- **FUNDAMENTALS-5:** 보안 검사를 정해진 몇 지점에서 하고 통과 결과를 capability 객체로 돌려줘 이후 검사가 필요 없게 한다. 그 객체가 다른 코드로 새지 않게 할 책임은 검사하는 코드와 호출자 모두에게 있다.
- **적용 예시:** 정적 분석이 경고한 메서드가 호출자들의 사전 크기 검사 덕분에 안전하다면, 그 결론은 호출자 전체를 추적해야 얻고 검사를 모르는 새 호출자가 생기면 깨진다. 검사를 메서드 진입점에 두면 확인이 바로 끝난다. 그래도 남는 사전 조건은 FUNDAMENTALS-7에 따라 보안 관련 사전 조건과 사후 조건으로 API 문서에 적는다.
- **FUNDAMENTALS-4:** 신뢰 경계를 넘는 데이터는 사용 전에 정제하고 검증한다. 감사 질문에는 라이브러리가 악성 구현으로 바뀔 수 있는지, 신뢰하지 않는 설정 데이터를 쓰는지가 들어 있다. 서문은 신뢰하지 않는 코드라는 개념이 Security Manager와 함께 쓰였지만 해당 지침이 다른 클래스, 패키지, 모듈, 라이브러리와 서비스의 코드와 상호작용할 때도 적용될 수 있다고 설명한다.

## Security Manager 비활성화 이후의 위치

- 9장 도입부는 Security Manager가 Java 17에서 deprecated되고 Java 24에서 영구 비활성화됐다고 적는다. 9장 지침은 Security Manager로 보안 검사를 하는 경우를 다루며, 레거시 환경에서 쓴다면 가능한 한 일찍 설치하라고 한다.
- EXTEND-2, EXTEND-3, OBJECT-2, OBJECT-3, SERIAL-5의 원래 내용은 9-16~9-20(ACCESS-16~20)으로 옮겨졌다. Java 24 이상을 기준으로 읽을 때는 0~8장이 주 대상이고 9장은 이전 버전 운영과 레거시 코드 검토용이다(적용 판단).
- JEP 486(JDK 24)부터 시작 옵션 `-Djava.security.manager`로 Security Manager를 켜려 하면 JVM이 오류를 보고하고 종료하며(`disallow` 값이나 옵션 생략은 오류가 아니다), `System.setSecurityManager` 호출은 `UnsupportedOperationException`을 던진다. API는 Java 24에서 제거하지 않고 동작만 약화했으며 향후 릴리스에서 제거할 계획이다.
- 신뢰하지 않는 코드를 실행해야 하면 INJECT-8은 안전한 샌드박스를 만들라고 하고, JEP 486은 Java 애플리케이션도 네이티브 애플리케이션처럼 컨테이너, 하이퍼바이저와 OS 메커니즘 같은 JDK 밖 기술로 샌드박스하라고 안내한다. INJECT-5와 INJECT-6이 권하는 권한 축소는 9장 지침을 참조하므로, Java 24 이상에서는 파서 기능 제한과 프로세스 밖 격리로 목적을 대신한다(이 문서의 해석).

## 서드파티 코드 (FUNDAMENTALS-8)

- 저자가 낸 보안 업데이트가 번들한 애플리케이션, 의존 라이브러리와 OS 패키지 업데이트에 닿기까지 시간이 걸릴 수 있다. 프레임워크와 라이브러리는 물론 그 의존성까지 보안 업데이트를 추적해 제때 적용하고, 개발과 릴리스 과정에 의존성 검사 도구를 붙인다([[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]).
- 서드파티 코드의 보안 모델, 안전한 설정 옵션과 암호화나 직렬화처럼 코드가 수행하는 보안 관련 작업을 파악한다. 과거 보안 이슈가 특정 기능이나 설정에 몰렸다면 그 기능을 피해 노출을 줄일 수 있다. 더 안전한 API와 설정이 나중에 나올 수 있으므로 주기적으로 다시 검토한다.
- 수정판이 나와도 소비자가 옮기지 않으면 위험이 남는다. Sonatype 연구팀의 2025-12-10 게시 기준, 2025년 Maven Central에서 Log4j를 내려받은 3억 건 가까운 요청 중 약 13%(약 4천만 건)가 Log4Shell이 들어 있는 버전이었다.
- XZ Utils 5.6.0과 5.6.1 릴리스 tarball의 백도어(CVE-2024-3094)처럼 상류 배포물 자체가 오염될 수도 있다. 설치 시점 실행과 전이 의존성 대응은 [[Supply-Chain-Security|공급망 보안]], AI가 만든 존재하지 않는 패키지 이름을 노린 공격은 [[Coding-Agent-Package-Hallucination|코딩 에이전트의 패키지 환각 공격]]을 따른다.

## 서비스 거부와 기밀정보 (1, 2장)

- **DOS-1:** 신뢰하지 않는 크기, 길이, 차원과 offset은 검사한다. 압축 해제는 해제 후 크기에 한도를 두고, 반복문은 매 반복이 진전하는지 확인한다. 가이드가 드는 예에는 압축 폭탄, XML 엔티티 확장(billion laughs), 같은 해시 코드를 가진 키의 대량 삽입, 정규식의 catastrophic backtracking, XPath 식, 악성 데이터의 Java 역직렬화와 JavaBeans XML 역직렬화, 크기와 차원 값이 과도한 이미지 파일, 신뢰하지 않는 JAR 처리 등이 있다. 압축 입력은 [[Compressed-Input-Decoder-Security|압축 입력 디코더의 공격면]]과 이어진다.
- **DOS-3, DOS-5, DOS-2:** 한도 검사 자체가 overflow되지 않게 한다. `current + extra > max`는 큰 값에서 음수로 넘어가 검사를 통과할 수 있으므로 가이드 예제처럼 `extra < 0 || current > max - extra`로 비교한다. 사용자가 제어하는 데이터는 `HashMap`, `HashSet`의 키로 쓰지 않고, 해시 충돌 공격을 줄이도록 키를 `Comparable`로 두며 해시 계산 시간이 실행마다 일정하게 한다. 열린 파일과 락처럼 자원으로 동작하는 객체는 어떤 경우에도 즉시 해제한다.
- **CONFIDENTIAL-1:** 내부 예외는 상위 호출자로 전파하기 전에 잡아서 정제한다. `FileInputStream` 생성자로 설정 파일을 열 때 파일이 없으면 경로가 담긴 `FileNotFoundException`이 나서 파일 시스템 구조가 드러난다. 메시지를 지워도 예외 타입이 정보를 줄 수 있고, 스택 추적은 화면에 보이지 않더라도 HTML에 넣지 않는다.
- **CONFIDENTIAL-2, 3:** SSN(미국 사회보장번호)과 비밀번호 같은 고민감 정보는 로그로 보내지 않고 검색으로도 존재가 드러나지 않게 한다. 저수준 문자열 파싱 라이브러리가 처리하는 텍스트를 로그에 남길 수 있다는 점도 확인한다. 사용 직후 메모리를 지우는 방법은 일반적인 Java 런타임에서 효과가 줄어들므로 민감 데이터의 불필요한 사본을 만들지 않는다.

## 인젝션과 포함 (3장)

- **INJECT-1~4:** 파싱과 정규화(canonicalization)를 검증보다 먼저 하고, 가능하면 잘못된 데이터를 고치려 하지 말고 그 뒤 데이터까지 거부한다. `Statement`의 동적 SQL 대신 `PreparedStatement`나 `CallableStatement`를 쓰고([[SQL-Injection]]), HTML과 XML 출력에 넣는 신뢰하지 않는 데이터는 라이브러리로 정제하고 인코딩한다([[XSS]]). 새 프로세스의 명령줄에는 신뢰하지 않는 데이터를 넣지 않는다. 명령줄 동작은 플랫폼마다 다르고 문서화가 부족하며 예상을 벗어나기 쉽다([[Command-Injection]]).
- **INJECT-7, 9:** 여러 Swing look-and-feel은 `<html>`로 시작하는 텍스트를 HTML로 해석하므로, 신뢰하지 않는 텍스트를 표시하는 컴포넌트는 `label.putClientProperty("html.disable", true)`처럼 `html.disable` client property를 `Boolean.TRUE`로 둔다. 신뢰 경계 밖의 부동소수점 값은 `Double.isNaN`, `Double.isInfinite`로 확인한다. `int`로 변환하면 NaN은 0, 양의 무한대는 `Integer.MAX_VALUE`가 된다(JLS 5.1.3).
- **INJECT-8:** 코드는 여러 곳에 숨을 수 있다. 신뢰하지 않는 데이터로 JNDI lookup을 하지 않고, `javax.script` 스크립트, 원격 코드를 로드할 수 있는 RMI, LDAP, JavaBeans Long Term Persistence와 데이터베이스 밖에 영향을 주는 SQL 구현의 코드 실행도 해석 경로로 본다. XSLT 확장 함수는 Java 코드를 호출할 수 있고 `XMLConstants.FEATURE_SECURE_PROCESSING`을 설정하면 꺼진다고 적는다. 확장 함수의 기본값은 JDK 버전에 따라 다르다. 이 가이드는 Oracle의 XSLT 구현이 확장 함수의 Java 코드 호출을 기본으로 허용한다고 적지만, `jdk.xml.enableExtensionFunctions` 기본값은 JDK 24에서 `false`로 바뀌었고 JDK 25 JAXP 보안 가이드도 `false`로 적는다. JDK 23 이하에서는 FSP를 설정해 끈다(적용 판단). 아래 사례처럼 lookup, 표현식과 문자열 보간 같은 편의 기능이 신뢰하지 않는 문자열에 닿으면 네트워크 접근이나 코드 실행으로 이어질 수 있다.

| 사례 | 해석된 입력 | 수정 방향 |
| --- | --- | --- |
| Log4j 2, CVE-2021-44228 | 설정, 로그 메시지와 파라미터의 JNDI 기능. 메시지나 파라미터를 제어하는 공격자가 LDAP 서버에서 로드한 코드를 실행 | 2.15.0에서 message lookup 기본 비활성화와 JNDI lookup 프로토콜 제한, 2.16.0에서 message lookup 지원 제거와 JNDI 기본 비활성화 |
| Confluence Server와 Data Center, CVE-2022-26134 | OGNL 인젝션으로 인증 없는 사용자가 임의 코드 실행 | 2022-06-02 권고의 수정 버전으로 업데이트 |
| Apache Commons Text, CVE-2022-42889 | 1.10.0 이전 `StringSubstitutor`를 신뢰하지 않는 입력에 쓰면 일부 interpolator가 네트워크 접근이나 코드 실행을 유발 | 1.10.0에서 기본 설정을 더 안전하게 변경 |

Log4j 2.15.0의 수정은 일부 비기본 설정에서 불완전했고(CVE-2021-45046) 그 뒤에도 후속 CVE가 나왔으므로, 운영 중인 버전은 Apache Logging Services 보안 페이지가 안내하는 수정 버전과 대조한다.

### XML과 이미지 (INJECT-5, INJECT-6)

- XXE 공격은 로컬 파일을 XML 데이터에 끼워 넣어 클라이언트가 볼 수 있게 만들고, XInclude, XSLT `document` 함수와 XSLT `import`, `include`도 비슷하게 악용된다. 가이드는 권한 축소와 함께, 필요한 기능에 맞춰 외부 엔티티를 막거나 DTD를 아예 끄도록 파서를 설정할 수 있다고 적는다.
- JDK 25 JAXP 보안 가이드 기준, JDK는 SAX와 DOM 등의 factory에 `FEATURE_SECURE_PROCESSING`(FSP)을 기본으로 켜지만 외부 엔티티 해석 같은 외부 연결은 기본으로 막지 않는다. 모든 외부 연결을 끄려면 API로 FSP를 명시적으로 켜야 한다. DTD가 필요 없으면 DTD 처리를 꺼 DoS, XXE와 [[SSRF]]를 함께 줄이며, 권장 방법은 `jdk.xml.dtd.support` system property(`allow` 기본값, `ignore`, `deny`)다. JDK 21 가이드에는 이 속성이 없다.

```java
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
// 기본으로 켜진 FSP는 외부 연결을 막지 않는다. API로 명시하면 외부 엔티티 해석을 끄고 처리 한도를 적용한다
dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
// DTD가 필요 없는 입력이면 DTD 처리를 끈다(SAX, DOM 파서용 feature)
dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
```

- BMP 이미지는 로컬 ICC 색상 프로필 파일을 참조할 수 있고, 파일 내용보다 읽기를 시도하는 행위 자체가 문제가 될 수 있다(INJECT-6). 이미지 파일의 크기와 차원 값은 큰 메모리 할당으로 이어질 수 있으므로(DOS-1) 디코딩 전에 상한을 확인한다. 업로드 경로는 [[File-Upload-Security|파일 업로드 보안]]을 따른다.

## 입력 검증 (5장)

- **INPUT-1:** 신뢰하지 않는 입력은 사용 전에 검증하고, 가능하면 처리 자체를 피한다. 검증은 방어적 복사 뒤에 한다. 이른 검증은 잘못된 입력을 빨리 거부하고, 보안에 민감한 작업 직전의 검증은 그 사이의 변경까지 덮는다. 예로 파일 이름의 `../`를 이용한 디렉터리 순회가 있다. 같은 값을 XML 생성, URL 처리와 SQL 파라미터에 함께 쓰면 사용처마다 요구 조건이 다르므로 쓰는 지점 가까이에서 그 용도에 맞게 다시 검증한다(적용 예시).
- **INPUT-2:** 일반적으로 메서드 인자는 검증하고 반환값은 검증하지 않지만, 상위 코드의 메서드를 호출하는 upcall의 반환값은 검증한다.
- **INPUT-4:** 문서와 시험으로 확인하지 않은 API에 입력 검증을 맡기지 않고, API가 만들어 돌려준 객체를 쓰며 원래 입력을 다시 쓰지 않는다. 어떤 생성자나 메서드는 잘못된 입력을 거부하는 대신 걸러내거나 escape, 인코딩하고, URL과 파일 경로는 구현마다 다르게 파싱될 수 있다. 검사기와 실행기의 해석 차이가 만드는 같은 구조의 문제는 [[Archive-Parser-Differentials|아카이브 파서 해석 차이]]에 있다.

```java
URI uri = new URI(untrusted); // 형식 오류는 URISyntaxException으로 거부
String host = uri.getHost();
boolean allowedHost = "https".equals(uri.getScheme()) && host != null
        && (host.equals("java.com") || host.endsWith(".java.com"));
if (!allowedHost) throw new IllegalArgumentException("허용하지 않는 URL");
HttpRequest request = HttpRequest.newBuilder(uri).build(); // 검사한 객체를 넘기고 원래 문자열은 다시 쓰지 않는다
```

## 직렬화와 역직렬화 (8장)

- 8장은 신뢰하지 않는 데이터의 역직렬화가 본질적으로 위험하므로 가능하면 피하고, 피할 수 없을 때만 신중하게 수행하라고 한다. Java 직렬화는 필드 접근 제어를 우회하는 인터페이스를 클래스에 만든다. 서드파티 직렬화 기능에도 일부 지침이 적용되지만 해당 라이브러리의 문서와 모범 사례를 따로 확인한다.
- **SERIAL-1~4:** 직렬화 가능하게 만들면 모든 필드에 대한 공개 인터페이스와 숨은 공개 생성자가 생기는 셈이므로 보안에 민감한 클래스는 직렬화하지 않고, 민감 필드는 `transient`로 두거나 `serialPersistentFields`를 적절히 정의한다. 역직렬화는 생성자를 호출하지 않고 인스턴스를 만들므로 일반 생성처럼 동작하게 설계한다. 역직렬화한 가변 객체는 내부 필드에 넣기 전에 복사하고, 성공하기 전에는 객체를 쓸 수 없게 하며, 생성 시의 보안 검사를 `readObject`나 `readObjectNoData`에서도 수행한다.
- **SERIAL-6:** 직렬화 필터는 JDK 9에서 도입됐고 8u121, 7u131, 6u141 CPU에도 들어갔다. JDK 17은 JEP 415로 역직렬화마다 필터를 고르는 JVM 전역 filter factory와 문맥별 필터를 더했다. 안전한 클래스만 허용하고 나머지를 거부하는 허용 목록이 가장 안전하며, 거부 목록을 쓰면 거부한 클래스의 하위 클래스는 여전히 역직렬화될 수 있다. RMI도 원격 호출을 보호하는 필터를 설정할 수 있다.

| 설정 위치(JDK 25 문서 기준) | 적용 범위 |
| --- | --- |
| `$JAVA_HOME/conf/security/java.security`의 `jdk.serialFilter` | 그 Java 런타임으로 실행하는 모든 애플리케이션 |
| 명령줄 `-Djdk.serialFilter=...` | 한 번의 Java 실행. security property보다 우선하고 `System.setProperty`로는 설정되지 않는다 |
| `ObjectInputStream.setObjectInputFilter` | 개별 스트림. 첫 객체를 읽기 전에 한 번만 호출할 수 있다 |
| `jdk.serialFilterFactory` | 스트림의 필터를 고르는 JVM 전역 factory 클래스 |

- 기본 filter factory에서는 스트림에 설정한 필터가 JVM 전역 필터(`jdk.serialFilter`)를 대체한다. 둘을 함께 적용하려면 `ObjectInputFilter.merge`(JDK 17 이상)로 합치거나 `jdk.serialFilterFactory`로 조합한다.
- 패턴은 `;`로 나누고 `!`로 시작하면 거부한다. `pkg.*`는 그 패키지, `pkg.**`는 하위 패키지까지 맞춘다. `maxarray`, `maxdepth`, `maxrefs`, `maxbytes` 한도는 위치와 관계없이 먼저 평가하고 나머지 패턴은 왼쪽부터 평가한다. 어느 패턴에도 맞지 않으면 판정은 UNDECIDED이고 스트림은 REJECTED가 아닌 판정에서 역직렬화를 계속하므로, 허용 목록은 `!example.somepackage.SomeClass;example.somepackage.*;!*`처럼 마지막에 `!*`를 둔다. 배열은 원소 타입으로 판정한다. API 문서의 패턴 규칙에는 없지만 JDK 25의 OpenJDK 구현은 원소가 원시 타입이면 패턴과 관계없이 UNDECIDED를 돌려주고 `maxarray`를 지정하지 않으면 길이 한도가 없으므로, `byte[]` 같은 원시 타입 배열의 길이는 `!*`가 아니라 `maxarray`로 제한한다.
- 필터 판정은 `java.io.serialization` logger에 남는다. `$JDK_HOME/conf/logging.properties`에서 수준을 `FINE`으로 두면 거부, `FINEST`로 두면 모든 판정이 기록되므로 실제로 역직렬화되는 클래스를 관찰해 허용 목록을 만드는 데 쓸 수 있다(적용 판단). 기본 콘솔 handler의 수준은 `INFO`이므로 콘솔에서 보려면 `java.util.logging.ConsoleHandler.level`도 같은 수준으로 낮춘다. 필터는 방어 수단이지 안전 보증이 아니며, 그 경계는 [[Java-IO-Serialization-and-Data-Formats#Java native serialization의 안전 경계|Java 직렬화의 안전 경계]]를 따른다.

```java
// 그래프에 나오는 클래스를 모두 허용 목록에 넣고, 원시 타입 배열은 패턴으로 걸러지지 않으므로 maxarray로 길이를 제한한다
ObjectInputFilter filter = ObjectInputFilter.Config.createFilter(
        "maxarray=10000;maxdepth=10;maxrefs=1000;maxbytes=65536;com.example.order.*;!*");
try (ObjectInputStream in = new ObjectInputStream(input)) {
    in.setObjectInputFilter(filter); // 첫 readObject 전에 한 번만 설정할 수 있다
    OrderMessage message = (OrderMessage) in.readObject(); // 거부되면 InvalidClassException
}
```

## 다른 런타임에 옮길 때

값 바인딩과 셸을 거치지 않는 프로세스 실행은 언어가 달라도 같은 원칙이며, TypeORM 바인딩과 Node.js `execFile` 인자 배열은 [[SQL-Injection]]과 [[Command-Injection]]에 있다. 복원 중 코드를 실행할 수 있는 형식은 Java 밖에도 있어 Python pickle의 경계는 [[Signed-Payload-Deserialization|서명된 페이로드의 역직렬화]]를 따른다. XML의 DTD와 외부 엔티티 제한은 다른 파서에서도 내릴 결정이지만 설정 이름과 기본값은 파서마다 다르므로 해당 파서 문서로 확인한다.

## 운영과 면접 체크포인트

- 보안 검사를 호출자에게 맡긴 메서드가 있는가? 검사를 진입점으로 모았거나 남는 사전 조건을 API 문서에 적었는가?
- 의존성 목록이 프레임워크의 전이 의존성과 애플리케이션에 번들한 사본까지 포함하는가? 과거 이슈가 몰린 기능(JNDI lookup, 표현식 평가, 문자열 보간)을 끄는 설정을 확인했는가?
- XML 입력마다 DTD 필요 여부를 정하고 FSP 명시, `disallow-doctype-decl`, `jdk.xml.dtd.support` 중 맞는 설정을 적용했는가? FSP가 기본으로 켜져 있다는 사실만으로 XXE가 막혔다고 보지 않는다.
- 신뢰하지 않는 바이트가 `ObjectInputStream`에 닿는가? 피할 수 없다면 스트림별 허용 목록, 한도와 마지막 `!*`를 두고 거부 로그를 확인하는가? 예외 메시지, 타입, 스택 추적과 고민감 정보가 응답, HTML과 로그에 새지 않는가?
- Q. JDK 24 이후 신뢰하지 않는 코드는 어떻게 격리하나? Security Manager를 켤 수 없으므로 JEP 486이 안내한 컨테이너, 하이퍼바이저와 OS 메커니즘으로 격리하고, 데이터가 코드로 해석되는 경로(INJECT-8) 자체를 줄인다.
- Q. Log4Shell에서 무엇을 배웠나? 신뢰하지 않는 데이터로 JNDI lookup을 하지 않는다는 INJECT-8과, 수정판이 나온 뒤에도 취약 버전이 계속 내려받아지는 현실에 대응하는 FUNDAMENTALS-8의 업데이트 추적을 함께 말한다.

## 출처

- [Oracle, Secure Coding Guidelines for Java SE](https://www.oracle.com/java/technologies/javase/seccodeguide.html) — 2026-11-04 확인, Document version 11.0(Last updated June 2025). 목차 전체, 서문, 0~3장, 5장, 8장, 9장 도입부와 이동 표기 대조. 같은 날 재검증에서는 직접 열람이 HTTP 403으로 막혀, Oracle 도메인 검색 결과의 부분 인용과 요약으로 문서 버전과 일부 지침 문구를 다시 확인했다
- [OpenJDK, JEP 486: Permanently Disable the Security Manager](https://openjdk.org/jeps/486)
- [Oracle, Java SE 25 Core Libraries: Creating Pattern-Based Filters](https://docs.oracle.com/en/java/javase/25/core/creating-pattern-based-filters.html) — 설정 위치별 범위, 패턴 문법, 한도와 예시 필터
- [Oracle, Java SE 25 Core Libraries: Logging Filter Actions](https://docs.oracle.com/en/java/javase/25/core/logging-filter-actions.html)
- [Java SE 25, ObjectInputFilter.Config](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/ObjectInputFilter.Config.html) — `createFilter` 문법, UNDECIDED, 속성 설정 경로
- [Java SE 25, ObjectInputStream](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/ObjectInputStream.html) — `setObjectInputFilter` 호출 시점과 거부 시 예외
- [ObjectInputFilter.java (jdk-25-ga) — OpenJDK](https://github.com/openjdk/jdk25u/blob/jdk-25-ga/src/java.base/share/classes/java/io/ObjectInputFilter.java) — 패턴 필터가 원시 타입 배열을 UNDECIDED로 두고 `maxarray` 기본값을 `Long.MAX_VALUE`로 두는 구현
- [Java SE 25, ConsoleHandler](https://docs.oracle.com/en/java/javase/25/docs/api/java.logging/java/util/logging/ConsoleHandler.html) — handler 기본 수준 `INFO`
- [Java SE 25, JLS 5.1.3 Narrowing Primitive Conversion](https://docs.oracle.com/javase/specs/jls/se25/html/jls-5.html#jls-5.1.3) — NaN과 무한대의 정수 변환
- [Release Note: Adjust XSLT and XPath Extension Function Property — OpenJDK](https://bugs.openjdk.org/browse/JDK-8343024) — JDK 24의 `jdk.xml.enableExtensionFunctions` 기본값 변경
- [Oracle, Java SE 25 JAXP Security Guide](https://docs.oracle.com/en/java/javase/25/security/java-api-xml-processing-jaxp-security-guide.html) — FSP 기본값과 외부 연결, `jdk.xml.dtd.support`, `disallow-doctype-decl`, 확장 함수 기본값
- [Oracle, Java SE 21 JAXP Security Guide](https://docs.oracle.com/en/java/javase/21/security/java-api-xml-processing-jaxp-security-guide.html) — `jdk.xml.dtd.support` 부재 확인
- [Apache Logging Services, Security](https://logging.apache.org/security.html) — CVE-2021-44228, CVE-2021-45046과 후속 CVE의 영향 버전과 수정 버전
- [Release Notes — Apache Log4j 2](https://logging.apache.org/log4j/2.x/release-notes.html) — 2.15.0, 2.16.0의 lookup과 JNDI 변경
- [Confluence Security Advisory 2022-06-02 — Atlassian](https://confluence.atlassian.com/doc/confluence-security-advisory-2022-06-02-1130377146.html)
- [Apache Commons Text, Security](https://commons.apache.org/proper/commons-text/security.html)
- [Unnecessary Risk: The Persistence of Open Source Vulnerabilities — Sonatype](https://www.sonatype.com/blog/unnecessary-risk-the-persistence-of-open-source-vulnerabilities) — 2025-12-10 게시, Log4j 다운로드 수치
- [XZ Utils backdoor — Tukaani](https://tukaani.org/xz-backdoor/) — 영향 버전과 CVE-2024-3094
- [Java Secure Coding Guidelines — JavaOne 2026, Andrew Gross](https://www.youtube.com/watch?v=-AjYEYmRLmQ)

## 관련 문서

- [[Application-Security|애플리케이션 보안 / 시큐어코딩]]
- [[Security-Architecture-and-Threat-Modeling|보안 아키텍처와 위협 모델링]]
- [[Supply-Chain-Security|공급망 보안]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]
- [[Coding-Agent-Package-Hallucination|코딩 에이전트의 패키지 환각 공격]]
- [[Java-IO-Serialization-and-Data-Formats|Java 직렬화와 데이터 형식]]
- [[Signed-Payload-Deserialization|서명된 페이로드의 역직렬화]]
- [[보안(Security)|보안 인덱스]]
