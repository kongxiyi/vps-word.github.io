const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmCGKxrlsfGHOwTOL51Xk
pP9SNaBv2gpMNpxX3+W47uatEGCKBCkQ/skqgvn4cNxrPiW+qoV1QQzhZbxJztz7
Te8qgIp59Z+tbHaOP6L/p+jnKJxrDxyWHstJ7kT/MwDy97xrN3C1ktDcTZML2sM2
iBW+nh3WM/Ks+FIKW9KkvYNZFsJ3Eu3zzdR9oZHq/a87blhnQZPUQzLy4cc32fIn
3Gwx3ymOA4xGNjcLz5XAQEnnlnsnIok2dhE6SjNIDjMZ2CsgFYTc8fqkCo4E09rR
DrG87bmknK5QIiyNEmcsMjiXJcUrquhBDmOQ8HcDE3IQMG7F9vK8Z2rUAZl4N5Qy
hQIDAQAB
-----END PUBLIC KEY-----`;

let privateKey = '';

let token = '';
const owner = 'kongxiyi';
const repo = 'vps-word.github.io';

let encryptionKey = '';
let isEditing = false;

let originalContent = '';

const ROOT_FOLDER = 'files';

const SVG_ICONS = {
    folder: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    file: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>',
    chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
    chevronDown: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'
};

document.addEventListener('DOMContentLoaded', function() {
    addEventListenerSafely('auth-btn', 'click', authenticate);
    addEventListenerSafely('new-file-btn', 'click', showNewFileForm);
    addEventListenerSafely('view-btn', 'click', () => viewFile(currentFilePath));
    addEventListenerSafely('edit-btn', 'click', () => editFile(currentFilePath));
    addEventListenerSafely('save-btn', 'click', () => saveFile(currentFilePath));
    addEventListenerSafely('close-btn', 'click', closeFile);
    addEventListenerSafely('save-new-file-btn', 'click', saveNewFile);
    addEventListenerSafely('cancel-new-file-btn', 'click', hideNewFileForm);
    addEventListenerSafely('refresh-btn', 'click', refreshFiles);
    addEventListenerSafely('.notification-close', 'click', closeNotification, true);

    // 添加批量删除按钮的事件监听器
    addEventListenerSafely('batch-delete-btn', 'click', batchDeleteFiles);
});

let currentFilePath = '';
let isCreatingNewFile = false;

let currentPath = ROOT_FOLDER;

let fileTree = {}; // 初始化为空对象

let currentForm = null;

function addEventListenerSafely(id, event, handler, isQuery = false) {
    const element = isQuery ? document.querySelector(id) : document.getElementById(id);
    if (element) {
        element.addEventListener(event, handler);
    } else {
        console.warn(`Element with ${isQuery ? 'selector' : 'id'} "${id}" not found`);
    }
}

function showLoading(show = true) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showMessage(message, isError = false, duration = 5000) {
    const notificationElement = document.getElementById('notification');
    const contentElement = notificationElement.querySelector('.notification-content');
    contentElement.textContent = message;
    notificationElement.className = `notification ${isError ? 'error' : 'success'}`;
    notificationElement.classList.add('show');
    
    // 清除之前的定时器（如果有的话）
    if (notificationElement.timeoutId) {
        clearTimeout(notificationElement.timeoutId);
    }
    
    if (duration > 0) {
        notificationElement.timeoutId = setTimeout(() => {
            notificationElement.classList.remove('show');
        }, duration);
    }

    if (isError) {
        showErrorAlert(message);
    }
}

function showErrorAlert(errorMessage) {
    alert(`错误: ${errorMessage}`);
}

// 替换原有的加密和解密函数
function encrypt(content) {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKey);
    return encrypt.encrypt(content);
}

function decrypt(ciphertext) {
    if (!privateKey) {
        throw new Error('请先输入私钥');
    }
    const decrypt = new JSEncrypt();
    decrypt.setPrivateKey(privateKey);
    const decrypted = decrypt.decrypt(ciphertext);
    if (decrypted === null) {
        throw new Error('解密失败，请检查私钥是否正确');
    }
    return decrypted;
}

// 修改 showKeyDialog 函数
function showKeyDialog() {
    return new Promise((resolve, reject) => {
        const dialog = document.getElementById('key-dialog');
        const submitButton = document.getElementById('submit-key');
        const keyInput = document.getElementById('key-input');
        const closeBtn = dialog.querySelector('.close-btn');

        dialog.style.display = 'block';

        submitButton.onclick = () => {
            const key = keyInput.value;
            if (key) {
                privateKey = key;
                dialog.style.display = 'none';
                keyInput.value = '';
                resolve();
            } else {
                reject(new Error('请输入有效的私钥'));
            }
        };

        closeBtn.onclick = () => {
            dialog.style.display = 'none';
            keyInput.value = '';
            reject(new Error('用户取消了操作'));
        };

        // 点击对话框外部区域关闭对话框
        window.onclick = (event) => {
            if (event.target === dialog) {
                dialog.style.display = 'none';
                keyInput.value = '';
                reject(new Error('用户取消了操作'));
            }
        };
    });
}

async function authenticate() {
    token = document.getElementById('token-input').value.trim();
    if (!token) {
        showMessage('请输入有效的GitHub个人访问令牌', true);
        return;
    }
    showLoading();
    try {
        const response = await fetch(`https://api.github.com/user`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (!response.ok) {
            throw new Error('认证失败');
        }
        const userData = await response.json();
        // document.getElementById('user-info').textContent = `欢迎，${userData.login}！`;
        document.getElementById('user-info').textContent = `当你创建、更新、删除文件或文件夹时，如果文件未显示，请耐心等待0~3min，这或许是因为GitHub的原因...（待解决...准备时候本地缓存，反正GitHub是有的，只是请求报文还没反应过来，报文又不能加入no-cache）`;
        document.getElementById('user-info').style.display = 'block';
        document.getElementById('file-actions').style.display = 'block';
        document.getElementById('auth').style.display = 'none';
        showMessage('认证成功！');
        
        fetchFiles();
    } catch (error) {
        showMessage('认证失败：' + error.message, true);
    } finally {
        showLoading(false);
    }
}

