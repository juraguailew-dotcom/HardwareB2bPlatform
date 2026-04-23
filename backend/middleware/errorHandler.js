const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || 500;
    const response = {
        error: err.message || 'Internal Server Error'
    };

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
        if (err.details) {
            response.details = err.details;
        }
    }

    if (!(err instanceof AppError) && statusCode === 500) {
        console.error('Unhandled server error:', err);
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
