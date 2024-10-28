const {pluginLog} = require("./logUtils");


function ipcModifyer(ipcProxy) {
    return new Proxy(ipcProxy, {
        async apply(target, thisArg, args) {
            let modifiedArgs = args;
            try {//thisArg是WebContent对象
                //设置ipc通道名
                const ipcName = args?.[3]?.[1]?.[0]
                if (ipcName === "nodeIKernelMsgService/deleteActiveChatByUid") modifiedArgs = await ipcdeleteActiveChatByUidModify(args);
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