async function fetchFiles(path = currentPath) {
    showLoading(true);
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.status === 404) {
            displayNoFilesMessage();
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const files = await response.json();
        fileTree = buildFileTree(files, path); // 构建文件树
        displayFiles(files);
    } catch (error) {
        showMessage('无法获取文件列表: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

function displayFiles(files) {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';

    // 添加返回上一级按钮
    if (currentPath !== ROOT_FOLDER) {
        const backButton = document.createElement('div');
        backButton.className = 'file-item back-button';
        backButton.innerHTML = '<span class="folder-name"><i class="fas fa-arrow-left"></i> 返回上一级</span>';
        backButton.addEventListener('click', () => {
            currentPath = currentPath.split('/').slice(0, -1).join('/') || ROOT_FOLDER;
            fetchFiles(currentPath);
        });
        fileList.appendChild(backButton);
    }

    // 显示可点击的当前路径
    const pathDisplay = document.createElement('div');
    pathDisplay.className = 'current-path';
    const pathParts = currentPath.split('/');
    let pathHtml = '当前路径: ';
    let accumulatedPath = '';
    pathParts.forEach((part, index) => {
        accumulatedPath += (index === 0 ? '' : '/') + part;
        pathHtml += `<span class="path-part" data-path="${accumulatedPath}">${part}</span>`;
        if (index < pathParts.length - 1) {
            pathHtml += ' / ';
        }
    });
    pathDisplay.innerHTML = pathHtml;
    pathDisplay.addEventListener('click', (e) => {
        if (e.target.classList.contains('path-part')) {
            const newPath = e.target.getAttribute('data-path');
            currentPath = newPath;
            fetchFiles(newPath);
        }
    });
    fileList.appendChild(pathDisplay);

    files.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
    });

    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        const icon = file.type === 'dir' ? '<i class="fas fa-folder"></i>' : '<i class="fas fa-file"></i>';
        const size = file.type === 'file' ? formatFileSize(file.size) : '';
        const lastUpdated = new Date(file.updated_at).toLocaleString();
        fileItem.innerHTML = `
            ${file.type === 'file' ? `<input type="checkbox" class="file-checkbox" data-path="${file.path}">` : ''}
            <span class="${file.type === 'dir' ? 'folder-name' : 'file-name'}">
                ${icon}
                ${file.name}
            </span>
            <span class="file-info">
                ${size ? `<span class="file-size">${size}</span>` : ''}
                <span class="file-date">${lastUpdated}</span>
            </span>
            <div class="file-actions">
                ${file.type === 'dir' 
                    ? `<button onclick="openFolder('${file.path}')">打开</button>
                       <button onclick="deleteFolder('${file.path}')">删除</button>`
                    : `<button onclick="openFile('${file.path}')">查看</button>
                       <button onclick="deleteFile('${file.path}')">删除</button>`
                }
            </div>
        `;
        
        if (file.type === 'dir') {
            fileItem.querySelector('.folder-name').addEventListener('click', () => openFolder(file.path));
        } else {
            fileItem.querySelector('.file-name').addEventListener('click', () => openFile(file.path));
        }

        fileList.appendChild(fileItem);
    });
}

