// Electron 主进程 与 渲染进程 交互的桥梁
const {contextBridge, ipcRenderer} = require("electron");

let {webContentsId} = ipcRenderer.sendSync('___!boot');
if (!webContentsId) {
    webContentsId = 2;
}

// 在window对象下导出只读对象
contextBridge.exposeInMainWorld("grab_red_pack", {
    invokeNative: (eventName, cmdName, registered, ...args) => invokeNative(eventName, cmdName, registered, ...args),
    subscribeEvent: (cmdName, handler) => subscribeEvent(cmdName, handler),
    unsubscribeEvent: (handler) => unsubscribeEvent(handler)
});


/**
 * 调用一个qq底层函数，并返回函数返回值。
 *
 * @param { String } eventName 函数事件名。
 * @param { String } cmdName 函数名。
 * @param { Boolean } registered 函数是否为一个注册事件函数。
 * @param  { ...any } args 函数参数。
 * @returns { Promise<any> } 函数返回值。
 */
function invokeNative(eventName, cmdName, registered, ...args) {
    return new Promise(resolve => {
        const callbackId = crypto.randomUUID();
        const callback = (event, ...args) => {
            if (args?.[0]?.callbackId == callbackId) {
                ipcRenderer.off(`IPC_DOWN_${webContentsId}`, callback);
                resolve(args[1]);
            }
        };
        ipcRenderer.on(`IPC_DOWN_${webContentsId}`, callback);
        ipcRenderer.send(`IPC_UP_${webContentsId}`, {
            type: 'request',
            callbackId,
            eventName: `${eventName}-${webContentsId}${registered ? '-register' : ''}`
        }, [cmdName, ...args]);
    });
}

/**
 * 为qq底层事件 `cmdName` 添加 `handler` 处理器。
 *
 * @param { String } cmdName 事件名称。
 * @param { Function } handler 事件处理器。
 * @returns { Function } 新的处理器。
 */
function subscribeEvent(cmdName, handler) {
    const listener = (event, ...args) => {
        if (args?.[1]?.[0]?.cmdName == cmdName) {
            handler(args[1][0].payload);
        }
    };
    ipcRenderer.on(`IPC_DOWN_${webContentsId}`, listener);
    return listener;
}

/**
 * 移除qq底层事件的 `handler` 处理器。
 *
 * 请注意，`handler` 并不是传入 `subscribeEvent` 的处理器，而是其返回的新处理器。
 *
 * @param { Function } handler 事件处理器。
 */
function unsubscribeEvent(handler) {
    ipcRenderer.off(`IPC_DOWN_${webContentsId}`, handler);
}
