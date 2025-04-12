/**
 * 郵件服務模組 - 處理備份功能
 */

class EmailService {
    /**
     * 發送備份郵件 (使用EmailJS)
     * @param {string} email 接收者郵箱
     * @param {Object} data 備份數據
     * @param {string} fileName 檔案名稱
     * @param {Object} emailjsSettings EmailJS設定
     * @returns {Promise<{success: boolean, message: string}>} 結果對象，包含成功狀態和消息
     */
    sendBackupEmail(email, data, fileName, emailjsSettings) {
        return new Promise((resolve, reject) => {
            // 檢查EmailJS設定是否完整
            if (!emailjsSettings || !emailjsSettings.userID || !emailjsSettings.serviceID || !emailjsSettings.templateID) {
                console.error('EmailJS設定不完整');
                reject(new Error('EmailJS設定不完整，請先完成設定'));
                return;
            }
            
            // 檢查email格式
            if (!this.validateEmail(email)) {
                reject(new Error('無效的Email地址格式'));
                return;
            }
            
            // 檢查數據是否為空
            if (!data || (Array.isArray(data) && data.length === 0)) {
                reject(new Error('沒有數據可備份'));
                return;
            }
            
            console.log(`準備發送備份郵件到 ${email}，檔案名稱：${fileName}`);
            
            // 創建備份數據的JSON字符串
            const jsonData = JSON.stringify(data, null, 2);
            
            // 檢查JSON數據大小
            const dataSizeKB = Math.round((jsonData.length * 2) / 1024);
            if (dataSizeKB > 500) { // 如果數據大於500KB
                console.warn(`備份數據較大 (${dataSizeKB}KB)，可能影響發送速度`);
            }
            
            // 檢查data是否為數組，如果不是，則獲取對象的鍵數量
            const recordCount = Array.isArray(data) ? data.length : Object.keys(data).length;
            console.log(`備份數據已準備：${recordCount} 筆記錄，大小約 ${dataSizeKB}KB`);
            
            try {
                // 初始化EmailJS
                emailjs.init(emailjsSettings.userID);
                
                // 準備郵件參數
                const templateParams = {
                    to_email: email,
                    from_name: '書籍查詢管理系統',
                    message: `備份數據已附加，共 ${recordCount} 筆記錄，檔案大小約 ${dataSizeKB}KB`,
                    file_name: fileName,
                    data_json: jsonData
                };
                
                // 使用EmailJS發送郵件
                emailjs.send(emailjsSettings.serviceID, emailjsSettings.templateID, templateParams)
                    .then((response) => {
                        console.log('郵件發送成功:', response);
                        // 將備份數據存儲在localStorage中
                        localStorage.setItem('lastBackupData', jsonData);
                        localStorage.setItem('lastBackupTime', new Date().toISOString());
                        localStorage.setItem('lastBackupEmail', email);
                        localStorage.setItem('lastBackupSize', dataSizeKB.toString());
                        localStorage.setItem('lastBackupRecords', recordCount.toString());
                        
                        resolve({
                            success: true,
                            message: `備份郵件已成功發送至 ${email}`,
                            details: {
                                recordCount: recordCount,
                                sizeKB: dataSizeKB,
                                timestamp: new Date().toISOString()
                            }
                        });
                    })
                    .catch((error) => {
                        console.error('郵件發送失敗:', error);
                        let errorMessage = '郵件發送失敗';
                        let retryable = true;
                        
                        // 提供更詳細的錯誤信息
                        if (error.text) {
                            errorMessage += `: ${error.text}`;
                        } else if (error.message) {
                            errorMessage += `: ${error.message}`;
                        }
                        
                        // 根據常見錯誤代碼提供更友好的錯誤信息
                        if (error.status === 401 || error.status === 403) {
                            errorMessage = 'EmailJS授權失敗，請檢查您的API密鑰';
                            retryable = false; // 授權問題不適合重試
                        } else if (error.status === 429) {
                            errorMessage = 'EmailJS請求過多，請稍後再試';
                            retryable = true;
                        } else if (error.status >= 500) {
                            errorMessage = 'EmailJS服務器錯誤，請稍後再試';
                            retryable = true;
                        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                            errorMessage = '網絡連接失敗，請檢查您的網絡連接';
                            retryable = true;
                        } else if (error.message && error.message.includes('timeout')) {
                            errorMessage = '請求超時，請稍後再試';
                            retryable = true;
                        }
                        
                        // 將重試信息添加到錯誤對象中
                        const enhancedError = new Error(errorMessage);
                        enhancedError.retryable = retryable;
                        enhancedError.originalError = error;
                        
                        reject(enhancedError);
                    });
            } catch (error) {
                console.error('備份過程中發生錯誤:', error);
                reject(new Error(`備份過程中發生錯誤: ${error.message}`));
            }
        });
    }
    
