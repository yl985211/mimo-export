// ==UserScript==
// @name         MiMo AI Studio 增强导出插件 (全自动高频同步版)
// @namespace    https://aistudio.xiaomimimo.com/
// @version      3.6
// @description  完美清洗代码块防溢出，深度重组纯净超链接。内置 200ms 智能高频无感定时刷新，保留手动按钮，彻底释放双手！
// @author       作者主页  https://github.com/yl985211    仓库地址  https://github.com/yl985211/mimo-export
// @match        https://aistudio.xiaomimimo.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 1. 注入防溢出、高颜值的控制面板 UI 样式
    GM_addStyle(`
        #mimo-exporter-ui {
            position: fixed; right: 20px; bottom: 20px; z-index: 99999;
            font-family: system-ui, -apple-system, sans-serif;
            box-sizing: border-box;
        }
        #mimo-exporter-ui * { box-sizing: border-box; }

        .mimo-btn-float {
            width: 50px; height: 50px; border-radius: 25px;
            background: #18181b; color: #fff; border: 1px solid #333;
            cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-size: 20px; display: flex; align-items: center; justify-content: center;
            transition: 0.2s;
        }
        .mimo-btn-float:hover { transform: scale(1.05); background: #27272a; }

        .mimo-panel {
            display: none; position: absolute; bottom: 60px; right: 0;
            width: 320px; max-width: calc(100vw - 40px);
            background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15); overflow: hidden;
        }
        .dark .mimo-panel { background: #18181b; border-color: #3f3f46; color: #f4f4f5; }

        .mimo-panel-header { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: bold; display: flex; justify-content: space-between; }
        .dark .mimo-panel-header { border-color: #3f3f46; }

        .mimo-panel-body { padding: 16px; max-height: 420px; overflow-y: auto; overflow-x: hidden; }

        .mimo-row { display: flex; gap: 8px; margin-bottom: 12px; width: 100%; }

        .mimo-select {
            flex: 1; padding: 6px 10px; border-radius: 6px;
            border: 1px solid #ccc; background: transparent; color: inherit;
            outline: none; font-size: 14px;
        }
        .dark .mimo-select { border-color: #52525b; background: #18181b; }

        .mimo-btn {
            flex: 1; padding: 8px; border: none; border-radius: 6px;
            cursor: pointer; font-weight: 500; background: #f4f4f5; color: #18181b;
            font-size: 14px; text-align: center; white-space: nowrap;
        }
        .dark .mimo-btn { background: #27272a; color: #f4f4f5; }
        .mimo-btn:hover { opacity: 0.9; }
        .mimo-btn.primary { background: #2563eb; color: #fff; }

        .mimo-chat-list {
            display: flex; flex-direction: column; gap: 4px; margin-top: 10px;
            border-top: 1px solid #e5e7eb; padding-top: 10px; width: 100%;
            overflow-x: hidden;
        }
        .dark .mimo-chat-list { border-color: #3f3f46; }

        .mimo-chat-item {
            display: flex; align-items: center; gap: 8px; font-size: 13px;
            cursor: pointer; padding: 6px 8px; border-radius: 6px; width: 100%;
            word-break: break-all;
        }
        .mimo-chat-item:hover { background: #f4f4f5; }
        .dark .mimo-chat-item:hover { background: #27272a; }

        .mimo-chat-item.active-chat {
            background: #eff6ff !important;
            border: 1px solid #bfdbfe;
            font-weight: 600;
        }
        .dark .mimo-chat-item.active-chat {
            background: #1e3a8a !important;
            border: 1px solid #1e40af;
        }

        .mimo-status-dot {
            width: 8px; height: 8px; border-radius: 50%; background-color: #10b981;
            box-shadow: 0 0 8px #10b981; flex-shrink: 0;
        }

        .mimo-truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    `);

    // 2. 挂载控制中心组件
    const uiContainer = document.createElement('div');
    uiContainer.id = 'mimo-exporter-ui';
    uiContainer.innerHTML = `
        <button class="mimo-btn-float" title="展开导出菜单">📥</button>
        <div class="mimo-panel">
            <div class="mimo-panel-header">
                <span>MiMo 导出助手 v3.6</span>
                <span style="cursor:pointer; opacity:0.6" id="mimo-close">✕</span>
            </div>
            <div class="mimo-panel-body">
                <div class="mimo-row">
                    <select class="mimo-select" id="mimo-format">
                        <option value="html">HTML 格式 (.html)</option>
                        <option value="md">Markdown 格式 (.md)</option>
                        <option value="txt">TXT 格式 (.txt)</option>
                    </select>
                </div>
                <div class="mimo-row">
                    <button class="mimo-btn primary" id="mimo-export-current">导出当前屏幕对话</button>
                </div>
                <div class="mimo-row" style="margin-bottom: 0;">
                    <button class="mimo-btn" id="mimo-refresh-list">刷新并同步侧边栏</button>
                </div>
                <div class="mimo-chat-list" id="mimo-chat-list"></div>
                <div class="mimo-row" style="margin-top: 12px;" id="mimo-batch-action">
                    <button class="mimo-btn primary" id="mimo-export-batch">批量导出选中项</button>
                </div>
                <div id="mimo-status" style="font-size: 12px; color: #10b981; margin-top: 8px; text-align: center; font-weight: 500;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(uiContainer);

    const floatBtn = uiContainer.querySelector('.mimo-btn-float');
    const panel = uiContainer.querySelector('.mimo-panel');
    const closeBtn = uiContainer.querySelector('#mimo-close');
    const exportCurrentBtn = uiContainer.querySelector('#mimo-export-current');
    const refreshListBtn = uiContainer.querySelector('#mimo-refresh-list');
    const chatListDiv = uiContainer.querySelector('#mimo-chat-list');
    const batchActionDiv = uiContainer.querySelector('#mimo-batch-action');
    const exportBatchBtn = uiContainer.querySelector('#mimo-export-batch');
    const formatSelect = uiContainer.querySelector('#mimo-format');
    const statusDiv = uiContainer.querySelector('#mimo-status');

    let chatElements = [];

    floatBtn.onclick = () => panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    closeBtn.onclick = () => panel.style.display = 'none';

    function setStatus(msg) {
        statusDiv.innerText = msg;
        setTimeout(() => { if(statusDiv.innerText === msg) statusDiv.innerText = ''; }, 3000);
    }

    // 获取当前激活的对话名称
    function getActiveTitle() {
        const activeItem = document.querySelector('.hide-scrollbar .bg-black\\/5 span.truncate, .hide-scrollbar .dark\\:bg-white\\/10 span.truncate');
        if (activeItem) return activeItem.innerText.trim();
        const headerTitle = document.querySelector('header span.font-medium');
        if (headerTitle) return headerTitle.innerText.trim();
        return `未命名对话_${new Date().toLocaleDateString().replace(/\//g, '-')}`;
    }

    // 核心同步与刷新逻辑（同时被手动按钮与自动定时器调用）
    function syncSidebarList() {
        const items = document.querySelectorAll('.hide-scrollbar .group.cursor-pointer');
        const currentActiveTitle = getActiveTitle();

        if (items.length === 0) {
            // 如果侧边栏未展开或未检测到，显示提示
            if (chatListDiv.innerHTML === '') {
                chatListDiv.innerHTML = `
                    <div class="mimo-conv-empty" style="font-size: 12px; color:#666; text-align:center; padding: 20px 0;">
                        未检测到对话列表，请确认左侧边栏已展开
                    </div>`;
            }
            return;
        }

        // 保存当前已经被用户勾选的 checkbox 的 value
        const checkedValues = new Set(
            Array.from(document.querySelectorAll('.mimo-chat-cb:checked')).map(cb => cb.value)
        );
        const isAllChecked = document.getElementById('mimo-check-all')?.checked || false;

        chatElements = Array.from(items).map((el, index) => {
            const titleSpan = el.querySelector('span.truncate');
            const titleText = titleSpan ? titleSpan.innerText.trim() : `未命名对话_${index}`;
            const isActive = el.classList.contains('bg-black/5') || el.classList.contains('dark:bg-white/10') || titleText === currentActiveTitle;

            return { id: index, element: el, title: titleText, isActive: isActive };
        });

        let listHTML = `
            <label class="mimo-chat-item" style="font-weight:bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">
                <input type="checkbox" id="mimo-check-all" ${isAllChecked ? 'checked' : ''}>
                <span class="mimo-truncate">全选记录</span>
            </label>
        `;

        chatElements.forEach(chat => {
            const activeClass = chat.isActive ? 'active-chat' : '';
            const statusDot = chat.isActive ? `<div class="mimo-status-dot"></div>` : '';
            const isChecked = checkedValues.has(String(chat.id)) || (isAllChecked && checkedValues.size === 0);

            listHTML += `
                <label class="mimo-chat-item ${activeClass}">
                    <input type="checkbox" class="mimo-chat-cb" value="${chat.id}" ${isChecked ? 'checked' : ''}>
                    <span class="mimo-truncate" title="${chat.title}">${chat.title}</span>
                    ${statusDot}
                </label>
            `;
        });

        // 将新构造好的 DOM 片段安全写入，保持视觉实时同步
        chatListDiv.innerHTML = listHTML;

        // 绑定全选事件
        document.getElementById('mimo-check-all').onchange = (e) => {
            document.querySelectorAll('.mimo-chat-cb').forEach(cb => cb.checked = e.target.checked);
        };
    }

    // 手动刷新按钮功能保留
    refreshListBtn.onclick = () => {
        syncSidebarList();
        setStatus("列表已手动刷新同步");
    };

    // 🚨 核心增加：200ms 高频无感自动刷新定时器（完全不需要手动去点，完美防卡死）
    setInterval(syncSidebarList, 200);

    // 核心提取逻辑：清洗代码块防溢出、平塑重组超链接
    function extractCurrentChat() {
        const messageContainer = document.querySelector('#message-list');
        if (!messageContainer) return [];

        const messages = [];
        const wrappers = messageContainer.querySelectorAll('.group.flex.min-w-0.flex-1');

        wrappers.forEach(w => {
            const isUser = w.classList.contains('flex-row-reverse');
            let node = isUser ? w.querySelector('.bg-mimo-bg-message') : w.querySelector('.markdown-prose');

            if (node) {
                const clone = node.cloneNode(true);

                // 1. 先删掉没用的 SVG 和复制/跳转图标按钮
                clone.querySelectorAll('svg').forEach(svg => svg.remove());
                clone.querySelectorAll('button').forEach(btn => btn.remove());

                // 2. 重组【超链接】，去掉无用图标，恢复完美蓝色与点击跳转功能
                const linkSelectors = 'span[role=\"link\"], a, .inline-flex[role=\"link\"]';
                clone.querySelectorAll(linkSelectors).forEach(linkEl => {
                    const rawUrl = linkEl.innerText.trim();
                    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
                        const cleanAnchor = document.createElement('a');
                        cleanAnchor.href = rawUrl;
                        cleanAnchor.className = 'mimo-clean-link';
                        cleanAnchor.target = '_blank';
                        cleanAnchor.innerText = rawUrl;
                        linkEl.parentNode.replaceChild(cleanAnchor, linkEl);
                    }
                });

                // 3. 遍历克隆节点里的每个 pre 块，洗净高亮 span 防止代码溢出
                clone.querySelectorAll('pre').forEach(preBox => {
                    const codeEl = preBox.querySelector('code') || preBox;
                    const pureCodeText = codeEl.innerText;

                    preBox.innerHTML = '';

                    const cleanCode = document.createElement('code');
                    cleanCode.innerText = pureCodeText;
                    preBox.appendChild(cleanCode);
                });

                const text = clone.innerText.trim();
                const html = clone.innerHTML.trim();

                if (text) {
                    messages.push({ role: isUser ? '用户' : 'MiMo AI', text: text, html: html });
                }
            }
        });
        return messages;
    }

    // 核心下载逻辑
    function downloadChat(title, messages, format) {
        if (!messages.length) return false;

        let content = '', mime = '', ext = '';
        const safeTitle = title.replace(/[\\\\/:*?"<>|]/g, '_');

        if (format === 'txt') {
            content = messages.map(m => `[${m.role}]\n${m.text}\n`).join('\n------------------------\n\n');
            mime = 'text/plain'; ext = 'txt';
        } else if (format === 'md') {
            content = `# ${title}\n\n` + messages.map(m => `### ${m.role}\n\n${m.text}`).join('\n\n---\n\n');
            mime = 'text/markdown'; ext = 'md';
        } else if (format === 'html') {
            const body = messages.map(m => `
                <div class="message-row ${m.role==='用户' ? 'user-row' : 'ai-row'}">
                    <div class="message-card">
                        <div class="role-badge">${m.role}</div>
                        <div class="message-content">${m.html}</div>
                    </div>
                </div>
            `).join('');

            // 【淡奶牛黄色+官方蓝超链接】终极高级 HTML 页面模版
            content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            max-width: 860px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #2c3e50;
            background-color: #faf9f6;
            line-height: 1.62;
        }
        h2 {
            font-size: 26px;
            color: #111827;
            margin-bottom: 6px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .meta-line {
            font-size: 13px;
            color: #a0aec0;
            margin-bottom: 35px;
        }
        .message-row {
            display: flex;
            width: 100%;
            margin-bottom: 26px;
            box-sizing: border-box;
        }
        .user-row { justify-content: flex-end; }
        .ai-row { justify-content: flex-start; }

        .message-card {
            max-width: 88%;
            min-width: 260px;
            padding: 20px 24px;
            border-radius: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.02);
            box-sizing: border-box;
            word-wrap: break-word;
            word-break: break-word;
        }
        .user-row .message-card {
            background-color: #eef2ff;
            border: 1px solid #e0e7ff;
            color: #1e3a8a;
        }
        .ai-row .message-card {
            background-color: #ffffff;
            border: 1px solid #edf2f7;
            color: #2d3748;
        }

        .role-badge {
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: 0.6px;
        }
        .user-row .role-badge { color: #3b82f6; }
        .ai-row .role-badge { color: #718096; }

        .message-content {
            font-size: 15px;
        }

        /* 🔗 纯净官方蓝链接样式，支持完美点击跳转，没有任何图标杂质 */
        a, .mimo-clean-link {
            color: #2563eb !important;
            text-decoration: underline !important;
            font-weight: 500 !important;
            word-break: break-all !important;
            transition: color 0.15s ease;
        }
        a:hover, .mimo-clean-link:hover {
            color: #1d4ed8 !important;
        }

        /* 🚨 官方质感 · 淡奶牛黄色代码框 */
        pre {
            background-color: #fdfaf2 !important;
            color: #383a42 !important;
            border: 1px solid #f1e7cf !important;
            padding: 16px 18px !important;
            border-radius: 8px !important;
            overflow-x: auto !important;
            max-width: 100% !important;
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
            word-break: break-all !important;
            margin: 14px 0 !important;
            box-sizing: border-box !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
        }

        pre code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
            color: inherit !important;
            background: transparent !important;
            white-space: pre-wrap !important;
            word-break: break-all !important;
            padding: 0 !important;
        }

        /* 行内短小的代码片段高亮 */
        :not(pre) > code {
            background-color: #fdfaf2 !important;
            color: #b57c1e !important;
            border: 1px solid #f1e7cf !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            font-size: 13.5px !important;
            font-family: monospace;
        }

        /* 列表项和表格的完美契合 */
        ul, ol { padding-left: 20px; margin: 8px 0; }
        li { margin-bottom: 4px; }
        table {
            width: 100% !important;
            border-collapse: collapse;
            margin: 14px 0;
            overflow-x: auto;
            display: block;
        }
        th, td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
        th { background-color: #f7fafc; }
    </style>
</head>
<body>
    <h2>${safeTitle}</h2>
    <div class="meta-line">导出时间: ${new Date().toLocaleString()} | 官方优雅级自动高频版</div>
    ${body}
</body>
</html>`;
            mime = 'text/html'; ext = 'html';
        }

        const blob = new Blob([content], { type: `${mime};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    }

    // 快捷当前导出
    exportCurrentBtn.onclick = () => {
        const msgs = extractCurrentChat();
        if (msgs.length === 0) return setStatus("当前未抓取到有效聊天文本");
        const currentName = getActiveTitle();
        downloadChat(currentName, msgs, formatSelect.value);
        setStatus(`已成功导出：${currentName}`);
    };

    // 批量自动化队列下载
    exportBatchBtn.onclick = async () => {
        const checkedBoxes = Array.from(document.querySelectorAll('.mimo-chat-cb:checked'));
        if (checkedBoxes.length === 0) return setStatus("请至少勾选一个对话进行导出");

        exportBatchBtn.disabled = true;

        for (let i = 0; i < checkedBoxes.length; i++) {
            const chatObj = chatElements.find(c => c.id == checkedBoxes[i].value);
            if (!chatObj) continue;

            setStatus(`正在同步下载 (${i+1}/${checkedBoxes.length}): ${chatObj.title}`);
            chatObj.element.click();

            await new Promise(r => setTimeout(r, 1500));

            const msgs = extractCurrentChat();
            downloadChat(chatObj.title, msgs, formatSelect.value);

            await new Promise(r => setTimeout(r, 600));
        }

        setStatus("所选对话已批量处理完毕！");
        exportBatchBtn.disabled = false;
    };

    // 首次加载自动初始化列表
    setTimeout(syncSidebarList, 500);
})();