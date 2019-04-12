// 文本内容内的 内联文本语义元素会被一起解析
//https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element
const inlineText = ["a", "b", "q", "span", "small", "strong", "sub", "sup"];

const textContent = ["dir", "div", "dl", "dt", "ol", "p", "ul", "li"];
// 含有组件的 <p><Trans>链接：<a>您好，欢迎访问 CVM</a>hello<a>world</a>and{{bianliang}}</Trans></p> 条件：检测出含有JSXText，然后children含有jsxelement。并且这些jsx element中不包含block的
const input1 = ` <p>链接：<a>您好，欢迎访问 CVM</a>hello<a>world</a>and{bianliang}</p> `;

//纯文本 -> <p>{t(纯文本)}</p> 条件：解析children全是JSXText
const input2 = `<p>纯文本</p>`;

// 含有变量的-> <p>{t(含有变量{{variable}},{variable})}</p> 条件：当前jsxelement是textContent。并且children含有JSXExpressionContainer类型的节点，不包含jsxelement
const input3 = `<p>含有变量{variable}</p>`;

// 非以上条件，每一个jsxelement继续

// 情况1
// 外面加一个<Trans>包着，里面的{} -> {{}}

const template = require("@babel/template").default;
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const widthComponentTpl = template(`<Trans>%%code%%</Trans>`)
// 情况2 直接模版
const pureTextTpl = template(`{t(%%textcontent%%)}`);

// 情况3
const textAndVarTpl = `{t(%%CONTENT%%,{})}`;

const ast = parser.parse(input2, {
    plugins: ["jsx"]
});
traverse(ast, {
    JSXElement: {
        enter(path) {
            const childrenPath = path.get("children");
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
                widthComponentTpl({code})
                path.skip();
                return;
            }
        
    }}
});

console.log(generator(ast).code);
