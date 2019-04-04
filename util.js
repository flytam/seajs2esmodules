const fs = require("fs");
const path = require("path");
const fsExistSync = way => {
    try {
        fs.accessSync(way, fs.constants.W_OK);
    } catch (e) {
        return false;
    }
    return true;
};

const mkdirsSync = dirname => {
    if (fsExistSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
};

module.exports = {
    mkdirsSync,
    fsExistSync
};
