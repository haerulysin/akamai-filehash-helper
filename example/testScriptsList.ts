import extractFileHash from "../src/index";
import fs from "fs";

const srcList : number[] =[
    9975588
]

srcList.forEach(async (src) => {
    const fileContent = fs.readFileSync(`scripts/${src}.js`, "utf8");
    const hash = extractFileHash(fileContent);
    if(src!==hash){
        console.log(`[TEST FAILED] ${src}.js Failed - Hash : ${hash}`);
    }else{
        console.log(`[TEST PASSED] ${src}.js Passed - Hash : ${hash}`);
    }
});