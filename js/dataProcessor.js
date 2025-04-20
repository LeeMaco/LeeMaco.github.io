/**
 * 數據處理模組 - 處理Excel檔案的解析和數據處理
 */

class DataProcessor {
    /**
     * 解析Excel檔案
     * @param {File} file Excel檔案
     * @returns {Promise<Array>} 解析後的數據
     */
    parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const books = XLSX.utils.sheet_to_json(worksheet);
                    
                    // 標準化欄位名稱
                    const normalizedBooks = books.map(book => this.normalizeBookFields(book));
                    
                    resolve(normalizedBooks);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('檔案讀取失敗'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * 標準化書籍欄位
     * @param {Object} book 書籍對象
     * @returns {Object} 標準化後的書籍對象
     */
    normalizeBookFields(book) {
        // 欄位映射表
        const fieldMap = {
            '書名': 'title',
            '作者': 'author',
            '集數': 'series',
            '類別': 'category',
            '櫃號': 'cabinet',
            '行號': 'row',
            '出版社': 'publisher',
            '描述': 'description',
            'ISBN號': 'isbn',
            'ISBN': 'isbn',
            '備註': 'notes'
        };
        
        const normalizedBook = {};
        
        // 處理每個欄位
        Object.keys(book).forEach(key => {
            const normalizedKey = fieldMap[key] || key.toLowerCase();
            normalizedBook[normalizedKey] = book[key];
        });
        
        // 確保必要欄位存在
        normalizedBook.title = normalizedBook.title || '未知書名';
        normalizedBook.author = normalizedBook.author || '未知作者';
        normalizedBook.category = normalizedBook.category || '未分類';
        
        return normalizedBook;
    }
    
    /**
     * 創建Excel工作表
     * @param {Array} books 書籍數組
     * @returns {Object} 工作表對象
     */
    createExcelWorkbook(books) {
        // 格式化數據以便於匯出
        const exportData = books.map(book => ({
            '書名': book.title,
            '作者': book.author,
            '集數': book.series || '',
            '類別': book.category,
            '櫃號': book.cabinet || '',
            '行號': book.row || '',
            '出版社': book.publisher || '',
            '描述': book.description || '',
            'ISBN號': book.isbn || '',
            '備註': book.notes || ''
        }));
        
        // 創建工作表
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '書籍資料');
        
        return workbook;
    }
    
    /**
     * 生成時間戳記檔案名稱
     * @param {string} prefix 檔案名稱前綴
     * @returns {string} 檔案名稱
     */
    generateTimestampFileName(prefix = '書籍資料') {
        const date = new Date();
        const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
        return `${prefix}_${timestamp}.xlsx`;
    }
}

// 初始化數據處理器實例
const dataProcessor = new DataProcessor();