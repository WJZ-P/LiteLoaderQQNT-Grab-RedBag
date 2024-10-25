import {pluginLog} from "./frontLogUtils.js";

const grAPI = window.grab_redbag

export class SettingListeners {
    constructor(doc) {//传入一个document对象
        this.document = doc
    }

    async activeButtonListener() {
        const activeButton = this.document.querySelector('#gr-active-button')
        if ((await grAPI.getConfig()).isActive) activeButton.classList.toggle('is-active')


        activeButton.addEventListener('click', async () => {
            const isActive = (await grAPI.getConfig()).isActive
            activeButton.classList.toggle('is-active')

            if (isActive) {//准备关闭抢红包功能，那么要取消监听
                grAPI.sendMsgToChatWindows('LiteLoader.grab_redbag.unSubscribeListener')//发送消息给主进程，让主进程通知聊天界面取消监听

                pluginLog("取消监听红包消息")
            } else {//准备打开抢红包功能，那么就打开！
                grAPI.sendMsgToChatWindows('LiteLoader.grab_redbag.subscribeListener')//发送消息给主进程，让主进程通知聊天界面开始监听
                pluginLog("开始监听红包消息")
            }

            //修改状态
            await grAPI.setConfig({isActive: !isActive})
        })
    }

    async randomDelayButtonListener() {
        const delayButton = this.document.querySelector('#gr-random-delay-button')
        if ((await grAPI.getConfig()).useRandomDelay) delayButton.classList.toggle('is-active')

        delayButton.addEventListener('click', async () => {
            const useRandomDelay = (await grAPI.getConfig()).useRandomDelay
            delayButton.classList.toggle('is-active')
            //修改状态
            await grAPI.setConfig({useRandomDelay: !useRandomDelay})
        })
    }

    async lowerBoundInputListener() {
        const input = this.document.querySelector('#gr-lower-bound-input')
        input.value = (await grAPI.getConfig()).delayLowerBound
        input.addEventListener('change', async event => {
            await grAPI.setConfig({delayLowerBound: event.target.value})
        })
    }

    async upperBoundInputListener() {
        const input = this.document.querySelector('#gr-upper-bound-input')
        input.value = (await grAPI.getConfig()).delayUpperBound
        input.addEventListener('change', async event => {
            await grAPI.setConfig({delayUpperBound: event.target.value})
        })
    }


    async onLoad() {
        this.activeButtonListener()
        this.randomDelayButtonListener()
        this.lowerBoundInputListener()
        this.upperBoundInputListener()
    }
}
