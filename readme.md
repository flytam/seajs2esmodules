### seajs 模块转化到 es 风格模块的脚本

@author [flytam](https://github.com/flytam)

```javascript
// seajs模块
define("main/a", function(require, exports, module) {
    var platform = require("platform");
    var d = require("other/d");
    var b = require("main/b");
    var c = require("./c");
    exports.test = 2;
    module.exports = {
        hello() {
            console.log("hello");
        }
    };
});

define("main/main1/1", function(require, exports, module) {
    var x = require("main/main2/2");
    module.exports = {};
});
define("main/main2/2", function(require, exports, module) {
    var x = require("main/main1/1");
    module.exports = {};
});
define("main/b", function(require, exports, module) {
    var platformb = require("platformb");
    var c = require("./c");
    c.say();
    exports.test = function() {};
    module.exports = {
        hello() {
            console.log("hello b");
        }
    };
});

define("main/c", function(require, exports, module) {
    module.exports = {
        say() {
            console.log("hello c");
        }
    };
});
```

转换后。在项目 output 目录下

-   main/a.js

```javascript
import b from "./b";
import c from "./c";

var platform = seajs.require("platform");

var d = seajs.require("other/d");

export let test = 2;
export default {
    hello() {
        console.log("hello");
    }
};
```

-   main/b.js

```javascript
import c from "./c";

var platformb = seajs.require("platformb");

c.say();
export let test = function() {};
export default {
    hello() {
        console.log("hello b");
    }
};
```

-   main/c.js

```javascript
import b from "./b";
var m = {
    b: b
};
export default {
    say() {
        console.log("hello c");
    }
};
```

-   main/main1/1.js

```javascript
import x from "../main2/2";
export default {};
```

-   main2/2.js

```javascript
import x from "../main1/1";
export default {};
```

### 使用

```bash
npm install

node index.js //即可看到效果，默认输入是 input/input.js 。输出是output文件夹
```

tips:

1、只考虑了自己工作实际遇到的场景，假设了 seajs 第一级路由下的路径当前页面才加载的.有的逻辑不太好，不排除一些情况下解析有问题

2、处理非本页面模块的代码可以直接修改源码。我这里直接用`seajs.require`

3、目前还有不少 bug...但是用来学习 babel 插件编写还是可以的

仍然有 bug。。。因为没有将公司一大坨 seajs 代码成功转通

### 测试

```bash
npm run test
```

### [已知问题](./todo.md)
