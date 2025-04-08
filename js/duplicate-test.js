/**
 * 書籍查詢管理系統 - 重複書籍測試模塊
 * 用於測試去除重複書籍功能
 */

// 自執行函數，避免污染全局命名空間
(function() {
    // 測試函數
    function testDuplicateDetection() {
        console.log('開始測試去除重複書籍功能...');
        
        // 創建測試數據
        const testBooks = [
            {
                id: '1',
                title: '測試書籍',
                author: '測試作者',
                series: '第一集',
                publisher: '測試出版社',
                createdAt: new Date('2023-01-01').toISOString()
            },
            {
                id: '2',
                title: '測試書籍 ',  // 注意這裡有一個空格
                author: '測試作者',
                series: '1',  // 數字形式的集數
                publisher: '測試出版社',
                createdAt: new Date('2023-01-02').toISOString()
            },
            {
                id: '3',
                title: '測試書籍',
                author: ' 測試作者 ',  // 前後有空格
                series: '一',  // 中文數字
                publisher: '測試出版社',
                createdAt: new Date('2023-01-03').toISOString()
            },
            {
                id: '4',
                title: '不同的書',
                author: '測試作者',
                series: '第二集',
                publisher: '測試出版社',
                createdAt: new Date('2023-01-04').toISOString()
            }
        ];
        
        // 備份當前書籍數據
        const originalBooks = localStorage.getItem('books');
        
        // 設置測試數據
        localStorage.setItem('books', JSON.stringify(testBooks));
        
        // 執行去重操作
        console.log('使用標準: 書名、作者、集數');
        const result = BookData.removeDuplicateBooks(['title', 'author', 'series']);
        
        // 輸出結果
        console.log('去重結果:', result);
        
        // 獲取去重後的書籍
        const remainingBooks = JSON.parse(localStorage.getItem('books'));
        console.log('剩餘書籍:', remainingBooks);
        
        // 檢查結果
        if (result.removed === 2 && remainingBooks.length === 2) {
            console.log('✅ 測試通過: 成功識別並移除了重複書籍');
        } else {
            console.log('❌ 測試失敗: 未能正確識別重複書籍');
            console.log(`預期移除 2 本書籍，實際移除了 ${result.removed} 本`);
            console.log(`預期剩餘 2 本書籍，實際剩餘 ${remainingBooks.length} 本`);
        }
        
        // 恢復原始數據
        if (originalBooks) {
            localStorage.setItem('books', originalBooks);
        } else {
            localStorage.removeItem('books');
        }
        
        console.log('測試完成，已恢復原始數據');
    }
    
    // 添加測試按鈕到頁面
    function addTestButton() {
        // 檢查是否在管理頁面
        if (!document.getElementById('removeDuplicatesBtn')) {
            console.log('不在管理頁面，跳過添加測試按鈕');
            return;
        }
        
        // 創建測試按鈕
        const testButton = document.createElement('button');
        testButton.id = 'testDuplicatesBtn';
        testButton.className = 'excel-btn';
        testButton.innerHTML = '<i class="fas fa-vial"></i> 測試去重';
        testButton.style.backgroundColor = '#9b59b6';
        testButton.style.marginLeft = '5px';
        
        // 添加點擊事件
        testButton.addEventListener('click', function() {
            testDuplicateDetection();
        });
        
        // 添加到頁面
        const adminActions = document.querySelector('.admin-actions');
        if (adminActions) {
            adminActions.appendChild(testButton);
        }
    }
    
    // 頁面加載完成後執行
    document.addEventListener('DOMContentLoaded', function() {
        // 等待BookData初始化完成
        setTimeout(addTestButton, 500);
    });
})();