### seajs 模块转化到 es 风格模块的脚本

@author [flytam]()

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

3、想做成一个包。但是不知道怎么弄才比较通用

4、这个东西可以用来作为学习编写 babel 插件的样例代码了

todo
1、源码解析
2、模版文件引入

已知问题

偶发报错
