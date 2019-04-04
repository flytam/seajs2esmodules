已知问题

1、

```javascript
var c;
var Module = (c = module.exports = function A() {
    var a = 1 + 1;
});
```

2、多次 require 时只 import 一遍

3、

```javascript
var f = () => {};
f("test", require("./module"));
```
