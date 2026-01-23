### 클로저
함수가 선언될 당시의 스코프(outer 참조의 LexicalEnvironment)에 접근할 수 있는 함수

즉, 함수가 반환되거나 다른 곳으로 전달된 후에도 함수 내부에서 외부 환경의 변수에 접근할 수 있게 만드는 매커니즘

- 클로저의 핵심 요소
```
1. 함수가 실행될 때마다 Lexical Environment가 생성된다.

2. 반환된 함수는 외부 함수의 Lexical Environment를 스코프 체인을 통해 참조한다.

3. 외부 함수가 종료되어도 반환된 함수가 해당 환경을 참조하고 있기 때문에 외부 함수의 변수는 메모리에 유지된다.
```

- 클로저가 외부 환경을 기억하는 과정
```
1. 함수 선언 시 (Compile Time)
함수가 선언될 때, JS 엔진은 해당 함수의 Lexical Environment를 설정한다.

이때 함수는 자신이 선언된 위치의 Scope Chain을 기억한다.

2. 함수 실행 시 (Runtime)
함수가 실행되면, JS 엔진은 새로운 Execution Context를 생성한다.

내부 함수는 외부 함수의 Lexical Environment를 Scope Chain의 일부로 참조한다.

3. 함수 반환 후 (Closure Creation)
내부 함수가 반환되거나 다른 곳에 전달되면, 해당 함수는 여전히 외부 함수의 Lexical Environment를 참조한다.

외부 함수의 실행이 종료되더라도 내부 함수가 이 환경을 참조하고 있기 때문에 외부 함수의 변수는 GC에 의해 제거되지 않고 Heap Memory에 유지된다.
```

- 클로저의 활용
```
1. 데이터 캡슐화와 정보 은닉 
클로저를 사용해 특정 함수 내의 변수를 외부로부터 숨기고, 특정 함수를 통해서만 접근할 수 있도록 한다.
```
```javascript
// Capsulation and Concealment Example
function counter() {
	let privateCounter = 0;

	function changeBy(val) {
		privateCounter += val;
	}

	return {
		increase() {
			changeBy(1);
		},
		decrease() {
			changeBy(-1);
		},
		getValue() {
			return privateCounter;
		}
	}
}

const myCounter = counter();

console.log(myCounter.getValue()); // 0
myCounter.increase();
myCounter.increase();
console.log(myCounter.getValue()); // 2
myCounter.decrease();
console.log(myCounter.getValue()); // 1
```

- 클로저의 주의점
```
1. 메모리 누수
클로저를 잘못 사용하면 참조가 끊어지지 않아 메모리 누수가 발생할 수 있다.
```
