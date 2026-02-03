"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendNoContent = sendNoContent;
function sendSuccess(res, data, statusCode = 200, meta) {
    const response = {
        success: true,
        data,
        ...(meta && { meta }),
    };
    res.status(statusCode).json(response);
}
function sendCreated(res, data) {
    sendSuccess(res, data, 201);
}
function sendNoContent(res) {
    res.status(204).send();
}
//# sourceMappingURL=response.js.map