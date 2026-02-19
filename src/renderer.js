// 运行在 Electron 渲染进程 下的页面脚本
import {pluginLog} from "./utils/frontLogUtils.js";
import {SettingListeners} from "./utils/SettingListeners.js";
import {grabRedBag} from "./utils/grabRedBag.js";

const grAPI = window.grab_redbag
let grabRedBagListener = undefined//保存监听器
let hasActived = false
await onLoad();//注入

// 打开设置界面时触发
export const onSettingWindowCreated = async view => {
    // view 为 Element 对象，修改将同步到插件设置界面
    try {
        //整个插件主菜单
        const parser = new DOMParser()
        const settingHTML = parser.parseFromString(await grAPI.getMenuHTML(), "text/html").querySelector(".config-menu")

        const myListener = new SettingListeners(settingHTML)
        await myListener.onLoad()
        view.appendChild(settingHTML);

    } catch (e) {
        setInterval(() => {//防止调试未打开就已经输出，导致捕获不到错误
            console.log(e)
        }, 1000)
    }
}


async function onLoad() {
    if (location.hash === "#/blank") {
        navigation.addEventListener("navigatesuccess", onHashUpdate, {once: true});
    } else {
        await onHashUpdate();
    }

    pluginLog('onLoad函数加载完成')
}

async function onHashUpdate() {
    const hash = location.hash;
    // 通过 hash 判断是否为主界面，不再硬编码 webContentId（兼容 Linux 等平台窗口 ID 不同）
    if (hash === '#/blank') return
    if (!(hash.includes("#/main/message") || hash.includes("#/chat"))) return;//不符合条件直接返回

    pluginLog("onHashUpdate开始执行")

    grAPI.addEventListener('LiteLoader.grab_redbag.unSubscribeListener', () => grAPI.unsubscribeEvent(grabRedBagListener)) //收到取消订阅消息，取消订阅红包消息
    grAPI.addEventListener('LiteLoader.grab_redbag.subscribeListener', () => {
        pluginLog("渲染进程收到请求，准备监听红包事件。")
        //旧版是onRecvActiveMsg，新版是onRecvMsg
        grabRedBagListener = grAPI.subscribeEvent("nodeIKernelMsgListener/onRecvMsg", (payload) => grabRedBag(payload))
    })//添加订阅

    pluginLog('执行onHashUpdate')
    //"nodeIKernelMsgListener/onAddSendMsg"
    //"nodeIKernelMsgListener/onRecvMsg"
    try {
        if (!(await grAPI.getConfig()).isActive) {
            pluginLog("功能未开启，不监听抢红包事件")
            return
        }
        grabRedBagListener = grAPI.subscribeEvent("nodeIKernelMsgListener/onRecvMsg", (payload) => grabRedBag(payload))
        pluginLog("事件监听成功")

        //尝试获取群列表

        //有人加群的时候会触发onGroupListUpdate

        //NodeIKernelGroupListener/onGroupListUpdate
        grAPI.subscribeEvent("onGroupListUpdate", async (payload) => {
                pluginLog("监听到onGroupListUpdate")
                console.log(payload)
                if (hasActived) return
                hasActived = true;
                if ((await grAPI.getConfig()).isActiveAllGroups) {
                    pluginLog("激活所有聊天")
                    await activeAllGroups(payload.groupList)
                }
            }
        )

        //NodeIKernelGroupService/getGroupList
        const result = await grAPI.invokeNative('ns-NodeStoreApi', "getGroupList", false)
        console.log(result)

    } catch (e) {
        console.log(e)
    }
}

//激活所有的群聊消息
async function activeAllGroups(groupList) {
    for (const group of groupList) {
        //应该对每个group调用active方法
        const result = await grAPI.invokeNative("ns-ntApi", "nodeIKernelMsgService/getAioFirstViewLatestMsgsAndAddActiveChat", false, {
            "peer": {
                "chatType": 2,
                "peerUid": group.groupCode,
                "guildId": ""
            }, "cnt": 0
        }, null)
        // pluginLog(`激活群聊"${group.groupName}"的消息，结果为`)
        // console.log(result)
    }
}

