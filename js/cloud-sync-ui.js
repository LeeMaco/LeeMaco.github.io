/**
 * 書籍查詢管理系統 - 雲同步UI模塊
 * 負責處理雲同步功能的用戶界面
 */

document.addEventListener('DOMContentLoaded', function() {
    // 檢查是否在管理頁面
    if (!document.getElementById('cloudSyncSettingsBtn')) {
        return;
    }
    
    // 獲取DOM元素
    const cloudSyncSettingsBtn = document.getElementById('cloudSyncSettingsBtn');
    const cloudSyncSettingsModal = document.getElementById('cloudSyncSettingsModal');
    const cloudSyncSettingsForm = document.getElementById('cloudSyncSettingsForm');
    const cloudServiceSelector = document.getElementById('cloudServiceSelector');
    const cloudServiceSettings = document.getElementById('cloudServiceSettings');
    const cloudSyncStatus = document.getElementById('cloudSyncStatus');
    
    // 綁定雲同步設置按鈕點擊事件
    cloudSyncSettingsBtn.addEventListener('click', function() {
        // 顯示雲同步設置彈窗
        cloudSyncSettingsModal.style.display = 'block';
        
        // 填充已保存的設置
        loadCloudSyncSettings();
    });
    
    // 綁定雲服務選擇器變更事件
    if (cloudServiceSelector) {
        cloudServiceSelector.addEventListener('change', function() {
            updateServiceSettingsUI(this.value);
        });
    }
    
    // 綁定雲同步設置表單提交事件
    if (cloudSyncSettingsForm) {
        cloudSyncSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCloudSyncSettings();
        });
    }
    
    // 綁定授權按鈕點擊事件
    document.querySelectorAll('.authorize-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const service = this.getAttribute('data-service');
            authorizeCloudService(service);
        });
    });
    
    // 綁定彈窗關閉按鈕點擊事件
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // 點擊彈窗外部關閉彈窗
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // 加載雲同步設置
    function loadCloudSyncSettings() {
        const settings = CloudSync.getCloudSettings();
        if (!settings) return;
        
        // 設置啟用狀態
        document.getElementById('cloudSyncEnabled').checked = settings.enabled;
        
        // 設置自動同步狀態
        document.getElementById('autoSyncEnabled').checked = settings.autoSync;
        
        // 設置選中的雲服務
        document.getElementById('cloudServiceSelector').value = settings.selectedService;
        
        // 更新UI以顯示選中服務的設置
        updateServiceSettingsUI(settings.selectedService);
        
        // 填充各服務的設置
        const services = settings.services;
        
        // GitHub設置
        document.getElementById('githubEnabled').checked = services[CloudSync.CLOUD_SERVICES.GITHUB].enabled;
        document.getElementById('githubToken').value = services[CloudSync.CLOUD_SERVICES.GITHUB].token || '';
        document.getElementById('githubRepo').value = services[CloudSync.CLOUD_SERVICES.GITHUB].repo || '';
        document.getElementById('githubBranch').value = services[CloudSync.CLOUD_SERVICES.GITHUB].branch || 'main';
        
        // Google Drive設置
        document.getElementById('googleDriveEnabled').checked = services[CloudSync.CLOUD_SERVICES.GOOGLE_DRIVE].enabled;
        document.getElementById('googleDriveFolderId').value = services[CloudSync.CLOUD_SERVICES.GOOGLE_DRIVE].folderId || '';
        
        // Dropbox設置
        document.getElementById('dropboxEnabled').checked = services[CloudSync.CLOUD_SERVICES.DROPBOX].enabled;
        document.getElementById('dropboxFolderPath').value = services[CloudSync.CLOUD_SERVICES.DROPBOX].folderPath || '';
        
        // OneDrive設置
        document.getElementById('onedriveEnabled').checked = services[CloudSync.CLOUD_SERVICES.ONEDRIVE].enabled;
        document.getElementById('onedriveFolderId').value = services[CloudSync.CLOUD_SERVICES.ONEDRIVE].folderId || '';
    }
    
    // 保存雲同步設置
    function saveCloudSyncSettings() {
        try {
            // 獲取當前設置
            const settings = CloudSync.getCloudSettings() || {};
            
            // 更新基本設置
            settings.enabled = document.getElementById('cloudSyncEnabled').checked;
            settings.autoSync = document.getElementById('autoSyncEnabled').checked;
            settings.selectedService = document.getElementById('cloudServiceSelector').value;
            
            // 更新GitHub設置
            settings.services = settings.services || {};
            settings.services[CloudSync.CLOUD_SERVICES.GITHUB] = {
                enabled: document.getElementById('githubEnabled').checked,
                token: document.getElementById('githubToken').value,
                repo: document.getElementById('githubRepo').value,
                branch: document.getElementById('githubBranch').value || 'main'
            };
            
            // 更新Google Drive設置
            settings.services[CloudSync.CLOUD_SERVICES.GOOGLE_DRIVE] = {
                enabled: document.getElementById('googleDriveEnabled').checked,
                accessToken: settings.services[CloudSync.CLOUD_SERVICES.GOOGLE_DRIVE]?.accessToken || '',
                refreshToken: settings.services[CloudSync.CLOUD_SERVICES.GOOGLE_DRIVE]?.refreshToken || '',
                folderId: document.getElementById('googleDriveFolderId').value
            };
            
            // 更新Dropbox設置
            settings.services[CloudSync.CLOUD_SERVICES.DROPBOX] = {
                enabled: document.getElementById('dropboxEnabled').checked,
                accessToken: settings.services[CloudSync.CLOUD_SERVICES.DROPBOX]?.accessToken || '',
                refreshToken: settings.services[CloudSync.CLOUD_SERVICES.DROPBOX]?.refreshToken || '',
                folderPath: document.getElementById('dropboxFolderPath').value
            };
            
            // 更新OneDrive設置
            settings.services[CloudSync.CLOUD_SERVICES.ONEDRIVE] = {
                enabled: document.getElementById('onedriveEnabled').checked,
                accessToken: settings.services[CloudSync.CLOUD_SERVICES.ONEDRIVE]?.accessToken || '',
                refreshToken: settings.services[CloudSync.CLOUD_SERVICES.ONEDRIVE]?.refreshToken || '',
                folderId: document.getElementById('onedriveFolderId').value
            };
            
            // 保存設置
            CloudSync.saveCloudSettings(settings);
            
            // 同步GitHub設置到原有的設置中
            if (settings.services[CloudSync.CLOUD_SERVICES.GITHUB].enabled) {
                localStorage.setItem('githubToken', settings.services[CloudSync.CLOUD_SERVICES.GITHUB].token);
                localStorage.setItem('githubRepo', settings.services[CloudSync.CLOUD_SERVICES.GITHUB].repo);
                localStorage.setItem('githubBranch', settings.services[CloudSync.CLOUD_SERVICES.GITHUB].branch);
            }
            
            // 關閉彈窗
            cloudSyncSettingsModal.style.display = 'none';
            
            // 顯示成功消息
            alert('雲同步設置已保存');
            
            return true;
        } catch (error) {
            console.error('保存雲同步設置時發生錯誤:', error);
            alert(`保存設置失敗: ${error.message}`);
            return false;
        }
    }
    
    // 更新服務設置UI
    function updateServiceSettingsUI(selectedService) {
        // 隱藏所有服務設置區域
        document.querySelectorAll('.service-settings').forEach(el => {
            el.style.display = 'none';
        });
        
        // 顯示選中的服務設置區域
        const selectedSettingsEl = document.getElementById(`${selectedService}Settings`);
        if (selectedSettingsEl) {
            selectedSettingsEl.style.display = 'block';
        }
    }
    
    // 授權雲服務
    function authorizeCloudService(service) {
        try {
            let result;
            
            switch (service) {
                case CloudSync.CLOUD_SERVICES.GOOGLE_DRIVE:
                    result = CloudSync.authorizeGoogleDrive();
                    break;
                case CloudSync.CLOUD_SERVICES.DROPBOX:
                    result = CloudSync.authorizeDropbox();
                    break;
                case CloudSync.CLOUD_SERVICES.ONEDRIVE:
                    result = CloudSync.authorizeOneDrive();
                    break;
                default:
                    throw new Error(`不支持的雲服務: ${service}`);
            }
            
            if (result) {
                // 更新UI
                loadCloudSyncSettings();
                
                // 顯示成功消息
                alert(`${service} 授權成功`);
            }
        } catch (error) {
            console.error(`授權 ${service} 時發生錯誤:`, error);
            alert(`授權失敗: ${error.message}`);
        }
    }
    
    // 測試雲同步
    window.testCloudSync = async function(service) {
        try {
            // 獲取設置
            const settings = CloudSync.getCloudSettings();
            if (!settings) {
                throw new Error('未找到雲同步設置');
            }
            
            // 如果指定了服務，則臨時設置為該服務
            if (service) {
                const originalService = settings.selectedService;
                settings.selectedService = service;
                CloudSync.saveCloudSettings(settings);
                
                // 測試完成後恢復原來的設置
                setTimeout(() => {
                    settings.selectedService = originalService;
                    CloudSync.saveCloudSettings(settings);
                }, 5000);
            }
            
            // 創建測試數據
            const testData = {
                test: true,
                timestamp: new Date().toISOString(),
                message: '這是一個測試文件'
            };
            
            // 更新狀態
            if (cloudSyncStatus) {
                cloudSyncStatus.textContent = `正在測試 ${settings.selectedService} 同步...`;
                cloudSyncStatus.style.color = '#3498db';
            }
            
            // 上傳測試文件
            const result = await CloudSync.uploadToCloud(
                JSON.stringify(testData, null, 2),
                `test_${Date.now()}.json`
            );
            
            // 更新狀態
            if (cloudSyncStatus) {
                cloudSyncStatus.textContent = `測試成功! 文件已上傳到 ${result.service}`;
                cloudSyncStatus.style.color = '#2ecc71';
            }
            
            console.log('雲同步測試結果:', result);
            return result;
        } catch (error) {
            console.error('測試雲同步時發生錯誤:', error);
            
            // 更新狀態
            if (cloudSyncStatus) {
                cloudSyncStatus.textContent = `測試失敗: ${error.message}`;
                cloudSyncStatus.style.color = '#e74c3c';
            }
            
            throw error;
        }
    };
});