    /**
     * 使用mailto協議發送備份郵件（不需要EmailJS）
     * @param {string} email 接收者郵箱
     * @param {Object} data 備份數據
     * @param {string} fileName 檔案名稱
     * @returns {Promise<{success: boolean, message: string}>} 結果對象，包含成功狀態和消息
     */
    sendBackupEmailViaMailto(email, data, fileName) {
        return new Promise((resolve, reject) => {
            try {
                // 檢查email格式
                if (!this.validateEmail(email)) {
                    reject(new Error('無效的Email地址格式'));
                    return;
                }
                
                // 檢查數據是否為空
                if (!data || (Array.isArray(data) && data.length === 0)) {
                    reject(new Error('沒有數據可備份'));
                    return;
                }
                
                // 創建備份數據的JSON字符串
                const jsonData = JSON.stringify(data, null, 2);
                
                // 檢查JSON數據大小
                const dataSizeKB = Math.round((jsonData.length * 2) / 1024);
                const recordCount = Array.isArray(data) ? data.length : Object.keys(data).length;
                
                // 創建郵件主題和內容
                const subject = encodeURIComponent(`書籍查詢管理系統 - 數據備份 (${new Date().toLocaleDateString()})`);
                const body = encodeURIComponent(
                    `這是您的書籍查詢管理系統數據備份。\n\n` +
                    `備份時間: ${new Date().toLocaleString()}\n` +
                    `記錄數量: ${recordCount} 筆\n` +
                    `數據大小: 約 ${dataSizeKB}KB\n\n` +
                    `--- 備份數據 (JSON格式) ---\n\n${jsonData}`
                );
                
                // 創建mailto鏈接
                const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
                
                // 打開郵件客戶端
                window.location.href = mailtoLink;
                
                // 將備份數據存儲在localStorage中
                localStorage.setItem('lastBackupData', jsonData);
                localStorage.setItem('lastBackupTime', new Date().toISOString());
                localStorage.setItem('lastBackupEmail', email);
                localStorage.setItem('lastBackupSize', dataSizeKB.toString());
                localStorage.setItem('lastBackupRecords', recordCount.toString());
                
                resolve({
                    success: true,
                    message: `已打開郵件客戶端，請在彈出的郵件窗口中發送郵件`,
                    details: {
                        recordCount: recordCount,
                        sizeKB: dataSizeKB,
                        timestamp: new Date().toISOString(),
                        method: 'mailto'
                    }
                });
            } catch (error) {
                console.error('準備mailto郵件時發生錯誤:', error);
                reject(new Error(`準備郵件時發生錯誤: ${error.message}`));
            }
        });
    }
    
    /**
     * 生成並下載Excel備份文件（不需要EmailJS）
     * @param {Object} data 備份數據
     * @param {string} fileName 檔案名稱（可選，默認為自動生成）
     * @returns {Promise<{success: boolean, message: string}>} 結果對象，包含成功狀態和消息
     */
    downloadBackupFile(data, fileName) {
        return new Promise((resolve, reject) => {
            try {
                // 檢查數據是否為空
                if (!data || (Array.isArray(data) && data.length === 0)) {
                    reject(new Error('沒有數據可備份'));
                    return;
                }
                
                // 如果沒有提供文件名，則生成一個
                if (!fileName) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                    fileName = `書籍資料_備份_${timestamp}.xlsx`;
                }
                
                // 使用數據處理器創建工作表
                const workbook = dataProcessor.createExcelWorkbook(data);
                
                // 將工作表轉換為二進制數據
                const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                
                // 創建Blob對象
                const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                
                // 創建下載鏈接
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                
                // 添加到文檔並觸發點擊
                document.body.appendChild(link);
                link.click();
                
                // 清理
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);
                
                // 記錄備份信息
                const jsonData = JSON.stringify(data, null, 2);
                const dataSizeKB = Math.round((jsonData.length * 2) / 1024);
                const recordCount = Array.isArray(data) ? data.length : Object.keys(data).length;
                
                localStorage.setItem('lastBackupData', jsonData);
                localStorage.setItem('lastBackupTime', new Date().toISOString());
                localStorage.setItem('lastBackupSize', dataSizeKB.toString());
                localStorage.setItem('lastBackupRecords', recordCount.toString());
                
                resolve({
                    success: true,
                    message: `備份文件 ${fileName} 已下載`,
                    details: {
                        fileName: fileName,
                        recordCount: recordCount,
                        sizeKB: dataSizeKB,
                        timestamp: new Date().toISOString(),
                        method: 'download'
                    }
                });
            } catch (error) {
                console.error('生成備份文件時發生錯誤:', error);
                reject(new Error(`生成備份文件時發生錯誤: ${error.message}`));
            }
        });
    }
    
    /**
     * 驗證郵箱格式
     * @param {string} email 郵箱地址
     * @returns {boolean} 是否有效
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * 設置自動備份排程
     * @param {Object} settings 備份設定
     * @returns {Object} 排程信息
     */
    setupBackupSchedule(settings) {
        // 由於GitHub Pages的限制，這裡只是返回排程信息
        // 在實際應用中，這裡會設置定時任務
        
        let nextBackupTime = new Date();
        
        // 根據頻率設置下次備份時間
        switch (settings.frequency) {
            case 'daily':
                nextBackupTime.setDate(nextBackupTime.getDate() + 1);
                nextBackupTime.setHours(3, 0, 0, 0); // 凌晨3點
                break;
            case 'weekly':
                nextBackupTime.setDate(nextBackupTime.getDate() + (7 - nextBackupTime.getDay()));
                nextBackupTime.setHours(3, 0, 0, 0); // 下週日凌晨3點
                break;
            case 'monthly':
                nextBackupTime.setMonth(nextBackupTime.getMonth() + 1);
                nextBackupTime.setDate(1);
                nextBackupTime.setHours(3, 0, 0, 0); // 下個月1號凌晨3點
                break;
        }
        
        return {
            email: settings.email,
            frequency: settings.frequency,
            nextBackupTime: nextBackupTime.toLocaleString(),
            active: true
        };
    }
}

// 初始化郵件服務實例
const emailService = new EmailService();