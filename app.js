let token = '';
const owner = 'kongxiyi';
const repo = 'vps-word';

document.getElementById('auth-btn').addEventListener('click', authenticate);
document.getElementById('new-file-btn').addEventListener('click', showNewFileForm);
document.getElementById('view-btn').addEventListener('click', () => viewFile(currentFilePath));
document.getElementById('edit-btn').addEventListener('click', () => editFile(currentFilePath));
document.getElementById('save-btn').addEventListener('click', () => saveFile(currentFilePath));
document.getElementById('close-btn').addEventListener('click', closeFile);
document.getElementById('save-new-file-btn').addEventListener('click', saveNewFile);
document.getElementById('cancel-new-file-btn').addEventListener('click', hideNewFileForm);

let currentFilePath = '';
let isCreatingNewFile = false;

function showLoading(show = true) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showMessage(message, isError = false) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = `message ${isError ? 'error' : 'success'}`;
    messageElement.style.display = 'block';
    setTimeout(() => {
        messageElement.style.display = 'none';
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
    showLoading();
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
        showMessage('无法获取文件列表: ' + error.message, true);
    } finally {
        showLoading(false);
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
                    <button onclick="openFile('${file.path}')">打开</button>
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
        document.getElementById('file-editor').readOnly = true;
        document.getElementById('save-btn').style.display = 'none';
        currentFilePath = filePath;
    } catch (error) {
        showMessage('无法打开文件: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

function viewFile(filePath) {
    document.getElementById('file-editor').readOnly = true;
    document.getElementById('save-btn').style.display = 'none';
}

function editFile(filePath) {
    document.getElementById('file-editor').readOnly = false;
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