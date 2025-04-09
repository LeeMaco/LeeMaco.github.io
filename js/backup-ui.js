/**
 * 書籍查詢管理系統 - 自動備份UI模塊
 * 負責處理自動備份功能的用戶界面
 */

document.addEventListener('DOMContentLoaded', function() {
    // 檢查是否在管理頁面
    if (!document.getElementById('backupSettingsBtn')) {
        return;
    }
    
    // 初始化備份管理器
    BackupManager.init();
    
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
            maxBackupCount: parseInt(document.getElementById('maxBackupCount').value, 10),
            autoBackupEnabled: document.getElementById('autoBackupEnabled').checked
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
        // 創建備份
        const backup = BackupManager.createBackup();
        
        if (backup) {
            // 重新加載備份歷史記錄
            loadBackupHistory();
            
            // 更新最後備份時間顯示
            updateLastBackupTimeDisplay();
            
            // 顯示成功消息
            alert('備份創建成功');
        } else {
            alert('備份創建失敗，請重試');
        }
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
        
        // 處理差異比較按鈕點擊
        if (e.target.classList.contains('compare-btn') || e.target.parentElement.classList.contains('compare-btn')) {
            const selectedRows = document.querySelectorAll('.backup-selected');
            
            if (selectedRows.length === 0) {
                // 第一次選擇
                row.classList.add('backup-selected');
            } else if (selectedRows.length === 1) {
                // 第二次選擇，執行比較
                const firstBackupId = selectedRows[0].getAttribute('data-id');
                const changes = BackupManager.compareBackups(firstBackupId, backupId);
                
                if (changes) {
                    displayBackupChanges(changes);
                }
                
                // 清除選擇
                selectedRows[0].classList.remove('backup-selected');
            }
        }
        
        // 處理恢復按鈕點擊
        if (e.target.classList.contains('restore-btn') || e.target.parentElement.classList.contains('restore-btn')) {
            if (confirm('確定要恢復此備份嗎？當前數據將被覆蓋！')) {
                if (BackupManager.restoreBackup(backupId)) {
                    // 關閉彈窗
                    backupHistoryModal.style.display = 'none';
                    
                    // 重新加載書籍列表
                    loadBooks();
                    
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
                
                // 驗證備份完整性
                const isValid = BackupManager.verifyBackupIntegrity(backup);
                
                html += `
                    <tr data-id="${backup.id}" class="${isValid ? '' : 'backup-invalid'}">
                        <td>${backupDate}</td>
                        <td>${backup.bookCount} 本</td>
                        <td>${backup.githubFileName ? '是' : '否'}</td>
                        <td>
                            <button class="restore-btn" title="恢復此備份" ${isValid ? '' : 'disabled'}><i class="fas fa-undo"></i></button>
                            <button class="compare-btn" title="比較備份"><i class="fas fa-exchange-alt"></i></button>
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
    
    // 顯示備份差異
    function displayBackupChanges(changes) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'backupCompareModal';
        
        let html = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>備份差異比較</h2>
                <div class="backup-changes">
        `;
        
        if (changes.added.length > 0) {
            html += `
                <h3>新增的書籍 (${changes.added.length}本)</h3>
                <ul>
                    ${changes.added.map(book => `<li>${book.title} - ${book.author}</li>`).join('')}
                </ul>
            `;
        }
        
        if (changes.removed.length > 0) {
            html += `
                <h3>刪除的書籍 (${changes.removed.length}本)</h3>
                <ul>
                    ${changes.removed.map(book => `<li>${book.title} - ${book.author}</li>`).join('')}
                </ul>
            `;
        }
        
        if (changes.modified.length > 0) {
            html += `
                <h3>修改的書籍 (${changes.modified.length}本)</h3>
                <ul>
                    ${changes.modified.map(change => `
                        <li>
                            ${change.before.title} - ${change.before.author}<br>
                            <small>修改前：${JSON.stringify(change.before)}</small><br>
                            <small>修改後：${JSON.stringify(change.after)}</small>
                        </li>
                    `).join('')}
                </ul>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        modal.innerHTML = html;
        document.body.appendChild(modal);
        
        // 綁定關閉按鈕事件
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', function() {
            modal.remove();
        });
        
        // 點擊彈窗外部關閉
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
});