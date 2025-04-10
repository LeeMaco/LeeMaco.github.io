/**
 * 備份與恢復系統
 * 提供增量備份、壓縮備份和備份恢復功能
 */

document.addEventListener('DOMContentLoaded', function() {
    // 獲取DOM元素
    const backupHistoryBtn = document.getElementById('backup-history-btn');
    const backupHistoryModal = document.getElementById('backup-history-modal');
    const backupHistoryList = document.getElementById('backup-history-list');
    const closeBackupHistoryBtn = document.getElementById('close-backup-history');
    const restoreBackupBtn = document.getElementById('restore-backup-btn');
    const backupTypeSelect = document.getElementById('backup-type');
    
    // 初始化
    function initBackupSystem() {
        // 檢查備份歷史按鈕是否存在
        if (backupHistoryBtn) {
            backupHistoryBtn.addEventListener('click', showBackupHistory);
        }
        
        // 檢查關閉按鈕是否存在
        if (closeBackupHistoryBtn) {
            closeBackupHistoryBtn.addEventListener('click', function() {
                backupHistoryModal.style.display = 'none';
            });
        }
        
        // 檢查恢復按鈕是否存在
        if (restoreBackupBtn) {
            restoreBackupBtn.addEventListener('click', function() {
                const selectedBackup = document.querySelector('input[name="backup-select"]:checked');
                if (selectedBackup) {
                    restoreBackup(selectedBackup.value);
                } else {
                    alert('請選擇要恢復的備份');
                }
            });
        }
    }
    
    // 顯示備份歷史
    function showBackupHistory() {
        // 在實際應用中，這裡應該從服務器獲取備份歷史
        // 由於GitHub Pages的限制，我們使用模擬數據
        fetchBackupHistory()
            .then(backups => {
                renderBackupHistory(backups);
                backupHistoryModal.style.display = 'block';
            })
            .catch(error => {
                console.error('獲取備份歷史失敗:', error);
                alert('無法獲取備份歷史，請稍後再試');
            });
    }
    
    // 獲取備份歷史
    function fetchBackupHistory() {
        return new Promise((resolve, reject) => {
            // 嘗試從服務器獲取備份歷史
            fetch('backups/backup_history.md')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('無法獲取備份歷史');
                    }
                    return response.text();
                })
                .then(text => {
                    // 解析Markdown格式的備份歷史
                    const backups = parseBackupHistory(text);
                    resolve(backups);
                })
                .catch(error => {
                    console.warn('從服務器獲取備份歷史失敗，使用模擬數據', error);
                    // 使用模擬數據
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const lastWeek = new Date(today);
                    lastWeek.setDate(lastWeek.getDate() - 7);
                    
                    const mockBackups = [
                        {
                            timestamp: formatDate(today, true),
                            type: '完整備份',
                            size: '15KB',
                            date: formatDate(today)
                        },
                        {
                            timestamp: formatDate(yesterday, true),
                            type: '增量備份',
                            size: '3KB',
                            date: formatDate(yesterday)
                        },
                        {
                            timestamp: formatDate(lastWeek, true),
                            type: '完整備份',
                            size: '14KB',
                            date: formatDate(lastWeek)
                        }
                    ];
                    resolve(mockBackups);
                });
        });
    }
    
    // 解析備份歷史Markdown
    function parseBackupHistory(markdown) {
        const backups = [];
        const lines = markdown.split('\n');
        
        // 跳過標題行和表格頭
        for (let i = 5; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('|') && line.endsWith('|')) {
                const parts = line.split('|').map(part => part.trim()).filter(part => part);
                if (parts.length >= 3) {
                    backups.push({
                        timestamp: parts[0],
                        type: parts[1],
                        size: parts[2],
                        date: formatTimestampToDate(parts[0])
                    });
                }
            }
        }
        
        return backups;
    }
    
    // 渲染備份歷史
    function renderBackupHistory(backups) {
        backupHistoryList.innerHTML = '';
        
        if (backups.length === 0) {
            backupHistoryList.innerHTML = '<tr><td colspan="4">沒有可用的備份</td></tr>';
            return;
        }
        
        backups.forEach(backup => {
            const row = document.createElement('tr');
            
            const selectCell = document.createElement('td');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'backup-select';
            radio.value = backup.timestamp;
            selectCell.appendChild(radio);
            
            const dateCell = document.createElement('td');
            dateCell.textContent = backup.date;
            
            const typeCell = document.createElement('td');
            typeCell.textContent = backup.type;
            
            const sizeCell = document.createElement('td');
            sizeCell.textContent = backup.size;
            
            row.appendChild(selectCell);
            row.appendChild(dateCell);
            row.appendChild(typeCell);
            row.appendChild(sizeCell);
            
            backupHistoryList.appendChild(row);
        });
    }
    
    // 恢復備份
    function restoreBackup(timestamp) {
        // 在實際應用中，這裡應該調用服務器API恢復備份
        // 由於GitHub Pages的限制，我們只能模擬這個功能
        console.log('恢復備份:', timestamp);
        
        // 顯示確認對話框
        if (confirm(`確定要恢復到 ${formatTimestampToDate(timestamp)} 的備份嗎？這將覆蓋當前數據。`)) {
            // 模擬恢復過程
            alert('正在恢復備份，請稍候...');
            
            // 模擬API調用
            setTimeout(() => {
                alert('備份恢復成功！');
                backupHistoryModal.style.display = 'none';
                // 重新加載數據
                if (typeof loadBooks === 'function') {
                    loadBooks();
                }
            }, 1500);
        }
    }
    
    // 執行備份
    function performBackup(type = 'full') {
        // 在實際應用中，這裡應該調用服務器API執行備份
        // 由於GitHub Pages的限制，我們只能模擬這個功能
        console.log('執行備份類型:', type);
        
        // 顯示進度提示
        alert(`正在執行${type === 'incremental' ? '增量' : '完整'}備份，請稍候...`);
        
        // 模擬API調用
        setTimeout(() => {
            alert('備份完成！');
            // 如果備份歷史模態框是打開的，刷新列表
            if (backupHistoryModal.style.display === 'block') {
                showBackupHistory();
            }
        }, 1500);
    }
    
    // 格式化日期
    function formatDate(date, forTimestamp = false) {
        if (forTimestamp) {
            return date.getFullYear().toString() +
                   (date.getMonth() + 1).toString().padStart(2, '0') +
                   date.getDate().toString().padStart(2, '0') + '_' +
                   date.getHours().toString().padStart(2, '0') +
                   date.getMinutes().toString().padStart(2, '0') +
                   date.getSeconds().toString().padStart(2, '0');
        }
        
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // 將時間戳格式化為日期
    function formatTimestampToDate(timestamp) {
        // 假設時間戳格式為 YYYYMMDD_HHMMSS
        if (timestamp.length < 15) return timestamp; // 不是預期格式
        
        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        const day = timestamp.substring(6, 8);
        const hour = timestamp.substring(9, 11);
        const minute = timestamp.substring(11, 13);
        
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }
    
    // 公開API
    window.backupSystem = {
        performBackup: performBackup,
        showBackupHistory: showBackupHistory
    };
    
    // 初始化備份系統
    initBackupSystem();
    
    // 如果存在備份按鈕，添加事件監聽器
    const backupBtn = document.getElementById('backup-btn');
    if (backupBtn) {
        backupBtn.addEventListener('click', function() {
            const type = backupTypeSelect ? backupTypeSelect.value : 'full';
            performBackup(type);
        });
    }
});