function openFolder(path) {
    currentPath = path;
    fetchFiles(path);
}

function buildFileTree(files, basePath) {
    const tree = {};
    files.forEach(file => {
        if (file.type === 'dir') {
            tree[file.name] = { type: 'dir', path: file.path, children: {} };
        } else {
            tree[file.name] = { type: 'file', path: file.path };
        }
    });
    return tree;
}

function displayFileTree(tree, parentElement = document.getElementById('file-list'), path = '') {
    parentElement.innerHTML = ''; // 清空现有内容
    
    // 将项目分为文件夹和文件
    const folders = [];
    const files = [];
    
    for (const [name, item] of Object.entries(tree)) {
        if (item.type === 'dir') {
            folders.push({ name, item });
        } else {
            files.push({ name, item });
        }
    }
    
    // 对文件夹和文件分别进行字母排序
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    
    // 先显示文件夹
    for (const { name, item } of folders) {
        const element = document.createElement('div');
        element.className = 'tree-item';
        const fullPath = path ? `${path}/${name}` : name;
        
        element.innerHTML = `
            <span class="folder-name">
                ${SVG_ICONS.folder}
                ${name}
                ${SVG_ICONS.chevronRight}
            </span>
            <div class="folder-content" style="display: none;"></div>
        `;
        const folderName = element.querySelector('.folder-name');
        const folderContent = element.querySelector('.folder-content');
        const chevron = folderName.querySelector('svg:last-child');
        
        folderName.addEventListener('click', () => {
            if (folderContent.style.display === 'none') {
                folderContent.style.display = 'block';
                chevron.outerHTML = SVG_ICONS.chevronDown;
                if (folderContent.children.length === 0) {
                    displayFileTree(item.children, folderContent, fullPath);
                }
            } else {
                folderContent.style.display = 'none';
                chevron.outerHTML = SVG_ICONS.chevronRight;
            }
        });
        
        parentElement.appendChild(element);
    }
    
    // 然后显示文件
    for (const { name, item } of files) {
        const element = document.createElement('div');
        element.className = 'tree-item';
        const fullPath = path ? `${path}/${name}` : name;
        
        element.innerHTML = `
            <span class="file-name">
                ${SVG_ICONS.file}
                ${name}
            </span>
            <div class="file-actions">
                <button onclick="openFile('${fullPath}')">查看</button>
                <button onclick="deleteFile('${fullPath}')">删除</button>
            </div>
        `;
        
        parentElement.appendChild(element);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function openFile(filePath) {
    showLoading();
    try {
        await showKeyDialog(); // 每次打开文件都请求密钥
        const fullPath = filePath.startsWith(ROOT_FOLDER + '/') ? filePath : `${ROOT_FOLDER}/${filePath}`;
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        const fileData = await response.json();
        const encodedContent = fileData.content;
        const decodedContent = atob(encodedContent);
        
        let content;
        try {
            content = decrypt(decodedContent);
        } catch (decryptError) {
            showMessage('解密失败：' + decryptError.message, true);
            content = decodedContent;
        }

        document.getElementById('file-editor').value = content;
        originalContent = content; // 保存原始内容
        document.getElementById('file-content').style.display = 'block';
        viewFile(filePath);  // 默认以查看模式打开
        currentFilePath = filePath;
        isEditing = false;
    } catch (error) {
        if (error.message !== '用户取消了操作') {
            showMessage('无法打开文件: ' + error.message, true);
        }
    } finally {
        showLoading(false);
    }
}

function viewFile(filePath) {
    document.getElementById('file-editor').readOnly = true;
    document.getElementById('file-editor').classList.add('view-mode');
    document.getElementById('file-editor').classList.remove('edit-mode');
    document.getElementById('file-content').classList.add('view-mode');
    document.getElementById('file-content').classList.remove('edit-mode');
    document.getElementById('view-btn').style.display = 'none';
    document.getElementById('edit-btn').style.display = 'inline-block';
    document.getElementById('save-btn').style.display = 'none';
    isEditing = false;
}

function editFile(filePath) {
    document.getElementById('file-editor').readOnly = false;
    document.getElementById('file-editor').classList.remove('view-mode');
    document.getElementById('file-editor').classList.add('edit-mode');
    document.getElementById('file-content').classList.remove('view-mode');
    document.getElementById('file-content').classList.add('edit-mode');
    document.getElementById('view-btn').style.display = 'inline-block';
    document.getElementById('edit-btn').style.display = 'none';
    document.getElementById('save-btn').style.display = 'inline-block';
    isEditing = true;
}

function closeFile() {
    document.getElementById('file-content').style.display = 'none';
    currentFilePath = '';
    document.getElementById('view-btn').style.display = 'inline-block';
    document.getElementById('edit-btn').style.display = 'inline-block';
    isEditing = false;
}

function showForm(formType) {
    hideAllForms();
    const formId = formType === 'file' ? 'new-file-form' : 'new-folder-form';
    let form = document.getElementById(formId);
    
    if (!form) {
        form = createForm(formType);
        document.getElementById('file-actions').appendChild(form);
    }
    
    form.style.display = 'block';
}

function hideAllForms() {
    const forms = ['new-file-form', 'new-folder-form'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.style.display = 'none';
            // 清空表单中的输入
            form.querySelectorAll('input, textarea').forEach(input => {
                input.value = '';
            });
            // 重置选择框到默认选项
            form.querySelectorAll('select').forEach(select => {
                select.selectedIndex = 0;
            });
        }
    });
    currentForm = null;
}

