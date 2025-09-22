/**
 * 접근 제어자 && 클래스 프로퍼티 축약
 * - public: 기본값, 어디서든 접근 가능
 * - private: 클래스 내부에서만 접근 가능
 * - protected: 클래스와 서브클래스에서 접근 가능
 *
 * 클래스 프로퍼티 축약:
 * - 생성자 매개변수에 접근 제어자를 붙이면, 해당 매개변수가 자동으로 클래스 프로퍼티로 선언되고 초기화됨
 * - 코드가 더 간결해짐
 */

class Employee {
    constructor(
        protected readonly name: string,
        private readonly age: number,
        protected readonly position: string
    ) {}

    work(): void {
        console.log(`${this.name} is working as a ${this.position}.`);
    }
}

const emp1 = new Employee("Alice", 30, "Developer");
emp1.work();

class ExecutiveOfficer extends Employee {
    constructor(
        name: string,
        age: number,
        position: string,
        protected readonly office: string,
        protected readonly department: string
    ) {
        super(name, age, position);
    }

    manage(): void {
        console.log(`${this.name} is managing the ${this.department} department.`);
    }
}

const exec1 = new ExecutiveOfficer("Bob", 45, "CEO", "Head Office", "Management");
exec1.work();
exec1.manage();