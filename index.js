// 将输入的代码，按define模块分割

const traverse = require("@babel/traverse").default;
const parser = require("@babel/parser");
const fs = require("fs");
const path = require("path");
const { fsExistSync, mkdirsSync } = require("./util");
const { execSync } = require("child_process");
// 输入文件。目前只单文件输入，多文件的话用打包工具把seajs模块文件打包成单文件再调用这个脚本
const source = fs.readFileSync("./input/input1.js", {
    encoding: "utf8"
});

// 指定输出路径
const output = "./output";
execSync("rm -rf " + output);
if (!fsExistSync(output)) {
    fs.mkdirSync(output);
}
const processAst = require("./process");
const ast = parser.parse(source);

let fileBody = null;

traverse(ast, {
    Program: {
        enter(path) {
            fileBody = path.node.body;
        }
    }
});
processAst(fileBody).forEach(({ path: outputPath, code }) => {
    const { dir } = path.parse(outputPath);
    mkdirsSync(path.join(output, dir));
    const writeStream = fs.createWriteStream(
        path.join(output, `./`, `${outputPath}.js`),
        "utf8"
    );
    writeStream.write(code);
    writeStream.end("");
});