function createForm(formType) {
    const form = document.createElement('div');
    form.id = formType === 'file' ? 'new-file-form' : 'new-folder-form';
    
    if (formType === 'file') {
        form.innerHTML = `
            <select id="new-file-parent-select">
                <option value="${ROOT_FOLDER}">根目录</option>
                ${generateFolderOptions(ROOT_FOLDER)}
            </select>
            <input type="text" id="new-file-name-input" placeholder="新文件名">
            <textarea id="new-file-content-textarea" placeholder="文件内容"></textarea>
            <button id="save-new-file-btn">保存新文件</button>
            <button id="cancel-new-file-btn">取消</button>
        `;
        form.querySelector('#save-new-file-btn').addEventListener('click', saveNewFile);
        form.querySelector('#cancel-new-file-btn').addEventListener('click', () => hideForm('file'));
    } else {
        form.innerHTML = `
            <select id="new-folder-parent-select">
                <option value="${ROOT_FOLDER}">根目录</option>
                ${generateFolderOptions(ROOT_FOLDER)}
            </select>    
            <input type="text" id="new-folder-name-input" placeholder="新文件夹名称">
            <button id="create-new-folder-btn">创建</button>
            <button id="cancel-new-folder-btn">取消</button>
        `;
        form.querySelector('#create-new-folder-btn').addEventListener('click', createNewFolder);
        form.querySelector('#cancel-new-folder-btn').addEventListener('click', () => hideForm('folder'));
    }
    
    return form;
}

function hideForm(formType) {
    const formId = formType === 'file' ? 'new-file-form' : 'new-folder-form';
    const form = document.getElementById(formId);
    if (form) {
        form.style.display = 'none';
    }
}

async function showNewFileForm() {
    if (currentForm === 'file') {
        return;
    }
    hideAllForms();
    const existingForm = document.getElementById('new-file-form');
    if (existingForm) {
        existingForm.remove(); // 移除现有的表单
    }
    const form = document.createElement('div');
    form.id = 'new-file-form';
    form.innerHTML = `
        <div class="form-group">
            <label for="new-file-parent-display">当前路径：</label>
            <input type="text" id="new-file-parent-display" value="${currentPath}" readonly>
        </div>
        <div class="form-group">
            <label for="new-file-name-input">文件名：</label>
            <input type="text" id="new-file-name-input" placeholder="输入文件名">
        </div>
        <div class="form-group">
            <label for="new-file-content-textarea">文件内容：</label>
            <textarea id="new-file-content-textarea" placeholder="输入文件内容"></textarea>
        </div>
        <button id="save-new-file-btn">保存新文件</button>
        <button id="cancel-new-file-btn">取消</button>
    `;
    document.getElementById('file-actions').appendChild(form);
    document.getElementById('save-new-file-btn').addEventListener('click', saveNewFile);
    document.getElementById('cancel-new-file-btn').addEventListener('click', hideAllForms);
    form.style.display = 'block';
    currentForm = 'file';
}

