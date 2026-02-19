// Electron 主进程 与 渲染进程 交互的桥梁（新版 RM_IPC）
const {contextBridge, ipcRenderer} = require("electron");

// 获取 webContentsId
let webContentsId = 2;
try {
    const boot = ipcRenderer.sendSync("___!boot");
    if (boot && boot.webContentsId) webContentsId = boot.webContentsId;
} catch {}
// URL 参数兜底
try {
    if (!webContentsId || webContentsId === 2) {
        const m = global.location?.search?.match(/webcontentsid=(\d+)/i);
        if (m) webContentsId = Number(m[1]);
    }
} catch {}

// 新版 RM_IPC 通道名
const IPC_UP_CHANNEL = `RM_IPCTO_MAIN${webContentsId}`;       // 渲染 -> 主进程（发送请求）
const IPC_DOWN_CHANNEL = `RM_IPCFROM_MAIN${webContentsId}`;   // 主进程 -> 渲染（接收响应）
const IPC_DOWN_MAIN2 = `RM_IPCFROM_MAIN2`;                    // 兜底通道
const IPC_FROM_RENDERER = `RM_IPCFROM_RENDERER${webContentsId}` //  invokeNative的时候用

console.log(`[Grab-RedBag] webContentsId=${webContentsId}, UP=${IPC_UP_CHANNEL}, DOWN=${IPC_DOWN_CHANNEL}`);

// 将 webContentsId 暴露给渲染进程，用于主窗口判断（兼容不同平台）
contextBridge.exposeInMainWorld("grab_redbag_webContentsId", webContentsId);

// 在window对象下导出只读对象
contextBridge.exposeInMainWorld("grab_redbag", {
    getMenuHTML: () => ipcRenderer.invoke("LiteLoader.grab_redbag.getMenuHTML"),
    getConfig: () => ipcRenderer.invoke("LiteLoader.grab_redbag.getConfig"),
    setConfig: (newConfig) => ipcRenderer.invoke("LiteLoader.grab_redbag.setConfig", newConfig),
    invokeNative: (eventName, cmdName, registered, ...args) => invokeNative(eventName, cmdName, registered, ...args),
    subscribeEvent: (cmdName, handler) => subscribeEvent(cmdName, handler),
    unsubscribeEvent: (handler) => unsubscribeEvent(handler),
    addEventListener: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
    addTotalRedBagNum:(num)=>ipcRenderer.invoke("LiteLoader.grab_redbag.addTotalRedBagNum",num),
    addTotalAmount:(amount)=>ipcRenderer.invoke("LiteLoader.grab_redbag.addTotalAmount",amount),
    //发送消息到所有聊天窗口
    sendMsgToChatWindows: (message, arg) => {
        //console.log(message,arg)
        ipcRenderer.send("LiteLoader.grab_redbag.sendMsgToChatWindows", message, arg)
    },
});


/**
 * 【V2 版本】调用 QQ 底层 NTAPI 函数（新版 RM_IPC 格式）
 *
 * @param { String } eventName 函数事件名，例如 "ns-ntApi"。
 * @param { String } cmdName 函数名，例如 "nodeIKernelMsgService/grabRedBag"。
 * @param { Boolean } registered 函数是否为一个注册事件函数（本版本暂未使用）。
 * @param  { ...any } args 函数参数。
 * @returns { Promise<any> } 函数返回值。
 */
function invokeNative(eventName, cmdName, registered, ...args) {
    console.log(`[Grab-RedBag invokeNative] 准备发送 IPC 消息:
    - UP Channel: ${IPC_UP_CHANNEL}
    - DOWN Channel: ${IPC_DOWN_CHANNEL}
    - Event: ${eventName}
    - Command: ${cmdName}
    - Args:`, ...args);

    return new Promise((resolve, reject) => {
        const callbackId = crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;

        const callback = (_event, ...resultArgs) => {
            // 新版回调结构：resultArgs[0] 包含 callbackId，resultArgs[1] 是结果
            if (resultArgs?.[0]?.callbackId === callbackId) {
                console.log('[Grab-RedBag invokeNative] 收到回调:', resultArgs[1]);
                try { ipcRenderer.off(IPC_DOWN_CHANNEL, callback); } catch {}
                try { ipcRenderer.off(IPC_DOWN_MAIN2, callback); } catch {}
                resolve(resultArgs[1]);
            }
        };

        // 监听回调通道 + 兜底通道
        try { ipcRenderer.on(IPC_DOWN_CHANNEL, callback); } catch {}
        try { ipcRenderer.on(IPC_DOWN_MAIN2, callback); } catch {}

        // 构建新版载荷
        const requestMetadata = {
            type: "request",
            callbackId: callbackId,
            eventName: eventName,
            peerId: webContentsId
        };

        const commandPayload = {
            cmdName: cmdName,
            cmdType: "invoke",
            payload: args
        };

        // 发送 IPC 消息
        try {
            ipcRenderer.send(IPC_FROM_RENDERER, requestMetadata, commandPayload);
            console.log('[Grab-RedBag invokeNative] IPC 消息已发送。');
        } catch (error) {
            console.error('[Grab-RedBag invokeNative] IPC 消息发送失败:', error);
            try { ipcRenderer.off(IPC_DOWN_CHANNEL, callback); } catch {}
            try { ipcRenderer.off(IPC_DOWN_MAIN2, callback); } catch {}
            reject(error);
        }
    });
}

/**
 * 为qq底层事件 `cmdName` 添加 `handler` 处理器。（新版 RM_IPC）
 *
 * @param { String } cmdName 事件名称。
 * @param { Function } handler 事件处理器。
 * @returns { Function } 新的处理器。
 */
function subscribeEvent(cmdName, handler) {
    console.log(`[Grab-RedBag] subscribeEvent: cmdName=${cmdName}, DOWN=${IPC_DOWN_CHANNEL}`);
    
    const listener = (_event, ...args) => {
        // // ===== 调试：打印收到的所有事件 =====
        // console.log("[Grab-RedBag] ===== 收到IPC事件 =====");
        // console.log("[Grab-RedBag] args长度:", args.length);
        // for (let i = 0; i < args.length; i++) {
        //     console.log(`[Grab-RedBag] args[${i}]:`, JSON.stringify(args[i], null, 2));
        // }
        // console.log("[Grab-RedBag] ===== 事件打印结束 =====");

        // 尝试新版格式: args[1].cmdName
        if (args?.[1]?.cmdName === cmdName) {
            handler(args[1].payload);
            return;
        }
        // 尝试旧版格式: args[3][1].cmdName
        if (args?.[3]?.[1]?.cmdName === cmdName) {
            handler(args[3][1].payload);
            return;
        }
    };
    
    // 监听主通道 + 兜底通道
    try { ipcRenderer.on(IPC_DOWN_CHANNEL, listener); } catch {}
    try { ipcRenderer.on(IPC_DOWN_MAIN2, listener); } catch {}
    return listener;
}

/**
 * 移除qq底层事件的 `handler` 处理器。（新版 RM_IPC）
 *
 * @param { Function } handler 事件处理器。
 */
function unsubscribeEvent(handler) {
    try { ipcRenderer.off(IPC_DOWN_CHANNEL, handler); } catch {}
    try { ipcRenderer.off(IPC_DOWN_MAIN2, handler); } catch {}
}

