import {pluginLog} from "./frontLogUtils.js";

const pluginAPI = window.grab_redbag
const grabedArray = []
let antiDetectGroups = []//暂时停止监听的群。
const antiDetectTime = 300000//默认暂停五分钟

// 缓存 authData，避免每次都遍历搜索
let cachedAuthData = null;

/**
 * 获取 authData，带缓存机制
 * 第一次调用时会遍历搜索，之后直接返回缓存
 */
function getAuthData() {
    if (cachedAuthData) {
        return cachedAuthData;
    }
    
    // 先尝试旧版路径
    try {
        const oldPath = app?.__vue_app__?.config?.globalProperties?.$store?.state?.common_Auth?.authData;
        if (oldPath && oldPath.uin) {
            console.log("[Grab-RedBag] 使用旧版路径获取 authData 成功");
            cachedAuthData = oldPath;
            return cachedAuthData;
        }
    } catch (e) {
        console.log("[Grab-RedBag] 旧版路径获取 authData 失败，尝试搜索...");
    }
    
    // 旧版路径失败，使用搜索
    const result = findShortestPathAndValue(app, "authData");
    if (result && result.value && result.value.uin) {
        console.log("[Grab-RedBag] 搜索到 authData，路径:", result.path);
        cachedAuthData = result.value;
        return cachedAuthData;
    }
    
    console.error("[Grab-RedBag] 无法获取 authData！");
    return null;
}

/**
 * [V4 优化版] - 查找对象中某个 key 的最短可访问路径及其对应的值
 *
 * 该算法使用广度优先搜索 (BFS) 来保证找到的路径层级最浅。
 * 它会忽略 Vue 内部的响应式依赖属性（如 dep, __v_raw, _value 等），
 * 从而避免产生超长的无效路径。
 *
 * @param {object} rootObject - 搜索的起始对象，例如 `app` 或 `window`。
 * @param {string} targetKey - 要查找的属性名，例如 "authData"。
 * @returns {{path: string, value: any}|null} - 返回一个包含最短路径和对应值的对象，如果找不到则返回 null。
 */
function findShortestPathAndValue(rootObject, targetKey) {
    console.log(`[Grab-RedBag] 🚀 开始搜索 "${targetKey}" 的最短路径和值...`);

    // 定义需要忽略的属性名
    const ignoreProps = new Set([
        'dep', '__v_raw', '__v_skip', '_value', '__ob__',
        'prevDep', 'nextDep', 'prevSub', 'nextSub', 'deps', 'subs',
        '__vueParentComponent', 'parent', 'provides'
    ]);

    // 使用广度优先搜索 (BFS)
    const queue = [{obj: rootObject, path: 'app'}];
    const visited = new Set();

    visited.add(rootObject);

    while (queue.length > 0) {
        const {obj, path} = queue.shift();

        // 检查当前对象是否直接包含目标 key
        if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, targetKey)) {
            const finalPath = `${path}.${targetKey}`;
            const finalValue = obj[targetKey];

            // 验证找到的值是否有效（对于 authData，需要有 uin 属性）
            if (finalValue && (targetKey !== 'authData' || finalValue.uin)) {
                console.log(`[Grab-RedBag] ✅ 成功! 找到最短路径: ${finalPath}`);
                return { path: finalPath, value: finalValue };
            }
        }

        // 将子属性加入队列
        for (const prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                if (ignoreProps.has(prop)) {
                    continue;
                }

                try {
                    const childObj = obj[prop];
                    if (childObj && typeof childObj === 'object' && !visited.has(childObj)) {
                        visited.add(childObj);
                        const newPath = Array.isArray(obj) ? `${path}[${prop}]` : `${path}.${prop}`;
                        queue.push({obj: childObj, path: newPath});
                    }
                } catch (e) {
                    // 忽略访问出错的属性
                }
            }
        }
    }

    console.log(`[Grab-RedBag] ❌ 搜索完成，未找到 "${targetKey}" 的可访问路径。`);
    return null;
}

