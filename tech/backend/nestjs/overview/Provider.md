## Provider
Nest의 핵심 개념이다.

서비스, 저장소, 팩토리, 헬퍼와 같은 많은 기본 Nest 클래스는 Provider로 취급할 수 있습니다.

Provider의 핵심 아이디어는 종속성으로 주입되어 객체가 서로 다양한 관계를 형성할 수 있다는 것입니다.

이러한 객체를 "wiring up" 하는 작업은 주로 Nest 런타임 시스템에서 처리합니다.

이 전에는 Controller에 대해 알아보았습니다. Controller는 HTTP 요청을 처리하고 더 복잡한 작업을 Provider에게 위임해야 합니다.

Provider는 NestJS 모듈에서 Provider로 선언된 클래스입니다.

자세한 내용은 'Modules' 챕터를 참조하세요.

Nest를 사용하면 객체 지향 방식으로 종속성을 설계하고 구성할 수 있으므로 SOLID 원칙을 따르는 것을 적극 권장합니다.

### Service
Service는 데이터 저장 및 검색을 처리하며, Controller에서 사용됩니다.

애플리케이션의 로직을 관리하는 역할이 있기 때문에 Provider로 정의하기에 이상적인 후보입니다.

Service는 프로퍼티와 메서드가 있는 클래스입니다.

여기서 중요한 추가 사항은 @Injectable() 데코레이터입니다.

이 데코레이터는 클래스에 메타데이터를 첨부하여 Service가 Nest IoC 컨테이너에서 관리할 수 있는 클래스임을 알립니다.

Service는 클래스 생성자를 통해 주입됩니다. private 키워드 사용에 주목하세요.

private을 사용하면 같은 줄에서 Service 멤버를 선언하고 초기화할 수 있으므로 프로세스가 간소화됩니다.

### Dependency Injection
Nest는 Dependency Injection이라는 강력한 디자인 패턴을 기반으로 구축되었습니다.

[공식 Angular 문서](https://angular.dev/guide/di)에서 이 개념에 대한 훌륭한 글을 읽어보실 것을 적극 권장합니다.

Nest에서는 TypeScript의 기능 덕분에 종속성이 유형에 따라 해결되므로 종속성 관리가 간단합니다.

Nest는 Service의 인스턴스를 생성하고 반환하여(또는 싱글톤의 경우 다른 곳에서 이미 요청된 경우 기존 인스턴스를 반환하여) Service를 해결합니다.

그런 다음 이 종속성은 컨트롤러의 생성자에 주입되거나 지정된 프로퍼티에 할당됩니다.

### Scopes
Provider는 일반적으로 애플리케이션 수명 주기와 일치하는 수명(Scope)을 가지고 있습니다.

애플리케이션이 실행되면 각 종속성을 해결해야 하며, 이는 모든 Provider가 인스턴스화된다는 의미입니다.

마찬가지로 애플리케이션이 종료되면 모든 Provider가 삭제됩니다.

그러나 애플리케이션의 수명 주기가 아닌 특정 요청에 따라 수명이 정해지는 Provider 요청 범위도 만들 수 있습니다.

이러한 기술에 대한 자세한 내용은 [Injection Scope](../fundamentals/Injection-Scopes.md)에서 확인할 수 있습니다.

### Custom Providers
Nest에는 Provider 간의 관계를 관리하는 IOC(inversion of control) 컨테이너가 내장되어 있습니다.

이 기능은 종속성 주입의 기본이지만 실제로는 지금까지 다룬 것보다 훨씬 더 강력합니다.

Provider를 정의하는 방법에는 여러 가지가 있습니다. 일반 값, 클래스, 비동기 또는 동기 팩토리를 모두 사용할 수 있습니다.

공급자를 정의하는 더 많은 예제는 [종속성 주입](../fundamentals/Custom-Provider)챕터 에서 확인하세요.

### Optional Providers
때로는 항상 해결할 필요가 없는 종속성이 있을 수 있습니다.

예를 들어 클래스가 configuration object에 종속될 수 있지만 아무것도 제공되지 않으면 기본값을 사용해야 합니다.

이러한 경우 종속성은 선택 사항으로 간주되며 configuration Provider가 없어도 오류가 발생해서는 안 됩니다.

Provider를 선택 사항으로 표시하려면 생성자 서명에서 @Optional() 데코레이터를 사용합니다.

Custom Provider 및 관련 토큰의 작동 방식에 대한 자세한 내용은 [Custom Provider](../fundamentals/Custom-Provider)를 참조하세요.

### Property-based injection
지금까지 사용한 기술을 생성자 기반 주입이라고 하며, 생성자 메서드를 통해 프로바이더를 주입합니다.

그러나 특정 특정 경우에는 속성 기반 주입이 유용할 수 있습니다.

예를 들어 최상위 클래스가 하나 이상의 Provider에 의존하는 경우 하위 클래스에서 super()를 통해 모든 Provider를 전달하면 번거로울 수 있습니다.

이를 방지하려면 속성 수준에서 @Inject() 데코레이터를 직접 사용할 수 있습니다.

클래스가 다른 클래스를 확장하지 않는 경우 일반적으로 생성자 기반 주입을 사용하는 것이 좋습니다.

생성자는 필요한 종속성을 명확하게 지정하므로 @Inject로 주석이 달린 클래스 프로퍼티에 비해 가시성이 향상되고 코드를 더 쉽게 이해할 수 있습니다.

### Provider registration
이제 공급자(Service)와 소비자(Controller)를 정의했으므로, 서비스를 Nest에 등록하여 인젝션을 처리할 수 있도록 해야 합니다.

이 작업은 모듈 파일을 편집하고 @Module() 데코레이터의 Provider 배열에 Service를 추가하면 됩니다.

### Manual instantiation
지금까지 Nest가 종속성 해결을 위한 대부분의 세부 사항을 자동으로 처리하는 방법에 대해 알아보았습니다.

그러나 경우에 따라 기본 제공 종속성 주입 시스템에서 벗어나 수동으로 공급자를 검색하거나 인스턴스화해야 할 수도 있습니다.

기존 인스턴스를 검색하거나 Provider를 동적으로 인스턴스화하려면 [모듈 참조](../fundamentals/Module-reference)를 사용할 수 있습니다.
