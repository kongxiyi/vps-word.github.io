let token = '';
const owner = 'kongxiyi';
const repo = 'vps-word';

document.getElementById('auth-btn').addEventListener('click', authenticate);
document.getElementById('new-file-btn').addEventListener('click', createNewFile);
document.getElementById('save-btn').addEventListener('click', saveFile);

function authenticate() {
    token = document.getElementById('token-input').value;
    fetchFiles();
}

async function fetchFiles() {
    try {
        // 首先尝试获取 'files' 目录的内容
        let response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/files`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        
        // 如果 'files' 目录不存在，则获取根目录的内容
        if (!response.ok && response.status === 404) {
            response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
                headers: {
                    'Authorization': `token ${token}`
                }
            });
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const files = await response.json();
        displayFiles(files);
    } catch (error) {
        console.error('无法获取文件列表:', error);
        alert('获取文件列表失败。请检查您的访问令牌是否正确，以及是否有足够的权限。');
    }
}

function displayFiles(files) {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    files.forEach(file => {
        if (file.type === 'file') {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>${file.name}</span>
                <button onclick="viewFile('${file.path}')">查看</button>
                <button onclick="editFile('${file.path}')">编辑</button>
                <button onclick="deleteFile('${file.path}')">删除</button>
            `;
            fileList.appendChild(fileItem);
        }
    });
}

// 修改其他函数以使用 file.path 而不是 fileName

async function viewFile(filePath) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        const fileData = await response.json();
        const content = atob(fileData.content);
        document.getElementById('file-editor').value = content;
        document.getElementById('save-btn').style.display = 'inline';
        document.getElementById('save-btn').onclick = () => saveFile(filePath);
    } catch (error) {
        console.error('无法查看文件:', error);
        alert('查看文件失败。');
    }
}

async function saveFile(filePath) {
    const content = document.getElementById('file-editor').value;
    try {
        const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        const fileData = await fileResponse.json();
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update ${filePath}`,
                content: btoa(unescape(encodeURIComponent(content))),
                sha: fileData.sha
            })
        });
        if (response.ok) {
            alert('文件已保存');
            fetchFiles();
        } else {
            throw new Error('保存文件失败');
        }
    } catch (error) {
        console.error('无法保存文件:', error);
        alert('保存文件失败。');
    }
}

async function createNewFile() {
    const fileName = document.getElementById('new-file-name').value;
    if (!fileName) {
        alert('请输入文件名');
        return;
    }
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Create ${fileName}`,
                content: btoa('')
            })
        });
        if (response.ok) {
            alert('文件已创建');
            fetchFiles();
        } else {
            throw new Error('创建文件失败');
        }
    } catch (error) {
        console.error('无法创建文件:', error);
        alert('创建文件失败。');
    }
}

async function deleteFile(filePath) {
    if (!confirm(`确定要删除 ${filePath} 吗？`)) return;
    try {
        const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        const fileData = await fileResponse.json();
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Delete ${filePath}`,
                sha: fileData.sha
            })
        });
        if (response.ok) {
            alert('文件已删除');
            fetchFiles();
        } else {
            throw new Error('删除文件失败');
        }
    } catch (error) {
        console.error('无法删除文件:', error);
        alert('删除文件失败。');
    }
}

// ... 其他代码保持不变 ...