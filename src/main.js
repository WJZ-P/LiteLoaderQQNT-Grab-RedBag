// 运行在 Electron 主进程 下的插件入口
const {pluginLog} = require("./utils/logUtils");
const grAPI = window.grab_red_pack
// 创建窗口时触发
module.exports.onBrowserWindowCreated = window => {
    // window 为 Electron 的 BrowserWindow 实例

    pluginLog("尝试监听onRecvMsg")
    //尝试监听onRecvMsg
    grAPI.subscribeEvent("nodeIKernelMsgListener/onRecvMsg", (payload) => {
        console.log(payload)
    })
}
