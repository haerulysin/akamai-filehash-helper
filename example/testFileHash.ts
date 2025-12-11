import extractFileHash from "../src/index";
import fs from "fs";

import path from "path";

const scriptsDir = path.join(__dirname, "scripts");
const allFiles = fs.readdirSync(scriptsDir);

for (const file of allFiles) {
  if (path.extname(file) !== ".js") {
    continue;
  }
  const fileContent = fs.readFileSync(path.join(scriptsDir, file), "utf8");
  const hash = extractFileHash(fileContent);
  if (hash === null) {
    console.log(`[TEST FAILED] ${file} - Hash not found`);
  } else {
    console.log(`[TEST PASSED] ${file} - Hash : ${hash}`);
  }
}
