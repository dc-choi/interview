// 값으로서의 this: JS의 this
// => 현재 실행 중인 객체의 인스턴스나 컨텍스트 참조
// 타입으로서의 this: 다형성 this(TS의 this)
// => 현재 클래스의 타입, 서브타입을 포함한 타입추론에 쓰이는 자기 참조 타입
// (따라서 메서드 체이닝을 정확하게 타입 추론해서 쓸 수 있음)

class Circle {
    private radius: number = 0;

    setRadius(radius: number) {
        this.radius = radius;
        return this;
    }
}

class Cylinder extends Circle {
    private height: number = 0;

    setHeight(height: number) {
        this.height = height;
        return this;
    }
}
const cylinder = new Cylinder().setRadius(1).setHeight(1);

const v = typeof Cylinder;

type T = typeof Cylinder;
const t: T = Cylinder;

console.log(v);
console.log(t);