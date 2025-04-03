/**
 * 書籍查詢管理系統 - 權限同步模塊
 * 負責處理不同設備間的權限同步功能
 */

const PermissionSync = {
    /**
     * 從GitHub獲取最新的權限設置
     * @returns {Promise<boolean>} 同步是否成功
     */
    getPermissionsFromGitHub: async function() {
        try {
            // 檢查GitHub設置是否有效
            if (typeof window.checkGitHubSettings === 'function') {
                const checkResult = window.checkGitHubSettings();
                if (!checkResult.valid) {
                    console.log('GitHub設置檢查失敗:', checkResult.message);
                    return false;
                }
            } else {
                // 如果checkGitHubSettings函數不存在，使用舊的檢查方式
                const token = localStorage.getItem('githubToken');
                const repo = localStorage.getItem('githubRepo');
                
                if (!token || !repo) {
                    console.log('未設置GitHub訪問令牌或倉庫信息，無法同步權限設置');
                    return false;
                }
                
                // 檢查倉庫格式
                const [owner, repoName] = repo.split('/');
                if (!owner || !repoName) {
                    console.log('GitHub倉庫格式不正確');
                    return false;
                }
            }
            
            // 獲取GitHub個人訪問令牌
            const token = localStorage.getItem('githubToken');
            if (!token) {
                throw new Error('未設置GitHub訪問令牌，請在設置中配置');
            }
            
            // 獲取GitHub倉庫信息
            const repo = localStorage.getItem('githubRepo') || '';
            const [owner, repoName] = repo.split('/');
            if (!owner || !repoName) {
                throw new Error('GitHub倉庫格式不正確，應為 "用戶名/倉庫名"');
            }
            
            // 獲取分支名稱
            const branch = localStorage.getItem('githubBranch') || 'main';
            
            // 檢查網絡連接
            if (!navigator.onLine) {
                throw new Error('網絡連接已斷開，請檢查網絡連接後重試');
            }
            
            // 從GitHub獲取權限設置文件
            const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/data/permissions.json?ref=${branch}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('GitHub上不存在權限設置文件，將使用本地權限設置');
                    return false;
                }
                
                throw new Error(`GitHub API錯誤: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // 解碼Base64內容
            const content = decodeURIComponent(escape(atob(data.content)));
            const permissions = JSON.parse(content);
            
            // 更新本地存儲的權限設置
            localStorage.setItem(PermissionManager.PERMISSIONS_KEY, JSON.stringify(permissions));
            
            console.log('成功從GitHub獲取最新權限設置');
            return true;
        } catch (error) {
            console.error('從GitHub獲取權限設置時發生錯誤:', error);
            return false;
        }
    },
    
    /**
     * 在用戶登入後同步權限設置
     * @param {Object} user - 登入的用戶對象
     * @returns {Promise<void>}
     */
    syncPermissionsAfterLogin: async function(user) {
        try {
            // 顯示同步狀態
            if (typeof PermissionManager.showPermissionSyncStatus === 'function') {
                PermissionManager.showPermissionSyncStatus('正在從GitHub獲取最新權限設置...', true);
            }
            
            // 從GitHub獲取最新權限設置
            const success = await this.getPermissionsFromGitHub();
            
            if (success) {
                if (typeof PermissionManager.showPermissionSyncStatus === 'function') {
                    PermissionManager.showPermissionSyncStatus('權限設置同步成功！', true);
                }
                
                // 重新應用權限設置
                if (typeof PermissionManager.applyPermissions === 'function') {
                    PermissionManager.applyPermissions();
                }
            } else {
                if (typeof PermissionManager.showPermissionSyncStatus === 'function') {
                    PermissionManager.showPermissionSyncStatus('無法從GitHub獲取權限設置，使用本地設置', false);
                }
            }
        } catch (error) {
            console.error('同步權限設置時發生錯誤:', error);
            if (typeof PermissionManager.showPermissionSyncStatus === 'function') {
                PermissionManager.showPermissionSyncStatus(`同步失敗: ${error.message || '未知錯誤'}`, false);
            }
        }
    }
};

// 將模塊暴露為全局變量
window.PermissionSync = PermissionSync;