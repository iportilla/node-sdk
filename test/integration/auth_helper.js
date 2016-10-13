var fs = require('fs');
var path = require('path');
var authPath = path.join(__dirname, '../resources/auth.js');

var hasAuth = fs.existsSync(authPath);

exports.describe = hasAuth ? describe : describe.skip.bind(describe);

exports.auth = hasAuth ? require(authPath) : null;
