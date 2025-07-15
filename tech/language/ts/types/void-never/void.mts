// void
// return을 사용하고 싶지 않은 경우 사용.

const void1: () => void = () => {
    console.log("hello");
};

function void2(): void {}

void1();
void2();
