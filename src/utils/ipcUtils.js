const {pluginLog} = require("./logUtils");


function ipcModifyer(ipcProxy) {
    return new Proxy(ipcProxy, {
        async apply(target, thisArg, args) {
            let modifiedArgs = args;
            try {//thisArg是WebContent对象
                //设置ipc通道名
                //const ipcName = args?.[3]?.[1]?.[0]   这个是旧版

                //新版QQ的格式已修改。
                const ipcName = args?.[3]?.[1]?.cmdName
                const eventName = args?.[3]?.[0]?.eventName

                //if (eventName !== "ns-LoggerApi-2") console.log(JSON.stringify(args))//调试的时候用

                if (ipcName === "nodeIKernelMsgService/deleteActiveChatByUid") {
                    pluginLog("拦截到了deleteActiveChatByUid.")
                    pluginLog(args)
                    modifiedArgs = await ipcdeleteActiveChatByUidModify(args);
                }
                if(ipcName === "nodeIKernelMsgListener/onRecvMsg"){
                    pluginLog(args[3][1].payload)
                }
                return target.apply(thisArg, modifiedArgs)
            } catch (err) {
                console.log(err);
                target.apply(thisArg, args)
            }
        }
    })
}

//取消监听
async function ipcdeleteActiveChatByUidModify(args) {
    pluginLog("拦截取消激活事件")
    args[3][1][1] = ""//取消激活的群号改为空
    return args
}

module.exports={ipcModifyer}