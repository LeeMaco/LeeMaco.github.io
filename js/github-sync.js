/**
 * 書籍查詢管理系統 - GitHub同步模塊
 * 負責處理與GitHub的數據同步，包括權限設置、用戶數據等
 */

const GitHubSync = {
    // GitHub API的基本URL
    API_BASE_URL: 'https://api.github.com',
    
    // 初始化GitHub同步模塊
    init: function() {
        console.log('初始化GitHub同步模塊');
        
        // 檢查是否已設置GitHub信息
        this.checkGitHubSettings();
    },
    
    // 檢查GitHub設置
    checkGitHubSettings: function() {
        const token = localStorage.getItem('githubToken');
        const repo = localStorage.getItem('githubRepo');
        const branch = localStorage.getItem('githubBranch') || 'main';
        
        if (!token || !repo) {
            console.warn('未設置GitHub訪問令牌或倉庫信息，同步功能將不可用');
            return false;
        }
        
        return true;
    },
    
    // 獲取GitHub設置
    getGitHubSettings: function() {
        return {
            token: localStorage.getItem('githubToken'),
            repo: localStorage.getItem('githubRepo'),
            branch: localStorage.getItem('githubBranch') || 'main'
        };
    },
    
    // 同步權限設置到GitHub
    syncPermissionsToGitHub: function() {
        if (!this.checkGitHubSettings()) {
            return Promise.reject('未設置GitHub信息');
        }
        
        // 獲取權限設置
        const permissions = localStorage.getItem(PermissionManager.PERMISSIONS_KEY);
        if (!permissions) {
            return Promise.reject('沒有權限設置可同步');
        }
        
        // 準備上傳數據
        const content = JSON.stringify(JSON.parse(permissions), null, 2);
        const fileName = 'permissions.json';
        
        // 上傳到GitHub
        return this.uploadToGitHub(content, fileName, '更新權限設置');
    },
    
    // 從GitHub同步權限設置
    syncPermissionsFromGitHub: function() {
        if (!this.checkGitHubSettings()) {
            return Promise.reject('未設置GitHub信息');
        }
        
        const fileName = 'permissions.json';
        
        // 從GitHub下載
        return this.downloadFromGitHub(fileName)
            .then(content => {
                if (!content) {
                    return Promise.reject('從GitHub獲取權限設置失敗');
                }
                
                try {
                    // 解析JSON數據
                    const permissions = JSON.parse(content);
                    
                    // 保存到本地存儲
                    localStorage.setItem(PermissionManager.PERMISSIONS_KEY, JSON.stringify(permissions));
                    
                    console.log('已從GitHub同步權限設置');
                    return permissions;
                } catch (error) {
                    console.error('解析權限設置JSON時發生錯誤:', error);
                    return Promise.reject('解析權限設置JSON時發生錯誤');
                }
            });
    },
    
    // 同步用戶數據到GitHub
    syncUsersToGitHub: function() {
        if (!this.checkGitHubSettings()) {
            return Promise.reject('未設置GitHub信息');
        }
        
        // 獲取用戶數據
        const users = localStorage.getItem(UserManager.USERS_KEY);
        if (!users) {
            return Promise.reject('沒有用戶數據可同步');
        }
        
        // 準備上傳數據（移除敏感信息如密碼）
        const usersData = JSON.parse(users);
        const sanitizedUsers = usersData.map(user => {
            const { password, ...safeUser } = user;
            return safeUser;
        });
        
        const content = JSON.stringify(sanitizedUsers, null, 2);
        const fileName = 'users.json';
        
        // 上傳到GitHub
        return this.uploadToGitHub(content, fileName, '更新用戶數據');
    },
    
    // 上傳文件到GitHub
    uploadToGitHub: function(content, fileName, commitMessage = '更新文件') {
        const settings = this.getGitHubSettings();
        
        if (!settings.token || !settings.repo) {
            return Promise.reject('未設置GitHub訪問令牌或倉庫信息');
        }
        
        const [owner, repo] = settings.repo.split('/');
        const path = fileName;
        const url = `${this.API_BASE_URL}/repos/${settings.repo}/contents/${path}`;
        
        // 先檢查文件是否存在，獲取SHA
        return fetch(url, {
            headers: {
                'Authorization': `token ${settings.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        })
        .then(response => {
            if (response.status === 200) {
                return response.json().then(data => data.sha);
            }
            return null;
        })
        .then(sha => {
            // 準備上傳數據
            const data = {
                message: commitMessage,
                content: btoa(unescape(encodeURIComponent(content))),
                branch: settings.branch
            };
            
            // 如果文件已存在，添加SHA
            if (sha) {
                data.sha = sha;
            }
            
            // 上傳文件
            return fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${settings.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(data)
            });
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => Promise.reject(error.message));
            }
            return response.json();
        })
        .then(data => {
            console.log(`文件 ${fileName} 已成功上傳到GitHub`);
            return data;
        })
        .catch(error => {
            console.error('上傳到GitHub時發生錯誤:', error);
            return Promise.reject(`上傳到GitHub時發生錯誤: ${error}`);
        });
    },
    
    // 從GitHub下載文件
    downloadFromGitHub: function(fileName) {
        const settings = this.getGitHubSettings();
        
        if (!settings.token || !settings.repo) {
            return Promise.reject('未設置GitHub訪問令牌或倉庫信息');
        }
        
        const path = fileName;
        const url = `${this.API_BASE_URL}/repos/${settings.repo}/contents/${path}?ref=${settings.branch}`;
        
        return fetch(url, {
            headers: {
                'Authorization': `token ${settings.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`文件 ${fileName} 在GitHub上不存在`);
                    return null;
                }
                return response.json().then(error => Promise.reject(error.message));
            }
            return response.json();
        })
        .then(data => {
            if (!data) return null;
            
            // 解碼內容
            const content = decodeURIComponent(escape(atob(data.content)));
            console.log(`文件 ${fileName} 已從GitHub下載`);
            return content;
        })
        .catch(error => {
            console.error('從GitHub下載時發生錯誤:', error);
            return Promise.reject(`從GitHub下載時發生錯誤: ${error}`);
        });
    },
    
    // 同步所有數據到GitHub
    syncAllToGitHub: function() {
        return Promise.all([
            this.syncPermissionsToGitHub(),
            this.syncUsersToGitHub()
        ])
        .then(() => {
            console.log('所有數據已同步到GitHub');
            return true;
        })
        .catch(error => {
            console.error('同步數據到GitHub時發生錯誤:', error);
            return Promise.reject(`同步數據到GitHub時發生錯誤: ${error}`);
        });
    },
    
    // 從GitHub同步所有數據
    syncAllFromGitHub: function() {
        return this.syncPermissionsFromGitHub()
            .then(() => {
                console.log('所有數據已從GitHub同步');
                return true;
            })
            .catch(error => {
                console.error('從GitHub同步數據時發生錯誤:', error);
                return Promise.reject(`從GitHub同步數據時發生錯誤: ${error}`);
            });
    }
};

// 在頁面加載完成後初始化GitHub同步模塊
document.addEventListener('DOMContentLoaded', function() {
    // 初始化GitHub同步模塊
    GitHubSync.init();
});