// const el = document.getElementById('testing-quality'); // HTMLElement | null
// if (typeof el === 'object') {
//     el; // HTMLElement | null
// }

const foo = (x? : number | string | null) => {
    if (!x) {
        console.log(typeof x);
    }
}
foo(0);
foo('');
foo(null);
foo(undefined);
