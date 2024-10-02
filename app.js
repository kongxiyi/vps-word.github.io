let token = '';
const owner = 'kongxiyi';
const repo = 'vps-word';

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
});

let currentFilePath = '';
let isCreatingNewFile = false;

function addEventListenerSafely(id, event, handler, isQuery = false) {
    const element = isQuery ? document.querySelector(id) : document.getElementById(id);
    if (element) {
        element.addEventListener(event, handler);
    } else {
        console.warn(`Element with ${isQuery ? 'selector' : 'id'} "${id}" not found`);
    }
}

function showLoading(show = true) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showMessage(message, isError = false) {
    const notificationElement = document.getElementById('notification');
    const contentElement = notificationElement.querySelector('.notification-content');
    contentElement.textContent = message;
    notificationElement.className = `notification ${isError ? 'error' : 'success'}`;
    notificationElement.classList.add('show');
    
    // 清除之前的定时器（如果有的话）
    if (notificationElement.timeoutId) {
        clearTimeout(notificationElement.timeoutId);
    }
    
    // 设置新的定时器
    notificationElement.timeoutId = setTimeout(() => {
        notificationElement.classList.remove('show');
    }, 5000);

    if (isError) {
        showErrorAlert(message);
    }
}

function showErrorAlert(errorMessage) {
    alert(`错误: ${errorMessage}`);
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
        document.getElementById('user-info').textContent = `欢迎，${userData.login}！`;
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

async function fetchFiles() {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/files`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const files = await response.json();
        displayFiles(files);
    } catch (error) {
        throw new Error('无法获取文件列表: ' + error.message);
    }
}

function displayFiles(files) {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    files.forEach(file => {
        if (file.type === 'file') {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            const lastModified = new Date(file.last_modified).toLocaleString();
            fileItem.innerHTML = `
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                    <span class="file-date">${lastModified}</span>
                </div>
                <div class="file-actions">
                    <button onclick="openFile('${file.path}')">查看</button>
                    <button onclick="deleteFile('${file.path}')">删除</button>
                </div>
            `;
            fileList.appendChild(fileItem);
        }
    });
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
        const fullPath = filePath.startsWith('files/') ? filePath : `files/${filePath}`;
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        const fileData = await response.json();
        const content = atob(fileData.content);
        document.getElementById('file-editor').value = content;
        document.getElementById('file-content').style.display = 'block';
        viewFile(filePath);  // 默认以查看模式打开
        currentFilePath = filePath;
    } catch (error) {
        showMessage('无法打开文件: ' + error.message, true);
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
}

function closeFile() {
    document.getElementById('file-content').style.display = 'none';
    currentFilePath = '';
    document.getElementById('view-btn').style.display = 'inline-block';
    document.getElementById('edit-btn').style.display = 'inline-block';
}

function showNewFileForm() {
    document.getElementById('new-file-form').style.display = 'block';
    document.getElementById('new-file-name').value = '';
    document.getElementById('new-file-content').value = '';
}

function hideNewFileForm() {
    document.getElementById('new-file-form').style.display = 'none';
}

async function saveNewFile() {
    const fileName = document.getElementById('new-file-name').value.trim();
    const content = document.getElementById('new-file-content').value;
    if (!fileName) {
        showMessage('请输入文件名', true);
        return;
    }
    showLoading();
    try {
        const fullPath = `files/${fileName}`;
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Create ${fileName}`,
                content: btoa(unescape(encodeURIComponent(content)))
            })
        });
        if (response.ok) {
            showMessage('新文件已创建并保存');
            hideNewFileForm();
            fetchFiles();
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
    try {
        const fullPath = filePath.startsWith('files/') ? filePath : `files/${filePath}`;
        
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
                    content: btoa(unescape(encodeURIComponent(content)))
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
                    content: btoa(unescape(encodeURIComponent(content))),
                    sha: fileData.sha
                })
            });
            if (response.ok) {
                showMessage('文件已保存');
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

async function deleteFile(filePath) {
    if (!confirm(`确定要删除 ${filePath} 吗？`)) return;
    showLoading();
    try {
        const fullPath = filePath.startsWith('files/') ? filePath : `files/${filePath}`;
        
        const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
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
        if (response.ok) {
            showMessage('文件已删除');
            fetchFiles();
            closeFile();
        } else {
            throw new Error('删除文件失败');
        }
    } catch (error) {
        showMessage('无法删除文件: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

async function refreshFiles() {
    showLoading();
    try {
        await fetchFiles();
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