// 備份歷史列表功能
function displayBackupHistory(historyData) {
    const historyContainer = document.getElementById('backupHistoryItems');
    historyContainer.innerHTML = '';

    historyData.forEach(backup => {
        const li = document.createElement('li');
        li.className = `backup-item ${backup.status}`;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'backup-time';
        timeSpan.textContent = new Date(backup.timestamp).toLocaleString();
        
        const statusSpan = document.createElement('span');
        statusSpan.className = 'backup-status';
        statusSpan.textContent = backup.status === 'success' ? '成功' : '失敗';
        
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'restore-btn';
        restoreBtn.innerHTML = '<i class="fas fa-undo"></i> 恢復';
        restoreBtn.onclick = () => restoreBackup(backup.id);
        
        li.appendChild(timeSpan);
        li.appendChild(statusSpan);
        li.appendChild(restoreBtn);
        historyContainer.appendChild(li);
    });
}

// 恢復備份功能
function restoreBackup(backupId) {
    // 這裡添加恢復備份的邏輯
    console.log(`恢復備份: ${backupId}`);
}