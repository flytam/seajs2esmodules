const { fsExistSync, mkdirsSync } = require("../util");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
describe("test for util", () => {
    test("fs not exist", () => {
        const dir = path.resolve(__dirname, "../null_dir");
        expect(fsExistSync(dir)).toBeFalsy();
    });

    test("fs exist", () => {
        const dir = path.resolve(__dirname, "../dir");
        fs.mkdirSync(dir);
        expect(fsExistSync(dir)).toBeTruthy();
        fs.rmdirSync(dir);
    });

    test("test mkdir", () => {
        const dir = path.resolve(__dirname, "../a/b/c");
        mkdirsSync(dir);
        expect(fsExistSync(dir)).toBeTruthy();
        execSync(`rm -rf ${path.resolve(__dirname, "../a")}`);
    });
});