export async function grabRedBag(payload) {
    //console.log("[Grab-RedBag] ========== grabRedBag 开始执行 ==========")
    // pluginLog("下面是onRecvMsg的payload")
    if (payload.msgList[0].peerUid === "934773893")
        console.log(payload)
    //console.log(payload)
    let wallEl = null
    for (const msgElement of payload.msgList[0].elements) {
        if (msgElement.elementType === 9) {//说明是红包消息！
            pluginLog("收到了红包消息！！！")
            wallEl = msgElement.walletElement
            console.log(msgElement.walletElement)//打印红包内容
            console.log(payload)
            break
        }
    }
    if (!wallEl) {
        //console.log("[Grab-RedBag] wallEl 为空，不是红包消息，退出")
        return;
    }
    if (grabedArray.includes(wallEl.billNo)) {
        console.log("[Grab-RedBag] 该红包已处理过，billNo:", wallEl.billNo)
        return;
    }
    grabedArray.push(wallEl.billNo)//这里使用数组来避免重复播报
    console.log("[Grab-RedBag] 新红包，billNo:", wallEl.billNo)

    const authData = getAuthData();
    if (!authData) {
        console.error("[Grab-RedBag] 无法获取 authData，退出");
        return;
    }
    console.log("[Grab-RedBag] authData 获取成功，uin:", authData.uin);

    //收红包必要的数据
    const msgSeq = payload.msgList[0].msgSeq
    const recvUin = authData.uin//自己的QQ号
    const peerUid = payload.msgList[0].peerUid//发红包的对象的peerUid
    const name = authData.nickName//应该是自己的名字
    const sendUin = payload.msgList[0].senderUin//发送红包的QQ号
    const senderName = payload.msgList[0].sendRemarkName || payload.msgList[0].sendMemberName || payload.msgList[0].sendNickName;//发送者的名字
    const pcBody = wallEl.pcBody
    const wishing = wallEl.receiver.title
    const index = wallEl.stringIndex
    const chatType = payload.msgList[0].chatType//聊天类型，1是私聊，2是群聊
    const peerName = payload.msgList[0].peerName//群聊名字
    const title = wallEl.receiver.title
    const redChannel = wallEl.redChannel
    const config = await pluginAPI.getConfig()
    const IsGroup = config.Send2Who.length === 0 ? 1 : (config.Send2Who[0] === "1" ? 8 : 2);
    const receiver = config.Send2Who.length === 0 || config.Send2Who[0] === "1" ? authData.uid : config.Send2Who[0];


    //先判断黑白名单的类型
    console.log("[Grab-RedBag] 开始检查黑白名单，blockType:", config.blockType)
    switch (config.blockType) {
        case "0" :
            console.log("[Grab-RedBag] 未启用黑白名单")
            break;//说明未启用黑白名单

        case "1": {//说明是白名单
            if (!((config.listenKeyWords.length === 0 || config.listenKeyWords.some(word => title.includes(word))) && (config.listenGroups.length === 0 || config.listenGroups.includes(peerUid)) && (config.listenQQs.length === 0 || config.listenQQs.includes(sendUin)))) {
                pluginLog("未同时满足关键字、白名单群和发送者条件，不抢红包")
                console.log("[Grab-RedBag] 白名单检查未通过，退出")
                if (config.notifyOnBlocked) {
                    await pluginAPI.invokeNative('ntApi', "nodeIKernelMsgService/sendMsg", false, {
                        "msgId": "0",
                        "peer": {"chatType": IsGroup, "peerUid": receiver, "guildId": ""},
                        "msgElements": [{
                            "elementType": 1,
                            "elementId": "",
                            "textElement": {
                                "content": `[Grab RedBag]发现来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包，但未满足白名单条件，未领取。`,
                                "atType": 0,
                                "atUid": "",
                                "atTinyId": "",
                                "atNtUid": ""
                            }
                        }],
                        "msgAttributeInfos": new Map()
                    }, null)
                }
                return
            }
            console.log("[Grab-RedBag] 白名单检查通过")
            break
        }
        case "2": {//说明是黑名单
            if (config.avoidKeyWords.some(word => title.includes(word)) || config.avoidGroups.includes(peerUid) || config.avoidQQs.includes(sendUin)) {
                pluginLog("检测到黑名单关键字、在黑名单群内或发送者在黑名单内，不抢红包")
                console.log("[Grab-RedBag] 黑名单检查命中，退出")
                if (config.notifyOnBlocked) {
                    await pluginAPI.invokeNative('ntApi', "nodeIKernelMsgService/sendMsg", false, {
                        "msgId": "0",
                        "peer": {"chatType": IsGroup, "peerUid": receiver, "guildId": ""},
                        "msgElements": [{
                            "elementType": 1,
                            "elementId": "",
                            "textElement": {
                                "content": `[Grab RedBag]发现来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包，但命中黑名单，未领取。`,
                                "atType": 0,
                                "atUid": "",
                                "atTinyId": "",
                                "atNtUid": ""
                            }
                        }],
                        "msgAttributeInfos": new Map()
                    }, null)
                }
                return
            }
            console.log("[Grab-RedBag] 黑名单检查通过")
            break
        }
    }


    if (config.notificationonly) {
        pluginLog("检测到已开启仅通知模式")
        console.log("[Grab-RedBag] 仅通知模式，发送通知后退出")
        await pluginAPI.invokeNative('ntApi', "nodeIKernelMsgService/sendMsg", false, {
            "msgId": "0",
            "peer": {"chatType": IsGroup, "peerUid": receiver, "guildId": ""},
            "msgElements": [{
                "elementType": 1,
                "elementId": "",
                "textElement": {
                    "content": `[Grab RedBag]发现来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包！`,
                    "atType": 0,
                    "atUid": "",
                    "atTinyId": "",
                    "atNtUid": ""
                }
            }],
            "msgAttributeInfos": new Map()
        }, null)
        return
    }

    //还要检测是否开启特定时段禁止抢红包功能。
    if (config.stopGrabByTime) {
        //检测时间段
        console.log("[Grab-RedBag] 检查时间段限制，开始:", config.stopGrabStartTime, "结束:", config.stopGrabEndTime)
        if (isCurrentTimeInRange(config.stopGrabStartTime, config.stopGrabEndTime)) {
            console.log("[Grab-RedBag] 当前在禁止时间段内，退出")
            return
        }
    }
    //检测是否在暂时监听名单内
    if (antiDetectGroups.includes(peerUid)) {
        pluginLog("当前群在暂停收红包的群内！不抢红包！")
        console.log("[Grab-RedBag] 群在 antiDetectGroups 中，退出")
        return
    }

    //下面准备发送收红包消息
    pluginLog("准备抢红包")
    console.log("[Grab-RedBag] ===== 准备抢红包 =====")
    console.log("[Grab-RedBag] chatType:", chatType, "peerUid:", peerUid, "msgSeq:", msgSeq)
    let randomDelayForSend = 0;
    if (config.useRandomDelay) {

        const lowerBound = parseInt(config.delayLowerBound)
        const upperBound = parseInt(config.delayUpperBound)
        const lowerBoundForSend = parseInt(config.delayLowerBoundForSend)
        const upperBoundForSend = parseInt(config.delayUpperBoundForSend)
        const randomDelay = Math.floor(Math.random() * (upperBound - lowerBound + 1)) + lowerBound;
        randomDelayForSend = Math.floor(Math.random() * (upperBoundForSend - lowerBoundForSend + 1)) + lowerBoundForSend;
        pluginLog("等待随机时间" + randomDelay + "ms")
        await sleep(randomDelay)
    }

    if (redChannel === 32) {
        //说明是口令红包，要输出口令
        console.log("[Grab-RedBag] 口令红包，口令:", title)
        const result = await pluginAPI.invokeNative('ntApi', 'nodeIKernelMsgService/sendMsg', false, {
            "msgId": "0",
            "peer": {
                "chatType": chatType,
                "peerUid": peerUid,
                "guildId": ""
            },
            "msgElements": [
                {
                    "elementType": 1,
                    "elementId": "",
                    "textElement": {
                        "content": title,
                        "atType": 0,
                        "atUid": "",
                        "atTinyId": "",
                        "atNtUid": ""
                    }
                }
            ],
            "msgAttributeInfos": new Map(),
        })
        //这里要做校验，如果消息发送失败了，那就得取消抢红包，以避免被禁言了的情况下抢到口令红包的情况。
        pluginLog("发送口令红包的口令，下面是发送口令回调结果")
        console.log(JSON.stringify(result, null, null))
        //如果口令发送失败，比如被禁言，就不抢红包了
        if (result.result !== 0 || result.errMsg !== "") {
            console.log("[Grab-RedBag] 口令发送失败，退出")
            return
        }
        console.log("[Grab-RedBag] 口令发送成功")
    }

    console.log("[Grab-RedBag] 调用 grabRedBag API，参数:", {
        recvUin: chatType === 1 ? recvUin : peerUid,
        recvType: chatType,
        peerUid,
        name,
        pcBody,
        wishing,
        msgSeq,
        index
    })
    const result = await pluginAPI.invokeNative('ntApi', "nodeIKernelMsgService/grabRedBag", window.webContentId, {
        "grabRedBagReq": {
            "recvUin": chatType === 1 ? recvUin : peerUid,//私聊的话是自己Q号，群聊就是peerUid
            "recvType": chatType,
            "peerUid": peerUid,//对方的uid
            "name": name,
            "pcBody": pcBody,
            "wishing": wishing,
            "msgSeq": msgSeq,
            "index": index
        }
    }, {"timeout": 5000})
    pluginLog("抢红包结果为")
    console.log("[Grab-RedBag] grabRedBag API 返回结果:")
    console.log(result)
    
    if (!result) {
        console.log("[Grab-RedBag] result 为空，API 调用可能失败")
        return
    }
    if (!result.grabRedBagRsp) {
        console.log("[Grab-RedBag] result.grabRedBagRsp 为空，结构异常")
        return
    }

    //下面给自己发送提示消息
    if (config.useSelfNotice) {
        pluginLog("准备给自己发送消息")
        console.log("[Grab-RedBag] useSelfNotice=true，准备发送通知")
        if (result.grabRedBagRsp.recvdOrder.amount === "0") {
            console.log("[Grab-RedBag] 红包金额为0，已被领完")
            await pluginAPI.invokeNative('ntApi', "nodeIKernelMsgService/sendMsg", false, {
                "msgId": "0",
                "peer": {"chatType": IsGroup, "peerUid": receiver, "guildId": ""},
                "msgElements": [{
                    "elementType": 1,
                    "elementId": "",
                    "textElement": {
                        "content": `[Grab RedBag]抢来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包时失败！红包已被领完！`,
                        "atType": 0,
                        "atUid": "",
                        "atTinyId": "",
                        "atNtUid": ""
                    }
                }],
                "msgAttributeInfos": new Map()
            }, null)
        } else {
            //这里先准备好需要用到的数据
            //peerName群名、peerUid群号、senderName发红包的人名、sendUin发红包的人的Q号
            let amount = parseInt(result.grabRedBagRsp.recvdOrder.amount) / 100
            console.log("[Grab-RedBag] 抢到红包金额:", amount, "元")

            //检测收到的是不是一分钱
            if (amount === 0.01 && config.antiDetect) {
                pluginLog("检测到一分钱红包！不抢红包！")
                //暂时不抢这个群的红包
                antiDetectGroups.push(peerUid)
                //设置定时任务，定时删掉数组中的群
                setTimeout(() => {
                    antiDetectGroups = antiDetectGroups.filter(pausedGroupUid => pausedGroupUid !== peerUid);
                    pluginLog(`恢复监听群${peerName}(${peerUid})`)
                }, antiDetectTime)
            }

            //定义需要发送的消息
            const msg = config.receiveMsg.replace("%peerName%", peerName)
                .replace("%peerUid%", peerUid)
                .replace("%senderName%", senderName)
                .replace("%sendUin%", sendUin)
                .replace("%amount%", amount.toFixed(2))

            await pluginAPI.invokeNative('ntApi', "nodeIKernelMsgService/sendMsg", false, {
                "msgId": "0",
                "peer": {"chatType": IsGroup, "peerUid": receiver, "guildId": ""},
                "msgElements": [{
                    "elementType": 1,
                    "elementId": "",
                    "textElement": {
                        "content": msg,
                        "atType": 0,
                        "atUid": "",
                        "atTinyId": "",
                        "atNtUid": ""
                    }
                }],
                "msgAttributeInfos": new Map()
            }, null)
        }
    }

    //下面进行抢到红包的后续处理。没抢到则直接返回。
    if (result.grabRedBagRsp.recvdOrder.amount === "0") {
        console.log("[Grab-RedBag] 红包金额为0，后续处理跳过")
        return
    }

    //下面给对方发送消息
    if (config.thanksMsgs.length !== 0 && sendUin !== recvUin) {//给对方发送消息。抢自己的红包不发送消息
        await sleep(randomDelayForSend)
        pluginLog("准备给对方发送消息,随机延迟" + randomDelayForSend + "ms")
        console.log("[Grab-RedBag] 发送感谢消息")
        await pluginAPI.invokeNative('ntApi', "nodeIKernelMsgService/sendMsg", false, {
            "msgId": "0",
            "peer": {"chatType": chatType, "peerUid": peerUid, "guildId": ""},
            "msgElements": [{
                "elementType": 1,
                "elementId": "",
                "textElement": {
                    "content": config.thanksMsgs[Math.floor(Math.random() * config.thanksMsgs.length)],//随机选一条发
                    "atType": 0,
                    "atUid": "",
                    "atTinyId": "",
                    "atNtUid": ""
                }
            }],
            "msgAttributeInfos": new Map()
        }, null)
    }

    //抢完红包之后，记录下当前已抢的红包数量和总额
    pluginAPI.addTotalRedBagNum(1);
    pluginAPI.addTotalAmount(parseInt(result.grabRedBagRsp.recvdOrder.amount) / 100);
    console.log("[Grab-RedBag] ========== grabRedBag 执行完成 ==========")
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms))
}

function isCurrentTimeInRange(startTimeStr, endTimeStr) {
    // 获取当前时间
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // 将当前时间转换为分钟
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    // 将开始和结束时间转换为分钟
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

    const startTimeInMinutes = startHours * 60 + startMinutes;
    const endTimeInMinutes = endHours * 60 + endMinutes;

    // 处理跨午夜的情况
    if (startTimeInMinutes < endTimeInMinutes) {
        // 时间段不跨越午夜
        return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
    } else {
        // 时间段跨越午夜
        return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
    }
}