async function showNewFolderForm() {
    if (currentForm === 'folder') {
        return;
    }
    hideAllForms();
    const existingForm = document.getElementById('new-folder-form');
    if (existingForm) {
        existingForm.remove(); // 移除现有的表单
    }
    const form = document.createElement('div');
    form.id = 'new-folder-form';
    form.innerHTML = `
        <div class="form-group">
            <label for="new-folder-parent-display">当前路径：</label>
            <input type="text" id="new-folder-parent-display" value="${currentPath}" readonly>
        </div>
        <div class="form-group">
            <label for="new-folder-name-input">文件夹名：</label>
            <input type="text" id="new-folder-name-input" placeholder="输入文件夹名称">
        </div>
        <button id="create-new-folder-btn">创建文件夹</button>
        <button id="cancel-new-folder-btn">取消</button>
    `;
    document.getElementById('file-actions').appendChild(form);
    document.getElementById('create-new-folder-btn').addEventListener('click', createNewFolder);
    document.getElementById('cancel-new-folder-btn').addEventListener('click', hideAllForms);
    form.style.display = 'block';
    currentForm = 'folder';
}

async function saveNewFile() {
    const fileName = document.getElementById('new-file-name-input').value.trim();
    const content = document.getElementById('new-file-content-textarea').value;
    if (!fileName) {
        showMessage('请输入文件名', true);
        return;
    }
    showLoading();
    try {
        const encryptedContent = encrypt(content);
        const fullPath = `${currentPath}/${fileName}`;
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Create ${fileName}`,
                content: btoa(unescape(encodeURIComponent(encryptedContent)))
            })
        });
        if (response.ok) {
            showMessage('新文件已创建并保存（已加密），请注意文件显示更新需要等待0~3min');
            hideAllForms(); // 自动关闭表单
            fetchFiles(currentPath);
        } else {
            throw new Error('创建文件失败');
        }
    } catch (error) {
        showMessage('无法创建文件: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

async function saveFile(filePath) {
    showLoading();
    const content = document.getElementById('file-editor').value;
    
    // 检查内容是否发生变化
    if (content === originalContent) {
        showMessage('文件内容未发生变化，无需保存', false);
        showLoading(false);
        return;
    }
    
    try {
        if (!isEditing) {
            await showKeyDialog();
        }
        let encryptedContent;
        try {
            encryptedContent = encrypt(content);
        } catch (encryptError) {
            showMessage('加密失败，将保存原始内容', true);
            encryptedContent = content;
        }
        const fullPath = filePath.startsWith(ROOT_FOLDER + '/') ? filePath : `${ROOT_FOLDER}/${filePath}`;
        
        if (isCreatingNewFile) {
            // 创建新文件
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: `Create ${filePath}`,
                    content: btoa(unescape(encodeURIComponent(encryptedContent)))
                })
            });
            if (response.ok) {
                showMessage('新文件已创建并保存');
                isCreatingNewFile = false;
                document.getElementById('new-file-name').value = '';
            } else {
                throw new Error('创建文件失败');
            }
        } else {
            // 更新现有文件
            const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            const fileData = await fileResponse.json();
            
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: `Update ${filePath}`,
                    content: btoa(unescape(encodeURIComponent(encryptedContent))),
                    sha: fileData.sha
                })
            });
            if (response.ok) {
                showMessage('文件已保存');
                originalContent = content; // 更新原始内容
            } else {
                throw new Error('保存文件失败');
            }
        }
        fetchFiles();
        viewFile(filePath);
    } catch (error) {
        showMessage('无法保存文件: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

async function deleteFile(filePath, showConfirm = true) {
    if (showConfirm && !confirm(`确定要删除 ${filePath} 吗？`)) return;
    showLoading();
    try {
        const fullPath = filePath.startsWith(ROOT_FOLDER + '/') ? filePath : `${ROOT_FOLDER}/${filePath}`;
        
        const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!fileResponse.ok) {
            if (fileResponse.status === 404) {
                console.log(`File not found: ${fullPath}`);
                return; // 如果文件不存在，直接返回
            }
            throw new Error(`Failed to fetch file info: ${fileResponse.statusText}`);
        }

        const fileData = await fileResponse.json();
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Delete ${filePath}`,
                sha: fileData.sha
            })
        });
        if (!response.ok) {
            throw new Error(`删除文件失败: ${response.statusText}`);
        }
        if (showConfirm) {
            showMessage('文件已删除');
            fetchFiles();
            closeFile();
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        if (showConfirm) {
            showMessage('无法删除文件: ' + error.message, true);
        }
    } finally {
        showLoading(false);
    }
}

