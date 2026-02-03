"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema, target = 'body') => {
    return (req, _res, next) => {
        try {
            const data = schema.parse(req[target]);
            req[target] = data;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                next(error);
                return;
            }
            next(error);
        }
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.middleware.js.map