import { zip } from 'es-toolkit';
import { map, fromPairs } from 'es-toolkit/compat';

const csvData = `이름,나이,부서,급여,입사일,활성화여부
김철수,30,개발팀,5500000,2022-03-15,true
이영희,25,디자인팀,4200000,2023-01-10,true
박민수,35,마케팅팀,6000000,2021-08-20,true
정수연,28,개발팀,5000000,2022-11-05,true
최지훈,32,인사팀,4800000,2020-06-12,false
한미영,27,디자인팀,4500000,2023-05-22,true
장동건,29,개발팀,5200000,2022-09-18,true`;

const lines = csvData.split('\n');
const headers = lines[0].split(',');
const data = lines.slice(1);

const parsedCSV = data.reduce((acc: Record<string, string>[], row: string) => {
    const rowObj = row.split(',').reduce((obj: Record<string, string>, value: string, index: number) => {
        obj[headers[index]] = value;
        return obj;
    }, {});

    acc.push(rowObj);
    return acc;
}, []);

// 타입 명시를 해야 Record로 읽을 수 있다.
// 가독성이나 에러메시지 명시성 때문에 {[key: string]: string} 보다 나음.
const parsedCSV2: Record<string, string>[] = data.map((row: string) => {
    return Object.fromEntries(row.split(',').map((value: string, index: number) => [ headers[index], value ]))
});

// 타입 추론으로 Record로 읽을 수 있음
const parsedCSV3 = map(data, row =>
    fromPairs(zip(headers, row.split(',')))
);
