// 文本内容内的 内联文本语义元素会被一起解析
//https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element
const inlineText = ["a", "b", "q", "span", "small", "strong", "sub", "sup"];

const textContent = ["dir", "div", "dl", "dt", "ol", "p", "ul", "li"];
// 含有组件的 <p><Trans>链接：<a>您好，欢迎访问 CVM</a>hello<a>world</a>and{{bianliang}}</Trans></p> 条件：检测出含有JSXText，然后children含有jsxelement。并且这些jsx element中不包含block的
const input1 = `<p>链接：{x+1}<a>您好，欢迎访问 CVM</a>hello<a>world</a>and{bianliang}</p> `;
const input11 = `<p>链接：<a>您好，欢迎访问 CVM</a>hello<a>world</a>and{bianliang+1}</p>`;
//纯文本 -> <p>{t(纯文本)}</p> 条件：解析children全是JSXText
const input2 = `<p>纯文本</p>`;

// 含有变量的-> <p>{t('含有变量{{v:variable+1}}',{v:})}</p> 条件：。并且children含有JSXExpressionContainer类型的节点，不包含jsxelement
const input3 = `<p a={true} b={'x'} >含有变量{variable+1}</p>`;

// 非以上条件，每一个jsxelement继续

// 情况1
// 外面加一个<Trans>包着，里面的{} -> {{}}

const template = require("@babel/template").default;
const parser = require("@babel/parser");
const t = require("@babel/types");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const widthComponentTpl = template(`<Trans>%%code%%</Trans>`, {
    plugins: ["jsx"]
});

// 情况2 直接模版
const pureTextTpl = template(`{t(%%textcontent%%)}`);

// 情况3
const textAndVarTpl = `{t(%%code%%,%%varobj%%)}`;

const ast = parser.parse(input3, {
    plugins: ["jsx"]
});

/**单括号变双括号，返回左/右边的node */
function parseExpressContainerPath(expressContainerPath, context) {
    const expressionPath =
        expressContainerPath && expressContainerPath.get("expression");
    if (!expressionPath) {
        return {};
    }

    let left = null,
        right = null;
    console.log("d1");
    if (
        expressionPath.isLiteral() &&
        !expressionPath.isBooleanLiteral() &&
        !expressionPath.isStringLiteral
    ) {
        console.log("d2", expressionPath.node);
        left = t.identifier(expressionPath.node.name);
        right = t.identifier(expressionPath.node.name);

        expressionPath.replaceWith(
            t.objectExpression([t.objectProperty(left, right, false, true)])
        );
        identifierName = expressionPath.node.name;
    } else if (expressionPath.isBinaryExpression()) {
        left = context.scope.generateUidIdentifier("uid");
        right = expressionPath.node;
        expressionPath.replaceWith(
            t.objectExpression([t.objectProperty(left, right)])
        );
    }

    expressContainerPath.skip();
    return {
        left,
        right
    };
}
traverse(ast, {
    JSXElement: {
        enter(path) {
            let childrenPath = path.get("children");
            if (!childrenPath) {
                return;
            }
            const isAllJSText = childrenPath.every(
                ({ node }) => node.type === "JSXText"
            );
            if (isAllJSText) {
                path.get("children.0").replaceWith(
                    pureTextTpl({
                        textcontent: childrenPath[0].node.value
                    })
                );
                path.skip();
                return;
            }

            const hasJSText = childrenPath.some(
                ({ node }) => node.type === "JSXText"
            );

            const getJSXElement = childrenPath.filter(
                ({ node }) => node.type === "JSXElement"
            );
            const isWithComponent =
                hasJSText &&
                getJSXElement.length > 0 &&
                getJSXElement.some(
                    ({ node }) => !textContent.includes(node.type)
                );

            if (isWithComponent) {
                const children0path = path.get("children.0");

                const nodechildren = childrenPath.map(({ node }) => node);

                // template jsx支持不了？
                const x = t.jsxElement(
                    t.jsxOpeningElement(t.jsxIdentifier("Trans"), []),
                    t.jsxClosingElement(t.jsxIdentifier("Trans")),
                    nodechildren
                );

                children0path.replaceWith(x);
                childrenPath.forEach((child, index) => {
                    if (index != 0) {
                        child.remove();
                    }
                });

                // 单括号->双括号
                // key/value生成 {test} ->{{test:test}}   表达式 {format(x)} -> {{uuid: format(x)}}
                children0path.traverse({
                    JSXExpressionContainer: {
                        enter(expressContainerPath) {
                            parseExpressContainerPath(
                                expressContainerPath,
                                path
                            );
                        }
                    }
                });
                path.skip();
                return;
            }

            const hasJSXExpressionContainer = childrenPath.some(
                path => path.isJSXExpressionContainer
            );
            const isCondition3 =
                getJSXElement.length === 0 && hasJSXExpressionContainer;

            if (isCondition3) {
                let isJSXAttributeVar = false;
                // 收集变量
                const varArr = [];
                path.traverse({
                    JSXExpressionContainer: {
                        enter(subpath) {
                            let isVar = subpath
                                .get("expression")
                                .isIdentifier();
                            if (isVar && subpath.parentPath.isJSXAttribute()) {
                                // 属性上含变量，类似情况2处理，外面加一层Trans。todo 复用情况2的逻辑
                                isJSXAttributeVar = true;
                                subpath.stop();
                                return;
                            }
                            console.log("xx");
                            // 单->双
                            const objAst = parseExpressContainerPath(
                                subpath,
                                path
                            );
                            if (objAst.left && objAst.right) {
                                varArr.push({
                                    objAst
                                });
                            }
                        }
                    }
                });

                if (isJSXAttributeVar) {
                    //
                    console.log("属性上含变量");
                } else {
                    console.log("else");
                    // t.objectProperty(
                    //     path.scope.generateUidIdentifier("uid"),
                    //     expressionPath.node
                    // )
                    // t.objectExpression([t.objectProperty(left, right)])

                    // path.children变成一个字符串
                    // jsx不知道怎么变成字符串。。先重新创建一个program生成。。

                    //path.getSource

                    // childrenPath.forEach(item => console.log(1, item));
                    // const ast = textAndVarTpl({
                    //     code: "",
                    //     varobj: t.objectExpression(
                    //         varArr.map(({ left, right }) => {
                    //             if (left == right) {
                    //                 return t.objectProperty(
                    //                     left,
                    //                     right,
                    //                     false,
                    //                     true
                    //                 );
                    //             } else {
                    //                 return t.objectProperty(left, right);
                    //             }
                    //         })
                    //     )
                    // });
                }

                console.log(varArr);
                path.skip();
            }
        }
    }
});
// 有一个bug....变量不一定是在children上
console.log(generator(ast).code);