async function refreshFiles() {
    showLoading(true);
    try {
        const files = await fetchFiles();
        showMessage('文件列表已刷新');
    } catch (error) {
        showMessage('刷新文件列表失败: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

// 添加关闭通知的函数
function closeNotification() {
    const notificationElement = document.getElementById('notification');
    notificationElement.classList.remove('show');
    if (notificationElement.timeoutId) {
        clearTimeout(notificationElement.timeoutId);
    }
}

function displayNoFilesMessage() {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '<div class="no-files-message">尚未有文件</div>';
}

async function createNewFolder() {
    const folderName = document.getElementById('new-folder-name-input').value.trim();
    if (!folderName) {
        showMessage('请输入文件夹名称', true);
        return;
    }
    
    try {
        const fullPath = `${currentPath}/${folderName}/.gitkeep`;
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Create folder ${folderName}`,
                content: btoa('') // 创建一个空的 .gitkeep 文件来表示文件夹
            })
        });
        
        if (response.ok) {
            showMessage(`文件夹 ${folderName} 已创建`);
            hideAllForms(); // 自动关闭表单
            fetchFiles(currentPath); // 刷新文件列表
        } else {
            throw new Error('创建文件夹失败');
        }
    } catch (error) {
        showMessage('无法创建文件夹: ' + error.message, true);
    }
}

function generateFolderOptions(tree = fileTree, path = ROOT_FOLDER, prefix = '') {
    let options = '';
    for (const [name, item] of Object.entries(tree)) {
        if (item.type === 'dir') {
            const fullPath = `${path}/${name}`;
            options += `<option value="${fullPath}">${prefix}${name}</option>`;
            if (item.children) {
                options += generateFolderOptions(item.children, fullPath, prefix + '-- ');
            }
        }
    }
    return options;
}

function getFilesInPath(path) {
    if (!fileTree) return null;
    const parts = path.split('/').filter(p => p !== ROOT_FOLDER);
    let currentLevel = fileTree;
    for (const part of parts) {
        if (currentLevel[part] && currentLevel[part].type === 'dir') {
            currentLevel = currentLevel[part].children;
        } else {
            return null;
        }
    }
    return currentLevel;
}

function hideNewFileForm() {
    hideForm('file');
}

function hideNewFolderForm() {
    hideForm('folder');
}

// 添加删除文件夹的函数
async function deleteFolder(folderPath) {
    if (!confirm(`确定要删除文件夹 ${folderPath} 及其所有内容吗？`)) return;
    showLoading();
    try {
        await deleteFolderRecursive(folderPath);
        showMessage('文件夹已删除');
        fetchFiles(currentPath);
    } catch (error) {
        showMessage('无法删除文件夹: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

// 递归删除文件夹及其内容
async function deleteFolderRecursive(folderPath) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}`, {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    const contents = await response.json();

    for (const item of contents) {
        if (item.type === 'file') {
            await deleteFile(item.path, false);
        } else if (item.type === 'dir') {
            await deleteFolderRecursive(item.path);
        }
    }

    // 尝试删除 .gitkeep 文件，但如果失败也不中断过程
    try {
        const gitkeepPath = `${folderPath}/.gitkeep`;
        await deleteFile(gitkeepPath, false);
    } catch (error) {
        console.log(`Failed to delete .gitkeep in ${folderPath}: ${error.message}`);
    }
}

async function updateFileTree() {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${ROOT_FOLDER}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const files = await response.json();
        fileTree = buildFileTree(files, ROOT_FOLDER);
    } catch (error) {
        console.error('Error updating file tree:', error);
        showMessage('无法更新文件树: ' + error.message, true);
    }
}

async function batchDeleteFiles() {
    const checkboxes = document.querySelectorAll('.file-checkbox:checked');
    if (checkboxes.length === 0) {
        showMessage('请选择要删除的文件', true);
        return;
    }

    if (!confirm(`确定要删除选中的 ${checkboxes.length} 个文件吗？`)) return;

    showLoading();
    let successCount = 0;
    let failCount = 0;

    for (const checkbox of checkboxes) {
        const path = checkbox.getAttribute('data-path');
        try {
            await deleteFile(path, false);
            successCount++;
        } catch (error) {
            console.error(`Error deleting ${path}:`, error);
            failCount++;
        }
    }

    showMessage(`批量删除完成。成功：${successCount}，失败：${failCount}`);
    fetchFiles(currentPath);
    showLoading(false);
}