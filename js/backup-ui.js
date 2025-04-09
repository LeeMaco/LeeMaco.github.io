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
            html = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        <div style="display: flex; flex-direction: column; align-items: center;">
                            <i class="fas fa-database" style="font-size: 48px; color: #bdc3c7; margin-bottom: 15px;"></i>
                            <p style="color: #7f8c8d; font-size: 18px; margin: 0;">沒有備份記錄</p>
                            <p style="color: #95a5a6; font-size: 14px; margin-top: 5px;">點擊「立即備份」按鈕創建您的第一個備份</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            // 添加表頭提示信息
            const headerInfo = `
                <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-weight: bold; color: #2c3e50;">共 ${history.length} 個備份</span>
                        <span style="margin-left: 15px; color: #7f8c8d; font-size: 0.9em;">
                            <i class="fas fa-info-circle"></i> 點擊備份行可以選擇進行比較
                        </span>
                    </div>
                    <div>
                        <input type="text" id="backupSearchInput" placeholder="搜索備份..." style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>
            `;
            
            // 在表格前插入提示信息
            const infoElement = document.createElement('div');
            infoElement.innerHTML = headerInfo;
            backupHistoryTableBody.parentNode.parentNode.insertBefore(infoElement, backupHistoryTableBody.parentNode);
            
            // 綁定搜索功能
            setTimeout(() => {
                const searchInput = document.getElementById('backupSearchInput');
                if (searchInput) {
                    searchInput.addEventListener('input', function() {
                        const searchText = this.value.toLowerCase();
                        const rows = backupHistoryTableBody.querySelectorAll('tr');
                        
                        rows.forEach(row => {
                            const rowText = row.textContent.toLowerCase();
                            if (rowText.includes(searchText)) {
                                row.style.display = '';
                            } else {
                                row.style.display = 'none';
                            }
                        });
                    });
                }
            }, 0);
            
            history.forEach((backup, index) => {
                // 格式化日期
                const backupDate = new Date(backup.timestamp);
                const formattedDate = backupDate.toLocaleString();
                const timeAgo = getTimeAgo(backupDate);
                
                // 驗證備份完整性
                const isValid = BackupManager.verifyBackupIntegrity(backup);
                
                // 獲取GitHub上傳狀態
                let githubStatus = '否';
                let githubStatusClass = 'status-neutral';
                
                if (backup.githubFileName) {
                    githubStatus = '<i class="fas fa-check-circle"></i> 已上傳';
                    githubStatusClass = 'status-success';
                } else if (backup.uploadStatus) {
                    if (backup.uploadStatus === 'uploading') {
                        githubStatus = '<i class="fas fa-spinner fa-spin"></i> 上傳中...';
                        githubStatusClass = 'status-info';
                    } else if (backup.uploadStatus === 'completed' && backup.uploadSuccess) {
                        githubStatus = '<i class="fas fa-check-circle"></i> 已上傳';
                        githubStatusClass = 'status-success';
                    } else if (backup.uploadStatus.includes('retrying')) {
                        githubStatus = `<i class="fas fa-sync fa-spin"></i> ${backup.uploadStatus}`;
                        githubStatusClass = 'status-warning';
                    } else if (backup.uploadStatus === 'failed') {
                        githubStatus = '<i class="fas fa-times-circle"></i> 上傳失敗';
                        githubStatusClass = 'status-danger';
                    }
                }
                
                // 數據完整性狀態
                let integrityStatus, integrityStatusClass;
                if (isValid) {
                    integrityStatus = '<i class="fas fa-shield-alt"></i> 有效';
                    integrityStatusClass = 'status-success';
                } else {
                    integrityStatus = '<i class="fas fa-exclamation-triangle"></i> 無效';
                    integrityStatusClass = 'status-danger';
                }
                
                // 變更統計
                let changesInfo = '<span class="badge badge-info">初始備份</span>';
                let changesDetails = '';
                
                if (backup.changes) {
                    const totalChanges = backup.changes.total;
                    let badgeClass = 'badge-info';
                    
                    if (totalChanges > 50) badgeClass = 'badge-danger';
                    else if (totalChanges > 20) badgeClass = 'badge-warning';
                    else if (totalChanges > 0) badgeClass = 'badge-success';
                    
                    changesInfo = `
                        <span class="badge ${badgeClass}">${totalChanges} 項變更</span>
                    `;
                    
                    changesDetails = `
                        <div class="changes-details">
                            <div class="change-item" style="color: #27ae60;">
                                <i class="fas fa-plus-circle"></i> 新增: ${backup.changes.added}
                            </div>
                            <div class="change-item" style="color: #f39c12;">
                                <i class="fas fa-edit"></i> 修改: ${backup.changes.modified}
                            </div>
                            <div class="change-item" style="color: #e74c3c;">
                                <i class="fas fa-minus-circle"></i> 刪除: ${backup.changes.deleted}
                            </div>
                        </div>
                    `;
                }
                
                // 存儲方式信息
                let storageInfo = '';
                let storageDetails = '';
                
                if (backup.storageMethod === 'chunked') {
                    storageInfo = `<span class="storage-tag">分片存儲</span>`;
                    
                    let compressionInfo = '';
                    if (backup.compressionRatio) {
                        const ratio = (backup.compressionRatio * 100).toFixed(1);
                        compressionInfo = `<div><i class="fas fa-compress-alt"></i> 壓縮率: ${ratio}%</div>`;
                    }
                    
                    storageDetails = `
                        <div class="storage-details">
                            <div><i class="fas fa-puzzle-piece"></i> ${backup.chunks.count} 個分片</div>
                            ${compressionInfo}
                        </div>
                    `;
                }
                
                // 行樣式 - 交替顏色和懸停效果
                const rowClass = index % 2 === 0 ? 'even-row' : 'odd-row';
                const validityClass = isValid ? '' : 'backup-invalid';
                
                html += `
                    <tr data-id="${backup.id}" class="${rowClass} ${validityClass} backup-row" title="點擊選擇此備份進行比較">
                        <td>
                            <div class="backup-date">${formattedDate}</div>
                            <div class="time-ago">${timeAgo}</div>
                        </td>
                        <td>
                            <div class="book-count">
                                <span class="count-number">${backup.bookCount}</span> 本書籍
                            </div>
                            ${storageInfo}
                            ${storageDetails}
                        </td>
                        <td>
                            <div class="status-badge ${githubStatusClass}">${githubStatus}</div>
                        </td>
                        <td>
                            <div class="status-badge ${integrityStatusClass}">${integrityStatus}</div>
                        </td>
                        <td>
                            ${changesInfo}
                            ${changesDetails}
                        </td>
                        <td class="action-buttons">
                            <button class="restore-btn" title="恢復此備份" ${isValid ? '' : 'disabled'}>
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="compare-btn" title="比較備份">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                            <button class="delete-btn" title="刪除此備份">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            // 添加CSS樣式
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                .backup-row { transition: background-color 0.2s; }
                .backup-row:hover { background-color: #f5f9ff; }
                .even-row { background-color: #ffffff; }
                .odd-row { background-color: #f8f9fa; }
                .backup-invalid { background-color: #fff5f5; }
                .backup-selected { background-color: #e3f2fd !important; }
                
                .backup-date { font-weight: bold; color: #2c3e50; }
                .time-ago { font-size: 0.8em; color: #7f8c8d; margin-top: 3px; }
                
                .book-count { font-weight: bold; margin-bottom: 5px; }
                .count-number { color: #3498db; }
                
                .storage-tag {
                    display: inline-block;
                    background-color: #e8f5e9;
                    color: #2e7d32;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.8em;
                    margin-top: 3px;
                }
                
                .storage-details {
                    font-size: 0.8em;
                    color: #7f8c8d;
                    margin-top: 5px;
                }
                
                .status-badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: bold;
                }
                
                .status-success { background-color: #e8f5e9; color: #2e7d32; }
                .status-danger { background-color: #ffebee; color: #c62828; }
                .status-warning { background-color: #fff8e1; color: #f57f17; }
                .status-info { background-color: #e3f2fd; color: #1565c0; }
                .status-neutral { background-color: #f5f5f5; color: #757575; }
                
                .badge {
                    display: inline-block;
                    padding: 3px 7px;
                    border-radius: 10px;
                    font-size: 0.8em;
                    font-weight: bold;
                    color: white;
                }
                
                .badge-success { background-color: #27ae60; }
                .badge-warning { background-color: #f39c12; }
                .badge-danger { background-color: #e74c3c; }
                .badge-info { background-color: #3498db; }
                
                .changes-details {
                    font-size: 0.85em;
                    margin-top: 5px;
                }
                
                .change-item {
                    margin: 2px 0;
                }
                
                .action-buttons button {
                    margin: 0 3px;
                    transition: transform 0.2s;
                }
                
                .action-buttons button:hover {
                    transform: scale(1.2);
                }
            `;
            document.head.appendChild(styleElement);
        }
        
        backupHistoryTableBody.innerHTML = html;
    }
    
    // 獲取相對時間描述
    function getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        const diffMonth = Math.floor(diffDay / 30);
        
        if (diffMonth > 0) {
            return diffMonth === 1 ? '1 個月前' : `${diffMonth} 個月前`;
        } else if (diffDay > 0) {
            return diffDay === 1 ? '1 天前' : `${diffDay} 天前`;
        } else if (diffHour > 0) {
            return diffHour === 1 ? '1 小時前' : `${diffHour} 小時前`;
        } else if (diffMin > 0) {
            return diffMin === 1 ? '1 分鐘前' : `${diffMin} 分鐘前`;
        } else {
            return '剛剛';
        }
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
        
        // 計算總變更數
        const totalChanges = changes.added.length + changes.modified.length + changes.removed.length;
        
        let html = `
            <div class="modal-content" style="width: 85%; max-width: 1000px;">
                <span class="close">&times;</span>
                <h2>備份差異比較</h2>
                <div class="backup-changes">
                    <div class="changes-summary" style="display: flex; justify-content: space-around; margin-bottom: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div class="change-stat">
                            <div style="font-size: 28px; font-weight: bold; color: #27ae60; text-align: center;">${changes.added.length}</div>
                            <div style="text-align: center; margin-top: 5px;"><i class="fas fa-plus-circle" style="color: #27ae60; margin-right: 5px;"></i>新增</div>
                        </div>
                        <div class="change-stat">
                            <div style="font-size: 28px; font-weight: bold; color: #f39c12; text-align: center;">${changes.modified.length}</div>
                            <div style="text-align: center; margin-top: 5px;"><i class="fas fa-edit" style="color: #f39c12; margin-right: 5px;"></i>修改</div>
                        </div>
                        <div class="change-stat">
                            <div style="font-size: 28px; font-weight: bold; color: #e74c3c; text-align: center;">${changes.removed.length}</div>
                            <div style="text-align: center; margin-top: 5px;"><i class="fas fa-minus-circle" style="color: #e74c3c; margin-right: 5px;"></i>刪除</div>
                        </div>
                        <div class="change-stat">
                            <div style="font-size: 28px; font-weight: bold; color: #3498db; text-align: center;">${totalChanges}</div>
                            <div style="text-align: center; margin-top: 5px;"><i class="fas fa-exchange-alt" style="color: #3498db; margin-right: 5px;"></i>總變更</div>
                        </div>
                    </div>
                    
                    <!-- 變更圖表 -->
                    <div class="changes-chart" style="height: 40px; background-color: #eee; border-radius: 5px; margin-bottom: 20px; overflow: hidden; display: flex;">
                        ${totalChanges > 0 ? `
                            <div style="width: ${Math.max(5, Math.round(changes.added.length / totalChanges * 100))}%; height: 100%; background-color: #27ae60; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${changes.added.length > 0 ? Math.round(changes.added.length / totalChanges * 100) + '%' : ''}</div>
                            <div style="width: ${Math.max(5, Math.round(changes.modified.length / totalChanges * 100))}%; height: 100%; background-color: #f39c12; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${changes.modified.length > 0 ? Math.round(changes.modified.length / totalChanges * 100) + '%' : ''}</div>
                            <div style="width: ${Math.max(5, Math.round(changes.removed.length / totalChanges * 100))}%; height: 100%; background-color: #e74c3c; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${changes.removed.length > 0 ? Math.round(changes.removed.length / totalChanges * 100) + '%' : ''}</div>
                        ` : '<div style="width: 100%; height: 100%; background-color: #bdc3c7; display: flex; align-items: center; justify-content: center; color: white;">無變更</div>'}
                    </div>
                    
                    <!-- 選項卡導航 -->
                    <div class="tabs" style="margin-top: 20px;">
                        <div class="tab-nav" style="display: flex; border-bottom: 1px solid #ddd;">
                            <div class="tab-btn active" data-tab="added" style="padding: 12px 18px; cursor: pointer; background-color: ${changes.added.length > 0 ? '#e8f5e9' : '#f5f5f5'}; border-radius: 8px 8px 0 0; margin-right: 5px; font-weight: ${changes.added.length > 0 ? 'bold' : 'normal'}; box-shadow: ${changes.added.length > 0 ? '0 -2px 5px rgba(0,0,0,0.05)' : 'none'};">
                                <i class="fas fa-plus-circle" style="color: #27ae60; margin-right: 5px;"></i>新增 (${changes.added.length})
                            </div>
                            <div class="tab-btn" data-tab="modified" style="padding: 12px 18px; cursor: pointer; background-color: ${changes.modified.length > 0 ? '#fff8e1' : '#f5f5f5'}; border-radius: 8px 8px 0 0; margin-right: 5px; font-weight: ${changes.modified.length > 0 ? 'bold' : 'normal'}; box-shadow: ${changes.modified.length > 0 ? '0 -2px 5px rgba(0,0,0,0.05)' : 'none'};">
                                <i class="fas fa-edit" style="color: #f39c12; margin-right: 5px;"></i>修改 (${changes.modified.length})
                            </div>
                            <div class="tab-btn" data-tab="removed" style="padding: 12px 18px; cursor: pointer; background-color: ${changes.removed.length > 0 ? '#ffebee' : '#f5f5f5'}; border-radius: 8px 8px 0 0; font-weight: ${changes.removed.length > 0 ? 'bold' : 'normal'}; box-shadow: ${changes.removed.length > 0 ? '0 -2px 5px rgba(0,0,0,0.05)' : 'none'};">
                                刪除 (${changes.removed.length})
                            </div>
                        </div>
                        
                        <!-- 選項卡內容 -->
                        <div class="tab-content" style="padding: 20px; border: 1px solid #ddd; border-top: none; max-height: 450px; overflow-y: auto; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-radius: 0 0 8px 8px;">
                            <!-- 新增的書籍 -->
                            <div class="tab-pane active" id="added">
                                ${changes.added.length > 0 ? `
                                    <div class="search-filter" style="margin-bottom: 15px;">
                                        <input type="text" id="addedSearchInput" placeholder="搜索書籍..." style="padding: 8px; width: 250px; border: 1px solid #ddd; border-radius: 4px;">
                                        <span style="margin-left: 10px; color: #666;">共 ${changes.added.length} 本書籍</span>
                                    </div>
                                    <table style="width: 100%; border-collapse: collapse; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                        <thead>
                                            <tr style="background-color: #f8f9fa;">
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">書名</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">作者</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">出版社</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">櫃號</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">ISBN</th>
                                            </tr>
                                        </thead>
                                        <tbody id="addedTableBody">
                                            ${changes.added.map(book => `
                                                <tr class="data-row" data-search-text="${(book.title || '') + ' ' + (book.author || '') + ' ' + (book.publisher || '') + ' ' + (book.isbn || '')}">
                                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                        <div style="font-weight: bold; color: #2c3e50;">${book.title || '-'}</div>
                                                    </td>
                                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${book.author || '-'}</td>
                                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${book.publisher || '-'}</td>
                                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                        <span class="cabinet-tag" style="background-color: #e8f5e9; color: #2e7d32; padding: 3px 8px; border-radius: 4px; font-size: 0.9em;">
                                                            ${book.cabinet || '-'}
                                                        </span>
                                                    </td>
                                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                        <span style="font-family: monospace; color: #666;">${book.isbn || '-'}</span>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                ` : `
                                    <div style="text-align: center; padding: 40px 20px; background-color: #f8f9fa; border-radius: 8px;">
                                        <i class="fas fa-info-circle" style="font-size: 48px; color: #bdc3c7; margin-bottom: 15px;"></i>
                                        <p style="color: #7f8c8d; font-size: 18px;">沒有新增的書籍</p>
                                    </div>
                                `}
                            </div>
                            
                            <!-- 修改的書籍 -->
                            <div class="tab-pane" id="modified" style="display: none;">
                                ${changes.modified.length > 0 ? `
                                    <div class="search-filter" style="margin-bottom: 15px;">
                                        <input type="text" id="modifiedSearchInput" placeholder="搜索書籍..." style="padding: 8px; width: 250px; border: 1px solid #ddd; border-radius: 4px;">
                                        <span style="margin-left: 10px; color: #666;">共 ${changes.modified.length} 本書籍</span>
                                    </div>
                                    <table style="width: 100%; border-collapse: collapse; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                        <thead>
                                            <tr style="background-color: #f8f9fa;">
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">書名</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">作者</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">變更欄位</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">變更數量</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">詳情</th>
                                            </tr>
                                        </thead>
                                        <tbody id="modifiedTableBody">
                                            ${changes.modified.map(change => {
                                                // 找出變更的欄位
                                                const changedFields = [];
                                                for (const key in change.before) {
                                                    if (JSON.stringify(change.before[key]) !== JSON.stringify(change.after[key])) {
                                                        changedFields.push(key);
                                                    }
                                                }
                                                
                                                return `
                                                    <tr class="data-row" data-search-text="${(change.after.title || '') + ' ' + (change.after.author || '') + ' ' + (changedFields.join(' '))}">
                                                        <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                            <div style="font-weight: bold; color: #2c3e50;">${change.after.title || '-'}</div>
                                                        </td>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${change.after.author || '-'}</td>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                            ${changedFields.map(field => `
                                                                <span class="field-tag" style="display: inline-block; background-color: #fff8e1; color: #f39c12; padding: 3px 8px; border-radius: 4px; font-size: 0.9em; margin: 2px;">
                                                                    ${field}
                                                                </span>
                                                            `).join('')}
                                                        </td>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                            <span class="change-count" style="background-color: #f39c12; color: white; padding: 3px 8px; border-radius: 50%; font-size: 0.9em;">
                                                                ${changedFields.length}
                                                            </span>
                                                        </td>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                            <button class="view-details-btn" data-book-id="${change.after.id}" style="padding: 5px 10px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer; transition: background 0.3s;">
                                                                <i class="fas fa-search" style="margin-right: 5px;"></i>查看詳情
                                                            </button>
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                ` : `
                                    <div style="text-align: center; padding: 40px 20px; background-color: #f8f9fa; border-radius: 8px;">
                                        <i class="fas fa-info-circle" style="font-size: 48px; color: #bdc3c7; margin-bottom: 15px;"></i>
                                        <p style="color: #7f8c8d; font-size: 18px;">沒有修改的書籍</p>
                                    </div>
                                `}
                            </div>
                            
                            <!-- 刪除的書籍 -->
                            <div class="tab-pane" id="removed" style="display: none;">
                                ${changes.removed.length > 0 ? `
                                    <div class="search-filter" style="margin-bottom: 15px;">
                                        <input type="text" id="removedSearchInput" placeholder="搜索書籍..." style="padding: 8px; width: 250px; border: 1px solid #ddd; border-radius: 4px;">
                                        <span style="margin-left: 10px; color: #666;">共 ${changes.removed.length} 本書籍</span>
                                    </div>
                                    <table style="width: 100%; border-collapse: collapse; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                        <thead>
                                            <tr style="background-color: #f8f9fa;">
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">書名</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">作者</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">出版社</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">櫃號</th>
                                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">ISBN</th>
                                            </tr>
                                        </thead>
                                        <tbody id="removedTableBody">
                                            ${changes.removed.map(book => `
                                                <tr class="data-row" data-search-text="${(book.title || '') + ' ' + (book.author || '') + ' ' + (book.publisher || '') + ' ' + (book.isbn || '')}">
                                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                        <div style="font-weight: bold; color: #2c3e50; text-decoration: line-through; color: #e74c3c;">${book.title || '-'}</div>
                                                    </td>
                                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${book.author || '-'}</td>
                                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${book.publisher || '-'}</td>
                                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                        <span class="cabinet-tag" style="background-color: #ffebee; color: #e74c3c; padding: 3px 8px; border-radius: 4px; font-size: 0.9em;">
                                                            ${book.cabinet || '-'}
                                                        </span>
                                                    </td>
                                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                        <span style="font-family: monospace; color: #666;">${book.isbn || '-'}</span>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                ` : `
                                    <div style="text-align: center; padding: 40px 20px; background-color: #f8f9fa; border-radius: 8px;">
                                        <i class="fas fa-info-circle" style="font-size: 48px; color: #bdc3c7; margin-bottom: 15px;"></i>
                                        <p style="color: #7f8c8d; font-size: 18px;">沒有刪除的書籍</p>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.innerHTML = html;
        document.body.appendChild(modal);
        
        // 綁定選項卡切換事件
        const tabBtns = modal.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // 移除所有選項卡的活動狀態
                tabBtns.forEach(b => b.classList.remove('active'));
                modal.querySelectorAll('.tab-pane').forEach(pane => pane.style.display = 'none');
                
                // 設置當前選項卡為活動狀態
                this.classList.add('active');
                const tabId = this.getAttribute('data-tab');
                modal.querySelector(`#${tabId}`).style.display = 'block';
            });
        });
        
        // 綁定查看詳情按鈕事件
        modal.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const bookId = this.getAttribute('data-book-id');
                const change = changes.modified.find(c => c.after.id === bookId);
                
                if (change) {
                    showChangeDetails(change);
                }
            });
        });
        
        // 綁定搜索功能
        const setupSearch = (inputId, tableBodyId) => {
            const searchInput = modal.querySelector(`#${inputId}`);
            if (!searchInput) return;
            
            searchInput.addEventListener('input', function() {
                const searchText = this.value.toLowerCase();
                const rows = modal.querySelectorAll(`#${tableBodyId} .data-row`);
                
                rows.forEach(row => {
                    const text = row.getAttribute('data-search-text').toLowerCase();
                    if (text.includes(searchText)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        };
        
        // 設置各選項卡的搜索功能
        setupSearch('addedSearchInput', 'addedTableBody');
        setupSearch('modifiedSearchInput', 'modifiedTableBody');
        setupSearch('removedSearchInput', 'removedTableBody');
        
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
        
        // 添加鍵盤快捷鍵
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                modal.remove();
            }
        });
        
        // 添加動畫效果
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease-in-out';
    }
    
    // 顯示變更詳情
    function showChangeDetails(change) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'changeDetailsModal';
        
        // 找出變更的欄位
        const changedFields = [];
        for (const key in change.before) {
            if (JSON.stringify(change.before[key]) !== JSON.stringify(change.after[key])) {
                changedFields.push({
                    field: key,
                    before: change.before[key],
                    after: change.after[key]
                });
            }
        }
        
        // 獲取書籍基本信息
        const bookTitle = change.after.title || '未知書名';
        const bookAuthor = change.after.author || '未知作者';
        const bookPublisher = change.after.publisher || '未知出版社';
        
        let html = `
            <div class="modal-content" style="width: 70%; max-width: 800px; border-radius: 8px; overflow: hidden;">
                <span class="close">&times;</span>
                <div style="background-color: #f39c12; color: white; padding: 15px 20px;">
                    <h2 style="margin: 0; font-size: 22px;">變更詳情</h2>
                </div>
                
                <div style="padding: 20px;">
                    <!-- 書籍基本信息 -->
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center;">
                        <div style="font-size: 36px; color: #f39c12; margin-right: 15px;">
                            <i class="fas fa-book"></i>
                        </div>
                        <div>
                            <div style="font-size: 20px; font-weight: bold; color: #2c3e50;">${bookTitle}</div>
                            <div style="color: #7f8c8d; margin-top: 5px;">
                                <span style="margin-right: 15px;"><i class="fas fa-user" style="margin-right: 5px;"></i>${bookAuthor}</span>
                                <span><i class="fas fa-building" style="margin-right: 5px;"></i>${bookPublisher}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 變更統計 -->
                    <div style="margin-bottom: 20px;">
                        <div style="font-weight: bold; margin-bottom: 10px; color: #2c3e50; font-size: 16px;">
                            <i class="fas fa-chart-bar" style="margin-right: 5px;"></i>變更統計
                        </div>
                        <div style="background-color: #fff8e1; padding: 10px; border-radius: 5px; display: inline-block;">
                            <span style="font-weight: bold; color: #f39c12;">${changedFields.length}</span> 個欄位已變更
                        </div>
                    </div>
                    
                    <!-- 變更詳情表格 -->
                    <div style="margin-bottom: 20px;">
                        <div style="font-weight: bold; margin-bottom: 10px; color: #2c3e50; font-size: 16px;">
                            <i class="fas fa-list-alt" style="margin-right: 5px;"></i>變更詳情
                        </div>
                        <table style="width: 100%; border-collapse: collapse; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <thead>
                                <tr style="background-color: #f8f9fa;">
                                    <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd; width: 20%;">欄位</th>
                                    <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd; width: 40%;">修改前</th>
                                    <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd; width: 40%;">修改後</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${changedFields.map(field => {
                                    // 格式化顯示值
                                    const formatValue = (value) => {
                                        if (value === null || value === undefined) return '<span style="color: #999;">-</span>';
                                        if (typeof value === 'boolean') return value ? '是' : '否';
                                        if (typeof value === 'number') return value.toString();
                                        if (typeof value === 'string') {
                                            if (value.length > 100) return value.substring(0, 100) + '...';
                                            return value || '<span style="color: #999;">-</span>';
                                        }
                                        return JSON.stringify(value);
                                    };
                                    
                                    // 獲取欄位顯示名稱
                                    const getFieldDisplayName = (fieldName) => {
                                        const fieldMap = {
                                            'title': '書名',
                                            'author': '作者',
                                            'publisher': '出版社',
                                            'isbn': 'ISBN',
                                            'cabinet': '櫃號',
                                            'row': '排號',
                                            'publishDate': '出版日期',
                                            'price': '價格',
                                            'status': '狀態',
                                            'description': '描述'
                                        };
                                        return fieldMap[fieldName] || fieldName;
                                    };
                                    
                                    // 判斷是否為重要欄位
                                    const isImportantField = ['title', 'author', 'publisher', 'isbn', 'cabinet'].includes(field.field);
                                    
                                    return `
                                        <tr>
                                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; ${isImportantField ? 'color: #e74c3c;' : ''}">
                                                ${getFieldDisplayName(field.field)}
                                            </td>
                                            <td style="padding: 10px; border-bottom: 1px solid #eee; background-color: #ffebee; color: #e74c3c;">
                                                ${formatValue(field.before)}
                                            </td>
                                            <td style="padding: 10px; border-bottom: 1px solid #eee; background-color: #e8f5e9; color: #2e7d32;">
                                                ${formatValue(field.after)}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
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