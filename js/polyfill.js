/**
 * Promise.any polyfill
 * 為不支持 Promise.any 的瀏覽器提供支持
 */

if (!Promise.any) {
    Promise.any = function(promises) {
        return new Promise((resolve, reject) => {
            // 如果傳入的不是可迭代對象，則拋出錯誤
            if (!promises || typeof promises[Symbol.iterator] !== 'function') {
                return reject(new TypeError('Promise.any requires an iterable'));
            }
            
            const promiseArray = Array.from(promises);
            const errors = [];
            let rejectedCount = 0;
            
            // 如果傳入的是空數組，則拋出 AggregateError
            if (promiseArray.length === 0) {
                return reject(new AggregateError([], 'All promises were rejected'));
            }
            
            // 為每個 promise 添加處理
            promiseArray.forEach((promise, index) => {
                Promise.resolve(promise).then(
                    // 只要有一個 promise 成功，就解析整個 Promise.any
                    value => resolve(value),
                    // 如果一個 promise 失敗，記錄錯誤
                    error => {
                        errors[index] = error;
                        rejectedCount++;
                        
                        // 如果所有 promise 都失敗，則拋出 AggregateError
                        if (rejectedCount === promiseArray.length) {
                            // 如果瀏覽器不支持 AggregateError，則創建一個類似的錯誤
                            if (typeof AggregateError === 'undefined') {
                                const aggregateError = new Error('All promises were rejected');
                                aggregateError.errors = errors;
                                reject(aggregateError);
                            } else {
                                reject(new AggregateError(errors, 'All promises were rejected'));
                            }
                        }
                    }
                );
            });
        });
    };
}

// AggregateError polyfill
if (typeof AggregateError === 'undefined') {
    class AggregateError extends Error {
        constructor(errors, message) {
            super(message);
            this.name = 'AggregateError';
            this.errors = errors;
        }
    }
    
    // 將 AggregateError 添加到全局對象
    window.AggregateError = AggregateError;
}