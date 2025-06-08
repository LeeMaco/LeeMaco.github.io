// 會員管理系統主程序
class MemberManagementSystem {
    constructor() {
        this.db = null;
        this.currentMember = null;
        this.currentPhoto = null;
        this.photoEditor = null;
        this.members = [];
        this.filteredMembers = [];
        
        this.init();
    }

    // 初始化系統
    async init() {
        try {
            // 初始化變數
            this.currentPage = 1;
            this.isLoading = false;
            this.hasMoreMembers = true;
            this.searchQuery = '';
            this.searchCache = {};
            
            await this.initDatabase();
            const result = await this.loadMembers(1, 30); // 初始加載 30 筆資料
            this.hasMoreMembers = result.hasMore;
            
            this.initEventListeners();
            this.updateStorageInfo();
            this.renderMembers();
            
            // 檢查是否支持 PWA
            this.initPWA();
            
            // 顯示資料庫統計信息
            console.log(`已載入 ${this.members.length} 筆會員資料，總計 ${result.total} 筆`);
        } catch (error) {
            console.error('系統初始化失敗:', error);
            this.showNotification('系統初始化失敗', 'error');
        }
    }

    // 初始化 IndexedDB
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MemberDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 創建會員資料表
                if (!db.objectStoreNames.contains('members')) {
                    const memberStore = db.createObjectStore('members', { keyPath: 'id', autoIncrement: true });
                    memberStore.createIndex('name', 'name', { unique: false });
                    memberStore.createIndex('phone', 'phone', { unique: false });
                    memberStore.createIndex('email', 'email', { unique: false });
                }
                
                // 創建照片資料表
                if (!db.objectStoreNames.contains('photos')) {
                    db.createObjectStore('photos', { keyPath: 'memberId' });
                }
                
