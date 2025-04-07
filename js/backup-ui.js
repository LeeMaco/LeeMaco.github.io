/**
 * 書籍查詢管理系統 - 自動備份UI模塊
 * 負責處理自動備份功能的用戶界面
 */

document.addEventListener('DOMContentLoaded', function() {
    // 檢查是否在管理頁面
    if (!document.getElementById('backupSettingsBtn')) {
        return;
    }
    
    // 獲取DOM元素
    const backupSettingsBtn = document.getElementById('backupSettingsBtn');
    const backupHistoryBtn = document.getElementById('backupHistoryBtn');
    const backupSettingsModal = document.getElementById('backupSettingsModal');
    const backupHistoryModal = document.getElementById('backupHistoryModal');
    const backupSettingsForm = document.getElementById('backupSettingsForm');
    const backupHistoryTableBody = document.getElementById('backupHistoryTableBody');
    const createBackupBtn = document.getElementById('createBackupBtn');
    const clearBackupHistoryBtn = document.getElementById('clearBackupHistoryBtn');
    
    // 綁定備份設置按鈕點擊事件
    backupSettingsBtn.addEventListener('click', function() {
        // 顯示備份設置彈窗
        backupSettingsModal.style.display = 'block';
        
        // 填充已保存的設置
        const settings = BackupManager.getBackupSettings();
        document.getElementById('backupEnabled').checked = settings.enabled;
        document.getElementById('backupInterval').value = settings.interval;
        document.getElementById('autoUploadToGitHub').checked = settings.autoUploadToGitHub;
        document.getElementById('maxBackupCount').value = settings.maxBackupCount;
        
        // 更新最後備份時間顯示
        updateLastBackupTimeDisplay();
    });
    
    // 綁定備份歷史按鈕點擊事件
    backupHistoryBtn.addEventListener('click', function() {
        // 顯示備份歷史彈窗
        backupHistoryModal.style.display = 'block';
        
        // 加載備份歷史記錄
        loadBackupHistory();
    });
    
    // 綁定備份設置表單提交事件
    backupSettingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 獲取表單數據
        const settings = {
            enabled: document.getElementById('backupEnabled').checked,
            interval: document.getElementById('backupInterval').value,
            autoUploadToGitHub: document.getElementById('autoUploadToGitHub').checked,
            maxBackupCount: parseInt(document.getElementById('maxBackupCount').value, 10)
        };
        
        // 保存設置
        BackupManager.saveBackupSettings(settings);
        
        // 關閉彈窗
        backupSettingsModal.style.display = 'none';
        
        // 顯示成功消息
        alert('備份設置已保存');
    });
    
    // 綁定創建備份按鈕點擊事件
    createBackupBtn.addEventListener('click', function() {
        // 創建備份前清空狀態消息
        const statusElement = document.getElementById('backupStatus');
        if (statusElement) {
            statusElement.textContent = '正在創建備份...';
            statusElement.style.color = '#3498db';
        }
        
        // 禁用按鈕，防止重複點擊
        createBackupBtn.disabled = true;
        createBackupBtn.style.opacity = '0.7';
        createBackupBtn.style.cursor = 'not-allowed';
        
        // 創建備份
        BackupManager.createBackup()
            .then(backup => {
                // 重新加載備份歷史記錄
                loadBackupHistory();
                
                // 更新最後備份時間顯示
                updateLastBackupTimeDisplay();
                
                // 顯示成功消息
                if (statusElement) {
                    // 檢查是否有上傳錯誤
                    if (backup.uploadError) {
                        statusElement.textContent = `備份創建成功，但上傳失敗: ${backup.uploadError}`;
                        statusElement.style.color = '#f39c12'; // 警告顏色
                    } else {
                        statusElement.textContent = '備份創建成功';
                        statusElement.style.color = '#2ecc71';
                    }
                    
                    setTimeout(() => {
                        statusElement.textContent = '';
                    }, 5000);
                }
                
                // 根據上傳結果顯示不同的成功消息
                if (backup.uploadError) {
                    alert(`備份創建成功，但上傳到GitHub失敗: ${backup.uploadError}`);
                } else {
                    alert('備份創建成功');
                }
            })
            .catch(error => {
                console.error('創建備份時發生錯誤:', error);
                
                // 如果backupStatus元素已經有錯誤消息，則使用該消息
                const errorMsg = statusElement && statusElement.textContent.includes('失敗') 
                    ? statusElement.textContent 
                    : `備份創建失敗: ${error.message || '未知錯誤，請重試'}`;
                
                // 確保錯誤消息顯示在狀態元素中
                if (statusElement && !statusElement.textContent.includes('失敗')) {
                    statusElement.textContent = errorMsg;
                    statusElement.style.color = '#e74c3c';
                }
                
                alert(errorMsg);
            })
            .finally(() => {
                // 恢復按鈕狀態
                createBackupBtn.disabled = false;
                createBackupBtn.style.opacity = '1';
                createBackupBtn.style.cursor = 'pointer';
            });
    });
    
    // 綁定清空備份歷史按鈕點擊事件
    clearBackupHistoryBtn.addEventListener('click', function() {
        if (confirm('確定要清空所有備份歷史記錄嗎？此操作無法撤銷！')) {
            BackupManager.clearBackupHistory();
            loadBackupHistory();
            alert('備份歷史記錄已清空');
        }
    });
    
    // 綁定備份歷史表格中的按鈕事件（使用事件委託）
    backupHistoryTableBody.addEventListener('click', function(e) {
        const row = e.target.closest('tr');
        if (!row) return;
        
        const backupId = row.getAttribute('data-id');
        if (!backupId) return;
        
        // 處理恢復按鈕點擊
        if (e.target.classList.contains('restore-btn') || e.target.parentElement.classList.contains('restore-btn')) {
            if (confirm('確定要恢復此備份嗎？當前數據將被覆蓋！')) {
                if (BackupManager.restoreBackup(backupId)) {
                    // 關閉彈窗
                    backupHistoryModal.style.display = 'none';
                    
                    // 重新加載書籍列表
                    if (typeof loadBooks === 'function') {
                        loadBooks();
                    } else {
                        // 如果在非管理頁面，則重新加載頁面以顯示最新數據
                        window.location.reload();
                    }
                    
                    // 更新最後備份時間顯示
                    updateLastBackupTimeDisplay();
                    
                    alert('備份已恢復，書籍列表已更新');
                } else {
                    alert('恢復備份失敗，請重試');
                }
            }
        }
        
        // 處理刪除按鈕點擊
        if (e.target.classList.contains('delete-btn') || e.target.parentElement.classList.contains('delete-btn')) {
            if (confirm('確定要刪除此備份嗎？此操作無法撤銷！')) {
                BackupManager.deleteBackupHistory(backupId);
                loadBackupHistory();
                alert('備份已刪除');
            }
        }
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
    
    // 加載備份歷史記錄
    function loadBackupHistory() {
        const history = BackupManager.getBackupHistory();
        let html = '';
        
        if (history.length === 0) {
            html = `<tr><td colspan="5" style="text-align: center;">沒有備份記錄</td></tr>`;
        } else {
            history.forEach(backup => {
                // 格式化日期
                const backupDate = new Date(backup.timestamp).toLocaleString();
                
                html += `
                    <tr data-id="${backup.id}">
                        <td>${backupDate}</td>
                        <td>${backup.bookCount} 本</td>
                        <td>${backup.githubFileName ? '是' : '否'}</td>
                        <td>
                            <button class="restore-btn" title="恢復此備份"><i class="fas fa-undo"></i></button>
                            <button class="delete-btn" title="刪除此備份"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
        
        backupHistoryTableBody.innerHTML = html;
    }
    
    // 更新最後備份時間顯示
    function updateLastBackupTimeDisplay() {
        const lastBackupTimeElement = document.getElementById('lastBackupTime');
        if (!lastBackupTimeElement) return;
        
        const lastBackupTime = BackupManager.getLastBackupTime();
        
        if (lastBackupTime) {
            lastBackupTimeElement.textContent = lastBackupTime.toLocaleString();
        } else {
            lastBackupTimeElement.textContent = '從未備份';
        }
    }
});