define("main/a", function(require, exports, module) {
    var platform = require("platform");
    var b = require("main/b");
    var c = require("./c");
    exports.test = 2;
    module.exports = {
      hello() {
        console.log("hello");
      }
    };
  });
  
  define("main/b", function(require, exports, module) {
    var platformb = require("platformb");
    var c = require("./c");
    c.say()
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