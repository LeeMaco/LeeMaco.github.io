/**
 * 郵件服務模組 - 處理Gmail備份功能
 */

class EmailService {
    /**
     * 發送備份郵件
     * @param {string} email 接收者郵箱
     * @param {Object} data 備份數據
     * @param {string} fileName 檔案名稱
     * @returns {Promise<boolean>} 是否成功
     */
    sendBackupEmail(email, data, fileName) {
        return new Promise((resolve) => {
            // 由於GitHub Pages的限制，這裡只是模擬發送郵件
            // 在實際應用中，這裡會使用郵件API發送郵件
            console.log(`模擬發送備份郵件到 ${email}，檔案名稱：${fileName}`);
            
            // 創建備份數據的JSON字符串
            const jsonData = JSON.stringify(data, null, 2);
            
            // 在實際應用中，這裡會將數據作為附件發送
            console.log(`備份數據已準備：${data.length} 筆記錄`);
            
            // 模擬發送過程
            setTimeout(() => {
                // 將備份數據存儲在localStorage中，模擬郵件發送成功
                try {
                    localStorage.setItem('lastBackupData', jsonData);
                    localStorage.setItem('lastBackupTime', new Date().toISOString());
                    localStorage.setItem('lastBackupEmail', email);
                    console.log('郵件發送完成，備份數據已保存');
                    resolve(true);
                } catch (error) {
                    console.error('備份數據保存失敗:', error);
                    resolve(false);
                }
            }, 1500);
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