---
tags: [java, package, import, static-import, access-control, class-loader]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Packages and Imports", "Java package와 import"]
---

# Java package와 import

package는 type의 이름 공간과 package access 경계를 만들고, import는 compile time에 simple name을 어느 type으로 해석할지 정한다. 이름 해석 규칙을 알면 import 충돌, 조용히 다른 class를 쓰는 실수와 class path 충돌을 구분할 수 있다. constructor와 access control 전반은 [[Java-Language-Construction-and-Encapsulation|Java 생성과 캡슐화]]에서 다룬다.

## package와 import의 기본

package는 type의 qualified name과 package access 경계를 만든다.

~~~java
package com.example.order;

import com.example.member.Member;
~~~

- package 이름에 reverse domain과 lowercase를 쓰는 것은 충돌을 줄이는 널리 쓰이는 convention이지 모든 Java program에 강제되는 문법 규칙은 아니다.
- 일반적인 file-based build에서는 package와 source directory를 맞추지만 package 자체가 물리 folder와 동일한 개념은 아니다.
- `import`는 compile-time 이름 해석을 간단하게 한다. class file을 복사하거나 runtime dependency를 설치하지 않는다.
- wildcard import는 지정한 package의 type 이름을 대상으로 하며 하위 package까지 재귀적으로 가져오지 않는다.
- `java.lang`의 type과 같은 package의 type은 single-type import 없이 사용할 수 있다.

## 이름 충돌과 해석 우선순위

class는 simple name이 아니라 package를 포함한 fully qualified name(FQN)으로 구분된다.

~~~java
import java.util.Date;

final class Settlement {
    Date createdAt = new Date();
    java.sql.Date settledOn = java.sql.Date.valueOf("2026-09-30");
}
~~~

- FQN은 import 없이 언제든 쓸 수 있다. 같은 simple name의 두 type을 한 file에서 쓰려면 하나만 import하고 다른 하나는 FQN으로 쓴다.
- 같은 simple name의 서로 다른 type을 single-type import 두 개로 가져오면 compile error다(`a type with the same simple name is already defined by the single-type-import of Date`). import한 이름과 같은 top-level type을 그 file에 선언해도 error다.
- single-type import는 같은 package의 다른 file에 선언된 같은 이름 type과 on-demand import로 들어온 같은 이름을 가린다. 다른 package에서 복사한 code의 import가 딸려 오면, import된 class가 public일 때는 오류 없이 같은 package의 class 대신 그 class를 쓴다. package access class일 때만 접근 오류로 드러난다.
- 같은 이름을 담은 on-demand import(`*`) 두 개는 선언만으로는 오류가 아니지만 그 이름을 쓰는 순간 `reference to List is ambiguous`가 난다(`java.util.*`와 `java.awt.*`). 나중에 가져온 package에 같은 이름의 type이 추가돼도 기존 code가 깨질 수 있다. 그 이름을 single-type import하면 그쪽으로 해석된다.
- JDK 25에서 정식 기능이 된 `import module` 선언(JEP 511)으로 들어온 이름은 on-demand import와 single-type import에 가려진다.
- 실무에서는 IDE가 관리하는 single-type import를 기본으로 하고 충돌하는 쪽만 FQN으로 쓴다. wildcard 허용 여부는 팀 style 설정을 따른다.

## class path의 FQCN 충돌

reverse domain package 관례가 막으려는 것은 배포 뒤의 충돌이다. JLS도 고유한 package 이름을 쓰지 않으면 충돌이 만든 곳과 먼 곳에서 해결하기 어렵게 나타날 수 있다고 경고한다.

- class path에 같은 FQCN이 둘 있으면 class path 순서상 먼저 찾은 하나만 로드되고 나머지는 가려진다. directory wildcard(`lib/*`)로 펼친 JAR의 순서는 명세되지 않아 환경마다 이기는 쪽이 달라질 수 있다.
- compile 때 본 것과 다른 버전이 로드되면 compile은 통과했어도 실행 중 `NoSuchMethodError` 같은 `LinkageError`로 드러난다.
- named module에서는 한 module이 같은 package를 export하는 두 module을 함께 읽으면 module resolution 단계에서 실패한다(split package).

## 하위 package는 별개 package다

package 이름의 계층은 관련 package를 정리하는 관례일 뿐 접근 관계를 만들지 않는다. `com.shop.order`와 `com.shop.order.domain`은 서로 무관한 package라서 서로 쓰려면 import가 필요하고, package access member는 import해도 접근할 수 없다.

