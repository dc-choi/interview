const parseCSV = (input: string): {[colName: string]: string}[] => {
    const lines = input.split('\n');
    const [ header, ...rows ] = lines;
    const headerCol = header.split(',');

    return rows.map(rowStr => {
        const row: { [colName: string]: string } = {};

        rowStr.split(',').forEach((ceil, index) => {
            row[headerCol[index]] = ceil;
        });

        return row;
    });
};

type Vec2D = Record<'x' | 'y', number>;
type Vec3D = { [key in 'x' | 'y' | 'z'] : number };
type ABC = { [key in 'a' | 'b' | 'c']: key extends 'b' ? string : number };

let x = {};
// @ts-ignore
x[[1,2,3]] = 2;
console.log(x); /// { '1,2,3': 2 }

console.log({ 1: 2, 2: 3, 3: 4 }); // { '1': 2, '2': 3, '3': 4 }

console.log(typeof []); // object

let y = [ 1, 2, 3 ];
console.log(y['1']); // 2
console.log(Object.keys(y)); // [ '0', '1', '2' ]
