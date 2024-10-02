const owner = 'kongxiyi';
const repo = 'vps-word';
const path = './files'; // 存储文件的目录
let accessToken = ''; // 移除了硬编码的访问令牌

// 初始化
async function init() {
    // 尝试从 localStorage 获取令牌
    accessToken = localStorage.getItem('github_token');
    if (!accessToken) {
        accessToken = prompt('请输入您的GitHub个人访问令牌:');
        if (!accessToken) {
            alert('没有提供访问令牌，应用无法正常工作。');
            return;
        }
        // 将令牌保存到 localStorage
        localStorage.setItem('github_token', accessToken);
    }
    await getFileList();
}

// 获取文件列表
async function getFileList() {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: { 'Authorization': `token ${accessToken}` }
        });
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const files = await response.json();
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = '';
        files.forEach(file => {
            if (file.type === 'file') {
                const fileItem = document.createElement('div');
                fileItem.innerHTML = `
                    <span>${file.name}</span>
                    <button onclick="openFile('${file.name}')">打开</button>
                    <button onclick="deleteFile('${file.name}')">删除</button>
                `;
                fileList.appendChild(fileItem);
            }
        });
    } catch (error) {
        console.error('Error fetching file list:', error);
        alert('获取文件列表失败。可能是访问令牌无效，请尝试重新输入。');
        localStorage.removeItem('github_token');
        init();
    }
}

// 打开文件
async function openFile(fileName) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}/${fileName}`, {
            headers: { 'Authorization': `token ${accessToken}` }
        });
        const file = await response.json();
        const content = atob(file.content);
        const key = prompt('请输入解密密钥:');
        try {
            const decryptedContent = CryptoJS.AES.decrypt(content, key).toString(CryptoJS.enc.Utf8);
            document.getElementById('editor').value = decryptedContent;
            document.getElementById('editor').style.display = 'block';
            document.getElementById('save').style.display = 'block';
            document.getElementById('save').onclick = () => saveFile(fileName, key, file.sha);
        } catch (error) {
            alert('解密失败,请检查密钥是否正确');
        }
    } catch (error) {
        console.error('Error opening file:', error);
        alert('打开文件失败。');
    }
}

// 保存文件
async function saveFile(fileName, key, sha) {
    const content = document.getElementById('editor').value;
    const encryptedContent = CryptoJS.AES.encrypt(content, key).toString();
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}/${fileName}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `token ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update ${fileName}`,
                content: btoa(encryptedContent),
                sha: sha
            })
        });
        if (response.ok) {
            alert('文件已保存');
            getFileList();
        } else {
            throw new Error('保存文件失败');
        }
    } catch (error) {
        console.error('Error saving file:', error);
        alert('保存文件失败。');
    }
}

// 删除文件
async function deleteFile(fileName) {
    if (confirm(`确定要删除 ${fileName} 吗?`)) {
        try {
            const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}/${fileName}`, {
                headers: { 'Authorization': `token ${accessToken}` }
            });
            const fileData = await fileResponse.json();
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}/${fileName}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `token ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Delete ${fileName}`,
                    sha: fileData.sha
                })
            });
            if (response.ok) {
                alert('文件已删除');
                getFileList();
            } else {
                throw new Error('删除文件失败');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('删除文件失败。');
        }
    }
}

// 新建文件
document.getElementById('new-file').onclick = async () => {
    const fileName = prompt('请输入新文件名:');
    if (fileName) {
        const key = prompt('请输入加密密钥:');
        const content = '';
        const encryptedContent = CryptoJS.AES.encrypt(content, key).toString();
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}/${fileName}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `token ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Create ${fileName}`,
                    content: btoa(encryptedContent)
                })
            });
            if (response.ok) {
                alert('文件已创建');
                getFileList();
            } else {
                throw new Error('创建文件失败');
            }
        } catch (error) {
            console.error('Error creating file:', error);
            alert('创建文件失败。');
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', init);