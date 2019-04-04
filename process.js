const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generator = require("@babel/generator").default;
const template = require("@babel/template").default;
const nodejsPath = require("path");

const builExportDefaultTemplate = template(`
export default EXPORTOBJECT
`);
const buildExportTemplate = template(`
export let VARIABLE = RIGHTEXPRESSION
`);
const buildRelativeImportTemplate = template(`
import %%moduleName%% from %%modulePath%%
`);

// 根据传入的ast生成相应文件
const processFile = function(asts) {
    const newSourceCodes = asts.map(ast => {
        let root = null;
        let currentPath = null;
        let mainBodyNode = null;
        let exportDefaultAst = null;
        const importArr = [];
        //console.log(ast)
        //console.log("-----")
        const newAst = t.file(t.program([ast]));
        //console.log(newAst)
        //console.log("-----")
        traverse(newAst, {
            CallExpression: {
                enter(path) {
                    if (path.node.callee.name === "define") {
                        // 获取当前模块的路径
                        currentPath =
                            path.node.arguments[0] &&
                            path.node.arguments[0].value;
                    }

                    if (path.node.callee.name === "require") {
                        // 处理require关系

                        const isKeyValueRequire =
                            path.parentPath.node.key &&
                            path.parentPath.node.value;
                        // 有一种要特殊处理的
                        // var module = {
                        //     a: require("main/a"),
                        // };

                        // 当前依赖的根路径
                        let currentRootPath =
                            root ||
                            (currentPath && currentPath.match(/^\w+(?=\/)/));
                        currentRootPath = currentRootPath && currentRootPath[0];

                        // 依赖进来的模块路径
                        const requireModulePath =
                            path.node.arguments[0] &&
                            path.node.arguments[0].value;

                        if (
                            new RegExp(`^${currentRootPath}`).test(
                                requireModulePath
                            )
                        ) {
                            // // 绝对路径依赖并且在当前目录范围内
                            const moduleName = isKeyValueRequire
                                ? path.parentPath.node.key.name
                                : path.parentPath.node.id.name;

                            let modulePath = nodejsPath.join(
                                nodejsPath.relative(
                                    nodejsPath.parse(currentPath).dir,
                                    nodejsPath.parse(requireModulePath).dir
                                ),
                                `./${nodejsPath.parse(requireModulePath).base}`
                            );
                            // 例如./a会被解析成a。需要处理下
                            if (modulePath[0] !== ".") {
                                modulePath = "./" + modulePath;
                            }
                            importArr.push({
                                moduleName,
                                modulePath
                            });
                            if (isKeyValueRequire) {
                                path.parentPath
                                    .get("value")
                                    .replaceWith(
                                        path.parentPath.get("key").node
                                    );
                            } else {
                                path.parentPath.parentPath.remove();
                            }
                        } else if (requireModulePath[0] === ".") {
                            // 相对路径依赖，把import声明提前
                            const moduleName = isKeyValueRequire
                                ? path.parentPath.node.key.name
                                : path.parentPath.node.id.name;
                            const modulePath =
                                path.node.arguments[0] &&
                                path.node.arguments[0].value;
                            importArr.push({
                                moduleName,
                                modulePath
                            });
                            if (isKeyValueRequire) {
                                path.parentPath
                                    .get("value")
                                    .replaceWith(
                                        path.parentPath.get("key").node
                                    );
                            } else {
                                path.parentPath.parentPath.remove();
                            }
                        } else {
                            // 平台依赖处理 const constants = require('constants') => const constants = seajs.require('constants')
                            path.get("callee").replaceWithSourceString(
                                `seajs.require`
                            );
                        }
                    }
                },
                exit(path) {
                    if (path.node.callee.name === "define") {
                        //获取块代码提取到最外面
                        let mainBodyPath = path.get("arguments.1.body.body");
                        if (!Array.isArray(mainBodyPath)) {
                            mainBodyPath = [mainBodyPath];
                        }
                        mainBodyNode = mainBodyPath.map(item => item.node);
                    }
                }
            },
            AssignmentExpression: {
                enter(path) {
                    if (
                        path.get("left.object") &&
                        path.get("left.object").node.name === "module" &&
                        path.get("left.property") &&
                        path.get("left.property").node.name === "exports"
                    ) {
                        // 处理module.exports类型的导出
                        exportDefaultAst = builExportDefaultTemplate({
                            EXPORTOBJECT: path.node.right
                        });
                        // var a=(module.exports=b) 这种也要处理
                        path.replaceWith(path.get("right").node);
                    } else if (
                        path.get("left.object") &&
                        path.get("left.object").node.name === "exports" &&
                        path.get("left.property") &&
                        path.get("left.property").node.name
                    ) {
                        // 处理exports.x类型的导出
                        const variable = path.node.left.property;
                        const rightExpression = path.node.right;
                        const ast = buildExportTemplate({
                            VARIABLE: variable,
                            RIGHTEXPRESSION: rightExpression
                        });
                        path.parentPath.replaceWith(ast);
                    }
                }
            },
            Program: {
                exit(path) {
                    // 将define回调函数提取到最外部
                    if (mainBodyNode) {
                        path.node.body = mainBodyNode;
                    }

                    // 将import的语句都提前到首部
                    importArr
                        .reverse()
                        .forEach(({ moduleName, modulePath }) => {
                            const ast = buildRelativeImportTemplate({
                                moduleName: t.identifier(moduleName),
                                modulePath: t.stringLiteral(modulePath)
                            });
                            path.node.body.unshift(ast);
                        });

                    // export default 放在最底部，最多只有一个
                    if (exportDefaultAst) {
                        path.node.body.push(exportDefaultAst);
                    }
                }
            }
        });
        return {
            path: currentPath,
            code: generator(newAst).code
        };
    });

    return newSourceCodes;
};

module.exports = processFile;
