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
                            // 绝对路径依赖并且在当前目录范围内
                            const moduleName = path.parentPath.node.id.name;
                            const modulePath = nodejsPath.relative(
                                currentPath,
                                requireModulePath
                            );
                            importArr.push({
                                moduleName,
                                modulePath
                            });
                            path.parentPath.parentPath.remove();
                        } else if (requireModulePath[0] === ".") {
                            // 相对路径依赖，把import声明提前

                            const moduleName = path.parentPath.node.id.name;
                            const modulePath =
                                path.node.arguments[0] &&
                                path.node.arguments[0].value;
                            importArr.push({
                                moduleName,
                                modulePath
                            });
                            path.parentPath.parentPath.remove();
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
            ExpressionStatement: {
                enter(path) {
                    if (
                        t.isAssignmentExpression(path.node.expression) &&
                        path.node.expression.left.object &&
                        path.node.expression.left.object.name === "module" &&
                        path.node.expression.left.property &&
                        path.node.expression.left.property.name === "exports"
                    ) {
                        // 处理module.exports类型的导出
                        const ast = builExportDefaultTemplate({
                            EXPORTOBJECT: path.node.expression.right
                        });
                        path.replaceWith(ast);
                    }

                    if (
                        t.isAssignmentExpression(path.node.expression) &&
                        path.node.expression.left.object &&
                        path.node.expression.left.object.name === "exports" &&
                        path.node.expression.left.property &&
                        path.node.expression.left.property.name
                    ) {
                        // 处理exports.x类型的导出
                        const variable = path.node.expression.left.property;
                        const rightExpression = path.node.expression.right;
                        const ast = buildExportTemplate({
                            VARIABLE: variable,
                            RIGHTEXPRESSION: rightExpression
                        });
                        path.replaceWith(ast);
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
