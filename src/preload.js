// Electron 主进程 与 渲染进程 交互的桥梁（新版 RM_IPC）
const {contextBridge, ipcRenderer} = require("electron");

const IPC_TIMEOUT = 10000;
const subscriptions = new Map();
let nativeBridgePromise;

// Session preloads can run without onBrowserWindowCreated, so bootstrap must not use sendSync.
function getNativeBridge() {
    if (!nativeBridgePromise) {
        nativeBridgePromise = withTimeout(
            Promise.resolve().then(() => ipcRenderer.invoke("LiteLoader.grab_redbag.getWebContentsId")),
            "webContentsId lookup"
        ).then(id => {
            const numericId = Number(id);
            if (!Number.isSafeInteger(numericId) || numericId <= 0) {
                throw new Error("Invalid grab_redbag webContentsId");
            }
            const webContentsId = String(numericId);
            return {
                webContentsId,
                requestChannel: `RM_IPCFROM_RENDERER${webContentsId}`,
                responseChannels: [...new Set([`RM_IPCFROM_MAIN${webContentsId}`, "RM_IPCFROM_MAIN2"])]
            };
        }).catch(error => {
            nativeBridgePromise = undefined;
            throw error;
        });
    }
    return nativeBridgePromise;
}

function withTimeout(promise, operation) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            clearTimeout(timer);
            reject(new Error(`[Grab-RedBag] ${operation} timed out`));
        }, IPC_TIMEOUT);
        promise.then(value => {
            clearTimeout(timer);
            resolve(value);
        }, error => {
            clearTimeout(timer);
            reject(error);
        });
    });
}

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
        ipcRenderer.send("LiteLoader.grab_redbag.sendMsgToChatWindows", message, arg)
    },
});

/**
 * @param {String} eventName
 * @param {String} cmdName
 * @param {Boolean} registered
 * @param {...any} args
 * @returns {Promise<any>}
 */
async function invokeNative(eventName, cmdName, registered, ...args) {
    const bridge = await getNativeBridge();
    return new Promise((resolve, reject) => {
        const callbackId = crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        let timer;
        const cleanup = () => {
            clearTimeout(timer);
            for (const channel of bridge.responseChannels) ipcRenderer.off(channel, callback);
        };
        const callback = (_event, ...resultArgs) => {
            if (resultArgs?.[0]?.callbackId === callbackId) {
                cleanup();
                resolve(resultArgs[1]);
            }
        };

        try {
            for (const channel of bridge.responseChannels) ipcRenderer.on(channel, callback);
            timer = setTimeout(() => {
                cleanup();
                reject(new Error(`[Grab-RedBag] ${cmdName} timed out`));
            }, IPC_TIMEOUT);
            ipcRenderer.send(bridge.requestChannel, {
                type: "request",
                callbackId,
                eventName,
                peerId: bridge.webContentsId
            }, {
                cmdName,
                cmdType: "invoke",
                payload: args
            });
        } catch (error) {
            cleanup();
            reject(error);
        }
    });
}

/**
 * @param {String} cmdName
 * @param {Function} handler
 * @returns {Function}
 */
function subscribeEvent(cmdName, handler) {
    const subscription = {channels: []};
    const reportError = error => console.error("[Grab-RedBag] event handler failed:", cmdName, error);
    const dispatch = payload => {
        try {
            Promise.resolve(handler(payload)).catch(reportError);
        } catch (error) {
            reportError(error);
        }
    };
    const listener = (_event, ...args) => {
        if (args?.[1]?.cmdName === cmdName) {
            dispatch(args[1].payload);
            return;
        }
        if (args?.[3]?.[1]?.cmdName === cmdName) {
            dispatch(args[3][1].payload);
        }
    };
    subscriptions.set(listener, subscription);
    getNativeBridge().then(bridge => {
        // A subscription may be cancelled while the asynchronous ID lookup is still pending.
        if (!subscriptions.has(listener)) return;
        subscription.channels = bridge.responseChannels;
        for (const channel of subscription.channels) ipcRenderer.on(channel, listener);
    }).catch(error => {
        unsubscribeEvent(listener);
        console.error("[Grab-RedBag] subscribeEvent failed:", error);
    });
    return listener;
}

/**
 * @param {Function} handler
 */
function unsubscribeEvent(handler) {
    const subscription = subscriptions.get(handler);
    if (!subscription) return;
    subscriptions.delete(handler);
    for (const channel of subscription.channels) ipcRenderer.off(channel, handler);
}