                // 創建備份資料表
                if (!db.objectStoreNames.contains('backups')) {
                    const backupStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
                    backupStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // 初始化事件監聽器
    initEventListeners() {
        // 主要按鈕
        document.getElementById('addMemberBtn').addEventListener('click', () => this.showMemberModal());
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('backupBtn').addEventListener('click', () => this.createBackup());
        
        // 搜尋 - 使用防抖動優化
        const searchInput = document.getElementById('searchInput');
        let debounceTimer;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.searchQuery = e.target.value;
                this.currentPage = 1; // 重置頁碼
                this.searchMembers(this.searchQuery, 1);
            }, 300); // 300ms 防抖動
        });
        
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.searchQuery = searchInput.value;
            this.currentPage = 1; // 重置頁碼
            this.searchMembers(this.searchQuery, 1);
        });
        
        // 無限滾動加載
        window.addEventListener('scroll', () => {
            if (this.isLoading || !this.hasMoreMembers) return;
            
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            // 當滾動到距離底部 200px 時加載更多
            if (scrollY + windowHeight >= documentHeight - 200) {
                this.loadMoreMembers();
            }
        });
        
        // 會員表單
        document.getElementById('memberForm').addEventListener('submit', (e) => this.handleMemberSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideMemberModal());
        
        // 模態框關閉
        document.getElementById('closeModal').addEventListener('click', () => this.hideMemberModal());
        document.getElementById('closeMemberDetailModal').addEventListener('click', () => this.hideMemberDetailModal());
        document.getElementById('closePhotoEditModal').addEventListener('click', () => this.hidePhotoEditModal());
        document.getElementById('closeImportExportModal').addEventListener('click', () => this.hideImportExportModal());
        
        // 照片處理
        document.getElementById('photoInput').addEventListener('change', (e) => this.handlePhotoUpload(e));
        document.getElementById('photoPreview').addEventListener('click', () => document.getElementById('photoInput').click());
        document.getElementById('editPhotoBtn').addEventListener('click', () => this.showPhotoEditor());
        document.getElementById('removePhotoBtn').addEventListener('click', () => this.removePhoto());
        
        // 照片編輯器
        document.getElementById('scaleSlider').addEventListener('input', (e) => this.updatePhotoScale(e.target.value));
        document.getElementById('rotateSlider').addEventListener('input', (e) => this.updatePhotoRotation(e.target.value));
        document.getElementById('horizontalSlider').addEventListener('input', (e) => this.updatePhotoHorizontal(e.target.value));
        document.getElementById('verticalSlider').addEventListener('input', (e) => this.updatePhotoVertical(e.target.value));
        document.getElementById('resetPhotoBtn').addEventListener('click', () => this.resetPhotoEditor());
        document.getElementById('cropPhotoBtn').addEventListener('click', () => this.cropPhoto());
        document.getElementById('savePhotoBtn').addEventListener('click', () => this.saveEditedPhoto());
        
        // 會員詳情
        document.getElementById('editMemberBtn').addEventListener('click', () => this.editCurrentMember());
        document.getElementById('deleteMemberBtn').addEventListener('click', () => this.deleteCurrentMember());
        
        // 確認對話框
        document.getElementById('confirmCancel').addEventListener('click', () => this.hideConfirmModal());
        document.getElementById('confirmOk').addEventListener('click', () => this.executeConfirmAction());
        
        // 通知關閉
        document.getElementById('closeNotification').addEventListener('click', () => this.hideNotification());
        
        // 點擊模態框背景關閉
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });
        
        // 鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.showMemberModal();
                        break;
                    case 's':
                        e.preventDefault();
                        this.createBackup();
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('searchInput').focus();
                        break;
                }
            }
        });
    }
    
    // 加載更多會員
    async loadMoreMembers() {
        if (this.isLoading || !this.hasMoreMembers) return;
        
        this.isLoading = true;
        this.currentPage++;
        
        try {
            let result;
            
            if (this.searchQuery) {
                // 如果有搜尋查詢，則加載更多搜尋結果
                result = await this.searchMembers(this.searchQuery, this.currentPage);
            } else {
                // 否則加載更多所有會員
                result = await this.loadMembers(this.currentPage);
            }
            
            this.hasMoreMembers = result.hasMore;
            
            if (!this.hasMoreMembers && this.members.length > 0) {
                this.showNotification('已加載全部會員資料');
            }
        } catch (error) {
            console.error('加載更多會員失敗:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // 載入會員資料 (優化版本，支持分頁加載)
    async loadMembers(page = 1, pageSize = 50) {
        try {
            // 如果是第一頁，重置會員列表
            if (page === 1) {
                this.members = [];
                this.filteredMembers = [];
                this.totalMembers = await this.countMembers();
            }
            
            const transaction = this.db.transaction(['members'], 'readonly');
            const store = transaction.objectStore('members');
            
            // 使用游標進行分頁加載
            const request = store.openCursor();
            let count = 0;
            const skip = (page - 1) * pageSize;
            
            return new Promise((resolve, reject) => {
                const pageMembers = [];
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor) {
                        if (count >= skip) {
                            if (pageMembers.length < pageSize) {
                                pageMembers.push(cursor.value);
                            }
                        }
                        
                        count++;
                        
                        if (pageMembers.length < pageSize) {
                            cursor.continue();
                        } else {
                            // 已獲取足夠的數據
                            this.members = [...this.members, ...pageMembers];
                            this.filteredMembers = [...this.members];
                            resolve({
                                members: pageMembers,
                                hasMore: count < this.totalMembers,
                                total: this.totalMembers
                            });
                        }
                    } else {
                        // 沒有更多數據
                        this.members = [...this.members, ...pageMembers];
                        this.filteredMembers = [...this.members];
                        resolve({
                            members: pageMembers,
                            hasMore: false,
                            total: this.totalMembers
                        });
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('載入會員資料失敗:', error);
            throw error;
        }
    }
    
    // 計算會員總數
    async countMembers() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['members'], 'readonly');
            const store = transaction.objectStore('members');
            const countRequest = store.count();
            
            countRequest.onsuccess = () => resolve(countRequest.result);
            countRequest.onerror = () => reject(countRequest.error);
        });
    }

    // 渲染會員列表
    renderMembers(append = false) {
        const membersList = document.getElementById('membersList');
        const emptyState = document.getElementById('emptyState');
        const loadingIndicator = document.getElementById('loadingIndicator');
        
        // 處理空結果
        if (this.filteredMembers.length === 0) {
            membersList.style.display = 'none';
            emptyState.style.display = 'block';
            
            // 更新空狀態訊息
            const emptyTitle = document.querySelector('#emptyState h3');
            const emptyText = document.querySelector('#emptyState p');
            
            if (this.searchQuery) {
                emptyTitle.textContent = '沒有符合的搜尋結果';
                emptyText.textContent = `沒有找到符合「${this.searchQuery}」的會員資料`;
            } else {
                emptyTitle.textContent = '尚無會員資料';
                emptyText.textContent = '點擊「新增會員」開始建立您的會員資料庫';
            }
            
            return;
        }
        
        // 顯示會員列表
        membersList.style.display = 'grid';
        emptyState.style.display = 'none';
        
        // 生成 HTML
        if (append) {
            // 追加模式：保留現有卡片，添加新卡片
            const startIndex = membersList.querySelectorAll('.member-card').length;
            const newMembers = this.filteredMembers.slice(startIndex);
            
            const fragment = document.createDocumentFragment();
            newMembers.forEach(member => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.createMemberCard(member);
                fragment.appendChild(tempDiv.firstElementChild);
            });
            
            membersList.appendChild(fragment);
            
            // 為新添加的卡片添加點擊事件
            newMembers.forEach((member, index) => {
                const newIndex = startIndex + index;
                const card = membersList.querySelectorAll('.member-card')[newIndex];
                card.addEventListener('click', () => this.showMemberDetail(this.filteredMembers[newIndex]));
            });
        } else {
            // 重置模式：完全替換所有卡片
            membersList.innerHTML = this.filteredMembers.map(member => this.createMemberCard(member)).join('');
            
            // 添加點擊事件
            membersList.querySelectorAll('.member-card').forEach((card, index) => {
                card.addEventListener('click', () => this.showMemberDetail(this.filteredMembers[index]));
            });
        }
        
        // 顯示加載狀態
        if (this.hasMoreMembers) {
            // 如果還有更多資料，顯示加載指示器
            if (!document.getElementById('loadMoreIndicator')) {
                const loadMoreIndicator = document.createElement('div');
                loadMoreIndicator.id = 'loadMoreIndicator';
                loadMoreIndicator.className = 'load-more-indicator';
                loadMoreIndicator.innerHTML = '<div class="spinner"></div><p>載入更多...</p>';
                membersList.after(loadMoreIndicator);
            }
        } else {
            // 如果沒有更多資料，移除加載指示器
            const loadMoreIndicator = document.getElementById('loadMoreIndicator');
            if (loadMoreIndicator) {
                loadMoreIndicator.remove();
            }
        }
    }

    // 創建會員卡片
    createMemberCard(member) {
        const avatar = member.photo ? 
            `<img src="${member.photo}" alt="${member.name}" class="member-avatar">` :
            `<div class="member-avatar-placeholder">${member.name.charAt(0)}</div>`;
        
        const email = member.email ? `<p>📧 ${member.email}</p>` : '';
        const birthday = member.birthday ? `<p>🎂 ${this.formatDate(member.birthday)}</p>` : '';
        
        return `
            <div class="member-card" data-id="${member.id}">
                <div class="member-header">
                    ${avatar}
                    <div class="member-info">
                        <h3>${this.escapeHtml(member.name)}</h3>
                        <p>📞 ${this.escapeHtml(member.phone)}</p>
                    </div>
                </div>
                <div class="member-details">
                    ${email}
                    ${birthday}
                    ${member.address ? `<p>📍 ${this.escapeHtml(member.address)}</p>` : ''}
                </div>
            </div>
        `;
    }

    // 顯示會員表單模態框
    showMemberModal(member = null) {
        this.currentMember = member;
        const modal = document.getElementById('memberModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('memberForm');
        
        title.textContent = member ? '編輯會員' : '新增會員';
        
        if (member) {
            this.fillMemberForm(member);
        } else {
            form.reset();
            this.resetPhotoPreview();
        }
        
        modal.classList.add('show');
        document.getElementById('memberName').focus();
    }

    // 填充會員表單
    async fillMemberForm(member) {
        document.getElementById('memberName').value = member.name || '';
        document.getElementById('memberPhone').value = member.phone || '';
        document.getElementById('memberEmail').value = member.email || '';
        document.getElementById('memberBirthday').value = member.birthday || '';
        document.getElementById('memberAddress').value = member.address || '';
        document.getElementById('memberNotes').value = member.notes || '';
        
        // 載入照片
        if (member.photo) {
            this.setPhotoPreview(member.photo);
        } else {
            this.resetPhotoPreview();
        }
    }

    // 隱藏會員表單模態框
    hideMemberModal() {
        document.getElementById('memberModal').classList.remove('show');
        this.currentMember = null;
        this.currentPhoto = null;
    }

    // 處理會員表單提交
    async handleMemberSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const memberData = {
            name: formData.get('name').trim(),
            phone: formData.get('phone').trim(),
            email: formData.get('email').trim(),
            birthday: formData.get('birthday'),
            address: formData.get('address').trim(),
            notes: formData.get('notes').trim(),
            photo: this.currentPhoto,
            updatedAt: new Date().toISOString()
        };
        
        // 驗證必填欄位
        if (!memberData.name || !memberData.phone) {
            this.showNotification('請填寫姓名和電話', 'error');
            return;
        }
        
        try {
            this.showLoading();
            
            if (this.currentMember) {
                // 更新會員
                memberData.id = this.currentMember.id;
                memberData.createdAt = this.currentMember.createdAt;
                await this.updateMember(memberData);
                this.showNotification('會員資料更新成功');
            } else {
                // 新增會員
                memberData.createdAt = new Date().toISOString();
                await this.addMember(memberData);
                this.showNotification('會員新增成功');
            }
            
            await this.loadMembers();
            this.renderMembers();
            this.hideMemberModal();
            this.updateStorageInfo();
            
        } catch (error) {
            console.error('儲存會員資料失敗:', error);
            this.showNotification('儲存失敗，請重試', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 新增會員到資料庫
    async addMember(memberData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['members'], 'readwrite');
            const store = transaction.objectStore('members');
            const request = store.add(memberData);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 更新會員資料
    async updateMember(memberData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['members'], 'readwrite');
            const store = transaction.objectStore('members');
            const request = store.put(memberData);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 刪除會員
    async deleteMember(memberId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['members'], 'readwrite');
            const store = transaction.objectStore('members');
            const request = store.delete(memberId);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // 搜尋會員 (優化版本，使用 IndexedDB 索引)
    async searchMembers(query, page = 1, pageSize = 50) {
        try {
            this.showLoading();
            
            // 如果搜尋詞為空，則載入所有會員
            if (!query.trim()) {
                const result = await this.loadMembers(page, pageSize);
                this.renderMembers();
                this.hideLoading();
                return result;
            }
            
            // 重置搜尋結果（如果是第一頁）
            if (page === 1) {
                this.filteredMembers = [];
                this.searchCache = {}; // 重置搜尋緩存
            }
            
            // 檢查緩存
            const cacheKey = `${query}_${page}_${pageSize}`;
            if (this.searchCache && this.searchCache[cacheKey]) {
                this.filteredMembers = this.searchCache[cacheKey];
                this.renderMembers();
                this.hideLoading();
                return {
                    members: this.filteredMembers,
                    hasMore: false,
                    total: this.filteredMembers.length
                };
            }
            
            // 分割搜尋詞，支持多關鍵字搜尋
            const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
            
            // 使用 IndexedDB 的索引進行搜尋
            const transaction = this.db.transaction(['members'], 'readonly');
            const store = transaction.objectStore('members');
            
            // 獲取所有索引
            const nameIndex = store.index('name');
            const phoneIndex = store.index('phone');
            const emailIndex = store.index('email');
            
            // 使用 Promise.all 並行搜尋多個索引
            const searchResults = await Promise.all([
                this.searchByIndex(nameIndex, searchTerms),
                this.searchByIndex(phoneIndex, searchTerms),
                this.searchByIndex(emailIndex, searchTerms)
            ]);
            
            // 合併搜尋結果並去重
            const allResults = [];
            const uniqueIds = new Set();
            
            searchResults.flat().forEach(member => {
                if (!uniqueIds.has(member.id)) {
                    uniqueIds.add(member.id);
                    allResults.push(member);
                }
            });
            
            // 根據相關性排序結果
            const sortedResults = this.sortSearchResults(allResults, searchTerms);
            
            // 分頁處理
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const pagedResults = sortedResults.slice(start, end);
            
            // 更新過濾後的會員列表
            if (page === 1) {
                this.filteredMembers = pagedResults;
            } else {
                this.filteredMembers = [...this.filteredMembers, ...pagedResults];
            }
            
            // 緩存搜尋結果
            if (!this.searchCache) this.searchCache = {};
            this.searchCache[cacheKey] = this.filteredMembers;
            
            this.renderMembers();
            this.hideLoading();
            
            return {
                members: pagedResults,
                hasMore: end < sortedResults.length,
                total: sortedResults.length
            };
            
        } catch (error) {
            console.error('搜尋會員失敗:', error);
            this.showNotification('搜尋失敗，請重試', 'error');
            this.hideLoading();
            return { members: [], hasMore: false, total: 0 };
        }
    }
    
    // 使用索引搜尋
    async searchByIndex(index, searchTerms) {
        return new Promise((resolve, reject) => {
            const results = [];
            const request = index.openCursor();
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const member = cursor.value;
                    const fieldValue = String(member[index.name] || '').toLowerCase();
                    
                    // 檢查是否匹配所有搜尋詞
                    const isMatch = searchTerms.some(term => fieldValue.includes(term));
                    
                    if (isMatch) {
                        results.push(member);
                    }
                    
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    // 根據相關性排序搜尋結果
    sortSearchResults(results, searchTerms) {
        return results.sort((a, b) => {
            const aScore = this.calculateRelevanceScore(a, searchTerms);
            const bScore = this.calculateRelevanceScore(b, searchTerms);
            return bScore - aScore; // 降序排列，分數高的排前面
        });
    }
    
    // 計算相關性分數
    calculateRelevanceScore(member, searchTerms) {
        let score = 0;
        const name = String(member.name || '').toLowerCase();
        const phone = String(member.phone || '');
        const email = String(member.email || '').toLowerCase();
        
        searchTerms.forEach(term => {
            // 姓名匹配權重最高
            if (name.includes(term)) score += 10;
            // 精確匹配加分
            if (name === term) score += 15;
            
            // 電話匹配
            if (phone.includes(term)) score += 8;
            if (phone === term) score += 12;
            
            // 電子郵件匹配
            if (email.includes(term)) score += 5;
            if (email === term) score += 10;
        });
        
        return score;
    }

    // 照片上傳處理
    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // 檢查檔案類型
        if (!file.type.startsWith('image/')) {
            this.showNotification('請選擇圖片檔案', 'error');
            return;
        }
        
        // 檢查檔案大小 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('圖片檔案不能超過 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.setPhotoPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    // 設置照片預覽
    setPhotoPreview(photoData) {
        const preview = document.getElementById('photoPreview');
        const controls = document.querySelector('.photo-controls');
        
        preview.innerHTML = `<img src="${photoData}" alt="會員照片">`;
        controls.style.display = 'flex';
        this.currentPhoto = photoData;
    }

    // 重置照片預覽
    resetPhotoPreview() {
        const preview = document.getElementById('photoPreview');
        const controls = document.querySelector('.photo-controls');
        
        preview.innerHTML = `
            <div class="upload-placeholder">
                <span class="upload-icon">📷</span>
                <p>點擊上傳照片</p>
            </div>
        `;
        controls.style.display = 'none';
        this.currentPhoto = null;
    }

    // 移除照片
    removePhoto() {
        this.resetPhotoPreview();
        document.getElementById('photoInput').value = '';
    }

    // 顯示照片編輯器
    showPhotoEditor() {
        if (!this.currentPhoto) {
            this.showNotification('請先上傳照片', 'error');
            return;
        }
        
        const modal = document.getElementById('photoEditModal');
        const canvas = document.getElementById('photoCanvas');
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = () => {
            canvas.width = Math.min(img.width, 600);
            canvas.height = Math.min(img.height, 400);
            
            this.photoEditor = {
                originalImage: img,
                canvas: canvas,
                ctx: ctx,
                scale: 1,
                rotation: 0,
                offsetX: 0,
                offsetY: 0
            };
            
            this.drawPhoto();
            modal.classList.add('show');
        };
        img.src = this.currentPhoto;
    }

    // 繪製照片
    drawPhoto() {
        if (!this.photoEditor) return;
        
        const { ctx, canvas, originalImage, scale, rotation, offsetX, offsetY } = this.photoEditor;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(scale, scale);
        ctx.translate(offsetX, offsetY);
        
        const drawWidth = originalImage.width;
        const drawHeight = originalImage.height;
        
        ctx.drawImage(originalImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
    }

    // 更新照片縮放
    updatePhotoScale(value) {
        if (this.photoEditor) {
            this.photoEditor.scale = parseFloat(value);
            document.getElementById('scaleValue').textContent = Math.round(value * 100) + '%';
            this.drawPhoto();
        }
    }

    // 更新照片旋轉
    updatePhotoRotation(value) {
        if (this.photoEditor) {
            this.photoEditor.rotation = parseInt(value);
            document.getElementById('rotateValue').textContent = value + '°';
            this.drawPhoto();
        }
    }

    // 更新照片水平位置
    updatePhotoHorizontal(value) {
        if (this.photoEditor) {
            this.photoEditor.offsetX = parseInt(value);
            document.getElementById('horizontalValue').textContent = value + 'px';
            this.drawPhoto();
        }
    }

    // 更新照片垂直位置
    updatePhotoVertical(value) {
        if (this.photoEditor) {
            this.photoEditor.offsetY = parseInt(value);
            document.getElementById('verticalValue').textContent = value + 'px';
            this.drawPhoto();
        }
    }

    // 重置照片編輯器
    resetPhotoEditor() {
        if (this.photoEditor) {
            this.photoEditor.scale = 1;
            this.photoEditor.rotation = 0;
            this.photoEditor.offsetX = 0;
            this.photoEditor.offsetY = 0;
            
            document.getElementById('scaleSlider').value = 1;
            document.getElementById('rotateSlider').value = 0;
            document.getElementById('horizontalSlider').value = 0;
            document.getElementById('verticalSlider').value = 0;
            document.getElementById('scaleValue').textContent = '100%';
            document.getElementById('rotateValue').textContent = '0°';
            document.getElementById('horizontalValue').textContent = '0px';
            document.getElementById('verticalValue').textContent = '0px';
            
            this.drawPhoto();
        }
    }

    // 裁剪照片
    cropPhoto() {
        if (!this.photoEditor) return;
        
        const { canvas } = this.photoEditor;
        const croppedData = canvas.toDataURL('image/jpeg', 0.9);
        this.currentPhoto = croppedData;
        this.setPhotoPreview(croppedData);
        this.hidePhotoEditModal();
        this.showNotification('照片裁剪完成');
    }

    // 儲存編輯後的照片
    saveEditedPhoto() {
        this.cropPhoto();
    }

    // 隱藏照片編輯模態框
    hidePhotoEditModal() {
        document.getElementById('photoEditModal').classList.remove('show');
        this.photoEditor = null;
    }

    // 顯示會員詳情
    showMemberDetail(member) {
        this.currentMember = member;
        const modal = document.getElementById('memberDetailModal');
        const content = document.getElementById('memberDetailContent');
        
        const avatar = member.photo ? 
            `<img src="${member.photo}" alt="${member.name}" class="detail-avatar">` :
            `<div class="detail-avatar-placeholder">${member.name.charAt(0)}</div>`;
        
        content.innerHTML = `
            <div class="detail-header">
                ${avatar}
                <div class="detail-info">
                    <h2>${this.escapeHtml(member.name)}</h2>
                    <p>會員編號: ${member.id}</p>
                </div>
            </div>
            <div class="detail-fields">
                <div class="detail-field">
                    <label>電話</label>
                    <span>${this.escapeHtml(member.phone)}</span>
                </div>
                ${member.email ? `
                    <div class="detail-field">
                        <label>電子郵件</label>
                        <span>${this.escapeHtml(member.email)}</span>
                    </div>
                ` : ''}
                ${member.birthday ? `
                    <div class="detail-field">
                        <label>生日</label>
                        <span>${this.formatDate(member.birthday)}</span>
                    </div>
                ` : ''}
                ${member.address ? `
                    <div class="detail-field">
                        <label>地址</label>
                        <span>${this.escapeHtml(member.address)}</span>
                    </div>
                ` : ''}
                ${member.notes ? `
                    <div class="detail-field">
                        <label>備註</label>
                        <span>${this.escapeHtml(member.notes)}</span>
                    </div>
                ` : ''}
                <div class="detail-field">
                    <label>建立時間</label>
                    <span>${this.formatDateTime(member.createdAt)}</span>
                </div>
                ${member.updatedAt ? `
                    <div class="detail-field">
                        <label>更新時間</label>
                        <span>${this.formatDateTime(member.updatedAt)}</span>
                    </div>
                ` : ''}
            </div>
        `;
        
        modal.classList.add('show');
    }

    // 隱藏會員詳情模態框
    hideMemberDetailModal() {
        document.getElementById('memberDetailModal').classList.remove('show');
        this.currentMember = null;
    }

    // 編輯當前會員
    editCurrentMember() {
        if (this.currentMember) {
            const memberToEdit = {...this.currentMember};
            this.hideMemberDetailModal();
            this.showMemberModal(memberToEdit);
        }
    }

    // 刪除當前會員
    deleteCurrentMember() {
        if (this.currentMember) {
            this.showConfirmModal(
                '確認刪除',
                `確定要刪除會員「${this.currentMember.name}」嗎？此操作無法復原。`,
                async () => {
                    try {
                        this.showLoading();
                        await this.deleteMember(this.currentMember.id);
                        await this.loadMembers();
                        this.renderMembers();
                        this.hideMemberDetailModal();
                        this.updateStorageInfo();
                        this.showNotification('會員刪除成功');
                    } catch (error) {
                        console.error('刪除會員失敗:', error);
                        this.showNotification('刪除失敗，請重試', 'error');
                    } finally {
                        this.hideLoading();
                    }
                }
            );
        }
    }

    // 顯示導入模態框
    showImportModal() {
        const modal = document.getElementById('importExportModal');
        const title = document.getElementById('importExportTitle');
        const content = document.getElementById('importExportContent');
        
        title.textContent = '資料導入';
        content.innerHTML = `
            <div style="padding: 30px;">
                <div class="form-group">
                    <label>選擇導入檔案</label>
                    <input type="file" id="importFile" accept=".json,.xlsx" style="margin-bottom: 15px;">
                    <p style="color: #6c757d; font-size: 14px; margin: 0;">
                        支援格式：JSON、Excel (xlsx)
                    </p>
                </div>
                <div class="form-actions">
                    <button type="button" id="cancelImport" class="btn btn-secondary">取消</button>
                    <button type="button" id="executeImport" class="btn btn-primary">開始導入</button>
                </div>
            </div>
        `;
        
        // 添加事件監聽器
        document.getElementById('cancelImport').addEventListener('click', () => this.hideImportExportModal());
        document.getElementById('executeImport').addEventListener('click', () => this.executeImport());
        
        modal.classList.add('show');
    }

    // 顯示導出模態框
    showExportModal() {
        const modal = document.getElementById('importExportModal');
        const title = document.getElementById('importExportTitle');
        const content = document.getElementById('importExportContent');
        
        title.textContent = '資料導出';
        content.innerHTML = `
            <div style="padding: 30px;">
                <div class="form-group">
                    <label>選擇導出格式</label>
                    <select id="exportFormat" style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; margin-bottom: 15px;">
                        <option value="json">JSON 格式</option>
                        <option value="excel">Excel 格式</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="includePhotos" checked style="margin-right: 8px;">
                        包含照片資料
                    </label>
                </div>
                <div class="form-actions">
                    <button type="button" id="cancelExport" class="btn btn-secondary">取消</button>
                    <button type="button" id="executeExport" class="btn btn-primary">開始導出</button>
                </div>
            </div>
        `;
        
        // 添加事件監聽器
        document.getElementById('cancelExport').addEventListener('click', () => this.hideImportExportModal());
        document.getElementById('executeExport').addEventListener('click', () => this.executeExport());
        
        modal.classList.add('show');
    }

    // 隱藏導入/導出模態框
    hideImportExportModal() {
        document.getElementById('importExportModal').classList.remove('show');
    }

    // 執行導入
    async executeImport() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('請選擇要導入的檔案', 'error');
            return;
        }
        
        try {
            this.showLoading();
            
            let data;
            if (file.name.endsWith('.json')) {
                data = await this.readJSONFile(file);
            } else if (file.name.endsWith('.xlsx')) {
                data = await this.readExcelFile(file);
            } else {
                throw new Error('不支援的檔案格式，請使用 JSON 或 Excel (xlsx) 格式');
            }
            
            // 驗證資料格式
            if (!Array.isArray(data)) {
                throw new Error('檔案格式錯誤');
            }
            
            // 導入資料
            let importCount = 0;
            for (const memberData of data) {
                if (memberData.name && memberData.phone) {
                    memberData.createdAt = memberData.createdAt || new Date().toISOString();
                    memberData.updatedAt = new Date().toISOString();
                    await this.addMember(memberData);
                    importCount++;
                }
            }
            
            await this.loadMembers();
            this.renderMembers();
            this.hideImportExportModal();
            this.updateStorageInfo();
            this.showNotification(`成功導入 ${importCount} 筆會員資料`);
            
        } catch (error) {
            console.error('導入失敗:', error);
            this.showNotification('導入失敗：' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 執行導出
    async executeExport() {
        const format = document.getElementById('exportFormat').value;
        const includePhotos = document.getElementById('includePhotos').checked;
        
        try {
            this.showLoading();
            
            let exportData = [...this.members];
            if (!includePhotos) {
                exportData = exportData.map(member => {
                    const { photo, ...memberWithoutPhoto } = member;
                    return memberWithoutPhoto;
                });
            }
            
            if (format === 'json') {
                this.downloadJSON(exportData);
            } else if (format === 'excel') {
                await this.downloadExcel(exportData);
            }
            
            this.hideImportExportModal();
            this.showNotification('資料導出成功');
            
        } catch (error) {
            console.error('導出失敗:', error);
            this.showNotification('導出失敗：' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 讀取 JSON 檔案
    readJSONFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('JSON 檔案格式錯誤'));
                }
            };
            reader.onerror = () => reject(new Error('檔案讀取失敗'));
            reader.readAsText(file);
        });
    }

    // 讀取 Excel 檔案
    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // 讀取第一個工作表
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // 轉換為 JSON 格式
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (jsonData.length === 0) {
                        throw new Error('Excel 檔案為空');
                    }
                    
                    // 假設第一行是標題行
                    const headers = jsonData[0];
                    const members = [];
                    
                    // 處理數據行
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (row && row.length > 0 && row[0]) { // 確保行不為空且有姓名
                            const member = {
                                name: row[0] || '',
                                phone: row[1] || '',
                                email: row[2] || '',
                                birthday: row[3] || '',
                                address: row[4] || '',
                                notes: row[5] || ''
                            };
                            
                            // 只有姓名和電話都存在才添加
                            if (member.name.trim() && member.phone.trim()) {
                                members.push(member);
                            }
                        }
                    }
                    
                    resolve(members);
                } catch (error) {
                    reject(new Error('Excel 檔案格式錯誤：' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('檔案讀取失敗'));
            reader.readAsArrayBuffer(file);
        });
    }

    // 下載 JSON 檔案
    downloadJSON(data) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `會員資料_${this.formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 下載 Excel 檔案
    async downloadExcel(data) {
        try {
            // 準備工作表數據
            const headers = ['姓名', '電話', '電子郵件', '生日', '地址', '備註', '建立時間', '更新時間'];
            const worksheetData = [
                headers,
                ...data.map(member => [
                    member.name || '',
                    member.phone || '',
                    member.email || '',
                    member.birthday || '',
                    member.address || '',
                    member.notes || '',
                    this.formatDateTime(member.createdAt),
                    this.formatDateTime(member.updatedAt)
                ])
            ];
            
            // 創建工作簿和工作表
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            
            // 設置列寬
            const columnWidths = [
                { wch: 15 }, // 姓名
                { wch: 15 }, // 電話
                { wch: 25 }, // 電子郵件
                { wch: 12 }, // 生日
                { wch: 30 }, // 地址
                { wch: 20 }, // 備註
                { wch: 20 }, // 建立時間
                { wch: 20 }  // 更新時間
            ];
            worksheet['!cols'] = columnWidths;
            
            // 設置標題行樣式（如果需要的話）
            const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
            for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                if (!worksheet[cellAddress]) continue;
                
                // 設置標題行格式
                worksheet[cellAddress].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "E3F2FD" } },
                    alignment: { horizontal: "center" }
                };
            }
            
            // 添加工作表到工作簿
            XLSX.utils.book_append_sheet(workbook, worksheet, "會員資料");
            
            // 生成文件名
            const fileName = `會員資料_${this.formatDate(new Date()).replace(/\//g, '-')}.xlsx`;
            
            // 寫入並下載文件
            XLSX.writeFile(workbook, fileName, {
                compression: true,
                bookType: 'xlsx'
            });
            
        } catch (error) {
            console.error('Excel 導出錯誤:', error);
            throw new Error('Excel 導出失敗：' + error.message);
        }
    }

    // 創建備份
    async createBackup() {
        try {
            this.showLoading();
            
            const backupData = {
                members: this.members,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            // 儲存到 IndexedDB
            const transaction = this.db.transaction(['backups'], 'readwrite');
            const store = transaction.objectStore('backups');
            await new Promise((resolve, reject) => {
                const request = store.add(backupData);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            // 同時下載備份檔案
            this.downloadJSON(backupData);
            
            this.showNotification('備份創建成功');
            
        } catch (error) {
            console.error('備份失敗:', error);
            this.showNotification('備份失敗，請重試', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 更新存儲資訊
    async updateStorageInfo() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const used = estimate.usage || 0;
                const quota = estimate.quota || 0;
                const usedMB = (used / 1024 / 1024).toFixed(2);
                const quotaMB = (quota / 1024 / 1024).toFixed(2);
                const percentage = quota > 0 ? ((used / quota) * 100).toFixed(1) : 0;
                
                document.getElementById('storageInfo').textContent = 
                    `存儲使用量: ${usedMB}MB / ${quotaMB}MB (${percentage}%)`;
            } else {
                document.getElementById('storageInfo').textContent = 
                    `會員數量: ${this.members.length}`;
            }
        } catch (error) {
            document.getElementById('storageInfo').textContent = 
                `會員數量: ${this.members.length}`;
        }
    }

    // 初始化 PWA
    initPWA() {
        // 註冊 Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('Service Worker 註冊成功:', registration);
                })
                .catch(error => {
                    console.log('Service Worker 註冊失敗:', error);
                });
        }
        
        // 添加到主屏幕提示
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // 顯示安裝提示
            setTimeout(() => {
                if (deferredPrompt) {
                    this.showNotification('可以將此應用添加到主屏幕', 'info');
                }
            }, 5000);
        });
    }

    // 顯示確認對話框
    showConfirmModal(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        
        this.confirmAction = onConfirm;
        modal.classList.add('show');
    }

    // 隱藏確認對話框
    hideConfirmModal() {
        document.getElementById('confirmModal').classList.remove('show');
        this.confirmAction = null;
    }

    // 執行確認動作
    executeConfirmAction() {
        if (this.confirmAction) {
            this.confirmAction();
            this.hideConfirmModal();
        }
    }

    // 顯示載入指示器
    showLoading() {
        document.getElementById('loadingIndicator').style.display = 'flex';
    }

    // 隱藏載入指示器
    hideLoading() {
        document.getElementById('loadingIndicator').style.display = 'none';
    }

    // 顯示通知
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notificationMessage');
        
        messageElement.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'flex';
        
        // 自動隱藏
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    // 隱藏通知
    hideNotification() {
        document.getElementById('notification').style.display = 'none';
    }

    // 隱藏所有模態框
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    // 工具函數
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeCsv(text) {
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return '"' + text.replace(/"/g, '""') + '"';
        }
        return text;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW');
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('zh-TW');
    }
}

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    new MemberManagementSystem();
});