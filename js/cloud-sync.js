/**
 * 書籍查詢管理系統 - 雲同步模塊
 * 負責處理與各種雲存儲服務的同步功能
 */

const CloudSync = {
    // 雲服務設置的存儲鍵名
    CLOUD_SETTINGS_KEY: 'cloud_sync_settings',
    
    // 雲服務類型
    CLOUD_SERVICES: {
        GITHUB: 'github',
        GOOGLE_DRIVE: 'google_drive',
        DROPBOX: 'dropbox',
        ONEDRIVE: 'onedrive'
    },
    
    // 初始化雲同步模塊
    init: function() {
        console.log('初始化雲同步模塊');
        
        // 如果本地存儲中沒有雲同步設置，則初始化默認設置
        if (!localStorage.getItem(this.CLOUD_SETTINGS_KEY)) {
            const defaultSettings = {
                enabled: false,
                selectedService: this.CLOUD_SERVICES.GITHUB,
                autoSync: false,
                services: {
                    [this.CLOUD_SERVICES.GITHUB]: {
                        enabled: true,
                        token: localStorage.getItem('githubToken') || '',
                        repo: localStorage.getItem('githubRepo') || '',
                        branch: localStorage.getItem('githubBranch') || 'main'
                    },
                    [this.CLOUD_SERVICES.GOOGLE_DRIVE]: {
                        enabled: false,
                        accessToken: '',
                        refreshToken: '',
                        folderId: ''
                    },
                    [this.CLOUD_SERVICES.DROPBOX]: {
                        enabled: false,
                        accessToken: '',
                        refreshToken: '',
                        folderPath: ''
                    },
                    [this.CLOUD_SERVICES.ONEDRIVE]: {
                        enabled: false,
                        accessToken: '',
                        refreshToken: '',
                        folderId: ''
                    }
                }
            };
            localStorage.setItem(this.CLOUD_SETTINGS_KEY, JSON.stringify(defaultSettings));
        }
    },
    
    // 獲取雲同步設置
    getCloudSettings: function() {
        const settings = localStorage.getItem(this.CLOUD_SETTINGS_KEY);
        return settings ? JSON.parse(settings) : null;
    },
    
    // 保存雲同步設置
    saveCloudSettings: function(settings) {
        localStorage.setItem(this.CLOUD_SETTINGS_KEY, JSON.stringify(settings));
        console.log('雲同步設置已保存:', settings);
        return settings;
    },
    
    // 上傳到選定的雲服務
    uploadToCloud: async function(content, fileName = 'books.json') {
        try {
            const settings = this.getCloudSettings();
            
            if (!settings || !settings.enabled) {
                throw new Error('雲同步功能未啟用');
            }
            
            const selectedService = settings.selectedService;
            const serviceSettings = settings.services[selectedService];
            
            if (!serviceSettings || !serviceSettings.enabled) {
                throw new Error(`所選雲服務 ${selectedService} 未啟用`);
            }
            
            console.log(`開始上傳到 ${selectedService}...`);
            
            switch (selectedService) {
                case this.CLOUD_SERVICES.GITHUB:
                    return await this.uploadToGitHub(content, fileName, serviceSettings);
                case this.CLOUD_SERVICES.GOOGLE_DRIVE:
                    return await this.uploadToGoogleDrive(content, fileName, serviceSettings);
                case this.CLOUD_SERVICES.DROPBOX:
                    return await this.uploadToDropbox(content, fileName, serviceSettings);
                case this.CLOUD_SERVICES.ONEDRIVE:
                    return await this.uploadToOneDrive(content, fileName, serviceSettings);
                default:
                    throw new Error(`不支持的雲服務: ${selectedService}`);
            }
        } catch (error) {
            console.error('上傳到雲服務時發生錯誤:', error);
            throw error;
        }
    },
    
    // 上傳到GitHub
    uploadToGitHub: async function(content, fileName, settings) {
        try {
            // 獲取GitHub個人訪問令牌
            const token = settings.token;
            if (!token) {
                throw new Error('未設置GitHub訪問令牌，請在設置中配置');
            }
            
            // 獲取GitHub倉庫信息
            const repo = settings.repo || '';
            const [owner, repoName] = repo.split('/');
            if (!owner || !repoName) {
                throw new Error('GitHub倉庫格式不正確，應為 "用戶名/倉庫名"');
            }
            
            // 獲取分支名稱
            const branch = settings.branch || 'main';
            
            // 檢查文件是否已存在，獲取SHA
            let fileSha = '';
            try {
                const checkResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/data/${fileName}?ref=${branch}`, {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (checkResponse.status === 200) {
                    const fileData = await checkResponse.json();
                    fileSha = fileData.sha;
                }
            } catch (error) {
                console.log('文件不存在，將創建新文件');
            }
            
            // 準備上傳數據
            const uploadData = {
                message: `更新書籍數據 - ${new Date().toLocaleString()}`,
                content: btoa(unescape(encodeURIComponent(content))),
                branch: branch
            };
            
            // 如果文件已存在，添加SHA
            if (fileSha) {
                uploadData.sha = fileSha;
            }
            
            // 上傳到GitHub
            const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/data/${fileName}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(uploadData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API錯誤: ${errorData.message}`);
            }
            
            const responseData = await response.json();
            console.log('上傳到GitHub成功:', responseData);
            
            return {
                success: true,
                service: this.CLOUD_SERVICES.GITHUB,
                url: responseData.content.html_url,
                fileName: fileName
            };
        } catch (error) {
            console.error('上傳到GitHub時發生錯誤:', error);
            throw error;
        }
    },
    
    // 上傳到Google Drive
    uploadToGoogleDrive: async function(content, fileName, settings) {
        try {
            const accessToken = settings.accessToken;
            if (!accessToken) {
                throw new Error('未設置Google Drive訪問令牌，請在設置中配置');
            }
            
            const folderId = settings.folderId || 'root';
            
            // 檢查文件是否已存在
            let fileId = null;
            try {
                const searchResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents and trashed=false`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.files && searchData.files.length > 0) {
                        fileId = searchData.files[0].id;
                    }
                }
            } catch (error) {
                console.log('搜索Google Drive文件時發生錯誤:', error);
            }
            
            // 準備文件元數據
            const metadata = {
                name: fileName,
                mimeType: 'application/json'
            };
            
            if (folderId !== 'root') {
                metadata.parents = [folderId];
            }
            
            // 準備表單數據
            const formData = new FormData();
            const blob = new Blob([content], { type: 'application/json' });
            
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', blob);
            
            // 上傳或更新文件
            let response;
            if (fileId) {
                // 更新現有文件
                response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: formData
                });
            } else {
                // 創建新文件
                response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: formData
                });
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Google Drive API錯誤: ${errorData.error.message}`);
            }
            
            const responseData = await response.json();
            console.log('上傳到Google Drive成功:', responseData);
            
            return {
                success: true,
                service: this.CLOUD_SERVICES.GOOGLE_DRIVE,
                fileId: responseData.id,
                fileName: fileName
            };
        } catch (error) {
            console.error('上傳到Google Drive時發生錯誤:', error);
            throw error;
        }
    },
    
    // 上傳到Dropbox
    uploadToDropbox: async function(content, fileName, settings) {
        try {
            const accessToken = settings.accessToken;
            if (!accessToken) {
                throw new Error('未設置Dropbox訪問令牌，請在設置中配置');
            }
            
            const folderPath = settings.folderPath || '';
            const filePath = folderPath ? `${folderPath}/${fileName}` : `/${fileName}`;
            
            // 上傳文件
            const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/octet-stream',
                    'Dropbox-API-Arg': JSON.stringify({
                        path: filePath,
                        mode: 'overwrite',
                        autorename: false,
                        mute: false
                    })
                },
                body: content
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Dropbox API錯誤: ${errorData.error_summary}`);
            }
            
            const responseData = await response.json();
            console.log('上傳到Dropbox成功:', responseData);
            
            // 創建共享鏈接
            const shareResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: responseData.path_display,
                    settings: {
                        requested_visibility: 'public'
                    }
                })
            });
            
            let shareUrl = '';
            if (shareResponse.ok) {
                const shareData = await shareResponse.json();
                shareUrl = shareData.url;
            }
            
            return {
                success: true,
                service: this.CLOUD_SERVICES.DROPBOX,
                path: responseData.path_display,
                url: shareUrl,
                fileName: fileName
            };
        } catch (error) {
            console.error('上傳到Dropbox時發生錯誤:', error);
            throw error;
        }
    },
    
    // 上傳到OneDrive
    uploadToOneDrive: async function(content, fileName, settings) {
        try {
            const accessToken = settings.accessToken;
            if (!accessToken) {
                throw new Error('未設置OneDrive訪問令牌，請在設置中配置');
            }
            
            const folderId = settings.folderId || 'root';
            let uploadUrl;
            
            if (folderId === 'root') {
                uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`;
            } else {
                uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${fileName}:/content`;
            }
            
            // 上傳文件
            const response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: content
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OneDrive API錯誤: ${errorData.error.message}`);
            }
            
            const responseData = await response.json();
            console.log('上傳到OneDrive成功:', responseData);
            
            return {
                success: true,
                service: this.CLOUD_SERVICES.ONEDRIVE,
                itemId: responseData.id,
                webUrl: responseData.webUrl,
                fileName: fileName
            };
        } catch (error) {
            console.error('上傳到OneDrive時發生錯誤:', error);
            throw error;
        }
    },
    
    // 授權Google Drive
    authorizeGoogleDrive: function() {
        // 這裡需要實現OAuth2授權流程
        // 由於瀏覽器環境的限制，實際應用中可能需要後端支持
        alert('Google Drive授權功能需要後端支持，此處為示例實現');
        
        // 模擬授權成功後的回調
        const mockAuthResult = {
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expires_in: 3600
        };
        
        // 更新設置
        const settings = this.getCloudSettings();
        settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].accessToken = mockAuthResult.access_token;
        settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].refreshToken = mockAuthResult.refresh_token;
        this.saveCloudSettings(settings);
        
        return mockAuthResult;
    },
    
    // 授權Dropbox
    authorizeDropbox: function() {
        // 這裡需要實現OAuth2授權流程
        alert('Dropbox授權功能需要後端支持，此處為示例實現');
        
        // 模擬授權成功後的回調
        const mockAuthResult = {
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expires_in: 3600
        };
        
        // 更新設置
        const settings = this.getCloudSettings();
        settings.services[this.CLOUD_SERVICES.DROPBOX].accessToken = mockAuthResult.access_token;
        settings.services[this.CLOUD_SERVICES.DROPBOX].refreshToken = mockAuthResult.refresh_token;
        this.saveCloudSettings(settings);
        
        return mockAuthResult;
    },
    
    // 授權OneDrive
    authorizeOneDrive: function() {
        // 這裡需要實現OAuth2授權流程
        alert('OneDrive授權功能需要後端支持，此處為示例實現');
        
        // 模擬授權成功後的回調
        const mockAuthResult = {
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expires_in: 3600
        };
        
        // 更新設置
        const settings = this.getCloudSettings();
        settings.services[this.CLOUD_SERVICES.ONEDRIVE].accessToken = mockAuthResult.access_token;
        settings.services[this.CLOUD_SERVICES.ONEDRIVE].refreshToken = mockAuthResult.refresh_token;
        this.saveCloudSettings(settings);
        
        return mockAuthResult;
    }
};

// 初始化雲同步模塊
document.addEventListener('DOMContentLoaded', function() {
    CloudSync.init();
});