- 함께 바뀌며 package access로 협력하던 class를 하위 package로 쪼개면 그 member를 `public`으로 넓혀야 한다. `public`은 code base 전체에 공개되므로 캡슐화 경계가 약해진다.
- 함께 바뀌고 비공개 member로 협력하는 class는 한 package에 두고 package 사이에는 의도한 public 계약만 둔다. 도메인별 package 분할([[Elegant-OOP-Design|우아한 객체지향]])도 package를 잘게 나눌수록 public 표면이 늘어나는 비용과 함께 판단한다.
- 여러 package 묶음 단위로 공개를 더 좁혀야 하면 module의 `exports`가 다음 경계다.

## static import

~~~java
import static java.lang.Math.max;

int larger = max(left, right);
~~~

- `import static Type.member;`는 그 이름의 static member를, `import static Type.*;`는 접근 가능한 모든 static member를 class 이름 없이 쓰게 한다. field와 method 모두 대상이다.
- Oracle 가이드는 매우 드물게 쓰라고 권한다. 한두 class의 static member에 자주 접근할 때만 쓰고, 남용하면 member가 어느 class에서 왔는지 알 수 없다. 한 class의 member를 `*`로 전부 가져오는 방식은 특히 가독성에 해로우므로 한두 개만 필요하면 개별로 가져온다. 상수를 쓰려고 interface를 구현하는 Constant Interface 안티패턴의 대안으로 도입됐다.
- test assertion처럼 관례가 굳은 경우나 반복이 많은 소수 member에 한정한다.
- 호출하는 class가 같은 이름의 method를 member로 가지면 signature가 달라도 static import한 method는 후보에서 빠져 compile error가 날 수 있다. 같은 이름의 field나 local variable도 static import한 field를 가린다.

## 면접 체크포인트

- import가 runtime dependency를 해결하지 않는 이유
- 같은 simple name의 두 type을 한 file에서 쓰는 방법
- 복사한 import가 같은 package의 class를 조용히 가리는 조건
- wildcard import 두 개가 compile error가 되는 시점
- 상위 package와 하위 package 사이에 접근 특권이 없는 이유와 package 분할 비용
- class path의 같은 FQCN이 실행 중 오류로 드러나는 방식
- static import를 제한해서 쓰는 이유

## 출처

- [Java SE 26 Language Specification, Names and Access Control](https://docs.oracle.com/javase/specs/jls/se26/html/jls-6.html)
- [Java SE 26 Language Specification, Packages and Modules](https://docs.oracle.com/javase/specs/jls/se26/html/jls-7.html)
- [Java SE 26 Language Specification, Expressions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html)
- [Oracle, Static Import](https://docs.oracle.com/javase/8/docs/technotes/guides/language/static-import.html)
- [Oracle, JDK 8 Setting the Class Path](https://docs.oracle.com/javase/8/docs/technotes/tools/windows/classpath.html)
- [Oracle, JDK 26 java Command](https://docs.oracle.com/en/java/javase/26/docs/specs/man/java.html)
- [Java SE 26 API, Configuration](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/module/Configuration.html)
- [Java SE 26 API, NoSuchMethodError](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/NoSuchMethodError.html)
- [OpenJDK JEP 511, Module Import Declarations](https://openjdk.org/jeps/511)
- 김영한 강사, [참조형과 메서드 호출 - 활용](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194655)
- 김영한 강사, [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194659)
- 김영한 강사, [패키지 - 시작](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194675)
- 김영한 강사, [패키지 - import](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194676)
- 김영한 강사, [패키지 규칙](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194677)
- 김영한 강사, [패키지 활용](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194678)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194679)
- 김영한 강사, [접근 제어자 사용 - 필드, 메서드](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194683)
- 김영한 강사, [접근 제어자 사용 - 클래스 레벨](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194684)
- 김영한 강사, [static 메서드3](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194697)
- 김영한 강사, [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194698)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194699)
- 인프런, [패키지와 static](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13693)

## 관련 문서

- [[Java-Language-Construction-and-Encapsulation|Java 생성과 캡슐화]]
- [[Java-Language-Class-Members-and-Memory|Java 클래스 멤버와 메모리 모델]]
- [[JVM-Architecture|JVM 아키텍처]]
- [[Elegant-OOP-Design|우아한 객체지향]]
