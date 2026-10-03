const {pluginLog} = require("./logUtils");

// 拦截 Electron 内部事件槽位 "-ipc-message"。
// apply 必须保持同步：该事件是同步内部派发，QQ 的 ntApi 桥依赖返回值，
// 改成 async 会让返回值变成 Promise，原生调用方拿到错误语义（点开资料卡等界面直接卡死）。
function ipcModifyer(ipcProxy) {
    return new Proxy(ipcProxy, {
        apply(target, thisArg, args) {
            try {
                // 需要取消激活的群保持激活：直接丢弃这条 IPC，不下发给原生
                if (isDeleteActiveChat(args)) {
                    pluginLog("拦截到了deleteActiveChatByUid，已丢弃")
                    return
                }
            } catch (err) {
                console.log(err);
            }
            // 出错也只分发一次，不要重复调用原生 handler
            return target.apply(thisArg, args)
        }
    })
}

//兼容两种载荷形状：新版 {cmdName, ...} 与旧版 [cmdName, ...]
function isDeleteActiveChat(args) {
    const payload = args?.[3]?.[1];
    const name = payload?.cmdName ?? payload?.[0];
    return name === "nodeIKernelMsgService/deleteActiveChatByUid"
}

module.exports={ipcModifyer, isDeleteActiveChat}