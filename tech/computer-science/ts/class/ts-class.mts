/**
 * 타입스크립트에서의 클래스
 */

class Employee {
    name: string;
    age: number;
    position: string;

    constructor(name: string, age: number, position: string) {
        this.name = name;
        this.age = age;
        this.position = position;
    }

    work(): void {
        console.log(`${this.name} is working as a ${this.position}.`);
    }
}

const emp1 = new Employee("Alice", 30, "Developer");
emp1.work();

class ExecutiveOfficer extends Employee {
    office: string;
    department: string;

    constructor(name: string, age: number, position: string, office: string, department: string) {
        super(name, age, position);
        this.office = office;
        this.department = department;
    }

    manage(): void {
        console.log(`${this.name} is managing the ${this.department} department.`);
    }
}

const exec1 = new ExecutiveOfficer("Bob", 45, "CEO", "Head Office", "Management");
exec1.work();
exec1.manage();