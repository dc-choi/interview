# OOP

### 객체지향 프로그래밍
기존 절차지향 패러다임에서 변수와 함수를 따로따로 생각하지 않고 하나의 객체로서 생각하는 패러다임이며 좀 더 현실 세계에 존재하는 사물에 대한 추상화이다.

### 특징
1. 코드의 재사용성이 높다.
2. 코드의 관리가 용이하다.
3. 신뢰성이 높은 프로그래밍을 가능하게 한다.

### 추상화
객체의 공통적인 속성과 기능을 추출하여 정의하는 것이며 객체의 역할만을 정의하여 객체들 간의 관계를 보다 유연하게 연결하는 것. 프로그래밍 문법으로는 추상 클래스와 인터페이스가 있음.

### 캡슐화
데이터 보호와 은닉을 위해 외부로부터 보호하는 것이며 외부로부터 클래스에 정의된 속성과 기능을 보호하고 내부의 동작을 감추고 외부에는 필요한 부분만 노출함. 프로그래밍 문법으로는 접근 제어자가 있음

- public: 접근제한 없음
- protected: 상속받은 하위 클래스에서 접근 가능
- private: 동일 클래스내에서만 접근 가능

### 상속
기존의 클래스를 재사용해서 새로운 클래스를 작성하는 것으로 재사용성을 높이고 코드의 중복을 제거한다.

상속을 통한 오버라이딩의 경우 상위 클래스의 속성과 기능들을 하위 클래스에서 그대로 받아서 사용하거나 선택적으로 재정의할 수 있는 반면, 인터페이스를 통한 구현은 반드시 인터페이스에 정의된 추상 메서드의 내용이 하위 클래스에 정의되어야 함

### 다형성
어떤 객체의 속성이나 기능이 상황에 따라 여러가지 형태를 가질 수 있는 성질이며 프로그래밍적으로는 상위 클래스 타입의 참조변수로 하위 클래스의 인스턴스를 참조할 수 있도록 하는 것이다. 반대로 하위 클래스의 참조변수로 상위 클래스의 인스턴스를 참조하는 것은 불가능하다.

```Java
Class Car {
	String type;
}

Class SuperCar extends Car {

}

Car car = new Car();
Car supercar = new SuperCar();
```

서로 상속관계에 있는 클래스 사이에서 하위타입의 참조변수를 상위타입의 참조변수로 또는 그 반대로 형변환이 가능하다.

```Java
Car car = new Car();
SuperCar supercar = (SuperCar)car;
```

상위타입의 참조변수로 형변환하는 것은 참조변수가 다룰 수 있는 프로퍼티의 개수가 실제 인스턴스가 가지고 있는 프로퍼티의 개수보다 적을 것이 분명하므로 형변환 생략가능

### 오버라이딩
상위 클래스로부터 상속받은 메서드의 내용을 변경하는 것을 오버라이딩이라고 한다.

오버라이딩은 메서드의 내용만을 새로 작성하는 것이다.

따라서 메서드의 선언부는 상위 클래스와 일치하고 이름, 매개변수, 리턴타입이 같아야 한다.

### 오버로딩
매개변수의 개수 또는 타입이 다르면 같은 이름을 사용해서 메서드를 정의할 수 있다.

이것을 오버로딩이라고 한다. 메서드의 이름이 같아야하고, 매개변수의 개수 또는 타입이 달라야한다.

매개변수는 같고 리턴타입이 다른 경우는 오버로딩이 성립되지 않는다.

### SRP (단일 책임 원칙)
하나의 클래스에는 하나의 책임을 부여해야 한다. 응집도를 높이고 결합도를 낮춰서 유지보수에 유용하도록 설계

### OCP (개방 폐쇄 원칙)
클래스의 확장은 열려있고 변경에는 닫혀 있어야 한다. 코드의 동작을 확장할 수 있고 동작을 확장하더라도 그 밖의 코드는 전혀 영향을 받지 않는다.

### LSP (리스코프 치환의 원칙)
서브 타입은 언제나 기반 타입으로 교체할 수 있어야 한다는 원칙. 상위 클래스에서 동작하는 기능은 하위 클래스에서도 동작해야 한다는 것

### ISP (인터페이스 분리의 원칙)
자신이 사용하지 않는 인터페이스는 구현하지 말아야 한다는 원칙. 하나의 큰 인터페이스보다는 여러개의 작은 인터페이스를 구현하는 것이 낫다고 할 수 있음.

### DIP (의존 관계 역전의 원칙)
구조적 디자인에서 발생하는 하위 레벨 모듈의 변경이 상위 레벨 모듈의 변경을 요구하는 위계관계를 끊는 의미의 역전이며 코드에서는 인터페이스에서 구현하는 클래스로 그 의존 관계가 흐르지만 실행시에는 역젼된다.

즉, 중간에 추상화된 인터페이스나 상위 클래스를 두어 자신보다 변하기 쉬운 것에 의존하지 않도록 하는 것
