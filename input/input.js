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
    var m = {
        b: require("./b")
    };
    module.exports = {
        say() {
            console.log("hello c");
        }
    };
});
