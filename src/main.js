// 运行在 Electron 主进程 下的插件入口

// 创建窗口时触发
module.exports.onBrowserWindowCreated = window => {
    // window 为 Electron 的 BrowserWindow 实例

    //监听preload发来的请求webContentsID
    window.webContents.on('ipc-message-sync', (event, channel) => {
        if (channel == '___!boot') {
            event.returnValue = {
                enabled: true,
                webContentsId: window.webContents.id.toString(),
            };
        }
    });
}
