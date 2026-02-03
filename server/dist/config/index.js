"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.prisma = exports.config = exports.env = void 0;
var env_js_1 = require("./env.js");
Object.defineProperty(exports, "env", { enumerable: true, get: function () { return env_js_1.env; } });
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return env_js_1.config; } });
var database_js_1 = require("./database.js");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return database_js_1.prisma; } });
var redis_js_1 = require("./redis.js");
Object.defineProperty(exports, "redis", { enumerable: true, get: function () { return redis_js_1.redis; } });
//# sourceMappingURL=index.js.map