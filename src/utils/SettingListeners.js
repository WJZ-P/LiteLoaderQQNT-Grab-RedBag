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

    async activeAllGroupsButtonListener() {
        const button = this.document.querySelector('#gr-active-all-chat-button')
        if ((await grAPI.getConfig()).isActiveAllGroups) button.classList.toggle('is-active')

        button.addEventListener('click', async () => {
            const isActiveAllGroups = (await grAPI.getConfig()).isActiveAllGroups
            button.classList.toggle('is-active')
            //修改状态
            await grAPI.setConfig({isActiveAllGroups: !isActiveAllGroups})
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

    async lowerBoundSendInputListener() {
        const input = this.document.querySelector('#gr-lower-bound-send-input')
        input.value = (await grAPI.getConfig()).delayLowerBoundForSend
        input.addEventListener('change', async event => {
            await grAPI.setConfig({delayLowerBoundForSend: event.target.value})
        })
    }

    async upperBoundSendInputListener() {
        const input = this.document.querySelector('#gr-upper-bound-send-input')
        input.value = (await grAPI.getConfig()).delayUpperBoundForSend
        input.addEventListener('change', async event => {
            await grAPI.setConfig({delayUpperBoundForSend: event.target.value})
        })
    }

    async feedbackMsgButtonListener() {
        const button = this.document.querySelector('#gr-feedback-msg-button')
        if ((await grAPI.getConfig()).useSelfNotice) button.classList.toggle('is-active')

        button.addEventListener('click', async () => {
            const useSelfNotice = (await grAPI.getConfig()).useSelfNotice
            button.classList.toggle('is-active')
            //修改状态
            await grAPI.setConfig({useSelfNotice: !useSelfNotice})
        })
    }

    async thanksMsgsInputListener() {
        const input = this.document.querySelector('#gr-thanks-msg-input')
        input.value = (await grAPI.getConfig()).thanksMsgs.join(",")
        input.addEventListener('change', async event => {
            await grAPI.setConfig({thanksMsgs: event.target.value.split(',').filter(item => item.trim() !== "")})
        })
    }

    async avoidWordsInputListener() {
        const input = this.document.querySelector('#gr-avoid-words-input')
        input.value = (await grAPI.getConfig()).avoidKeyWords.join(",")
        input.addEventListener('change', async event => {
            await grAPI.setConfig({avoidKeyWords: event.target.value.split(',').filter(item => item.trim() !== "")})
        })
    }

    async avoidGroupsInputListener() {
        const input = this.document.querySelector('#gr-avoid-groups-input')
        input.value = (await grAPI.getConfig()).avoidGroups.join(",")
        input.addEventListener('change', async event => {
            await grAPI.setConfig({avoidGroups: event.target.value.split(',').filter(item => item.trim() !== "")})
        })
    }

    async keyWordsInputListener() {
        const input = this.document.querySelector('#gr-key-words-input')
        input.value = (await grAPI.getConfig()).listenKeyWords.join(",")
        input.addEventListener('change', async event => {
            await grAPI.setConfig({listenKeyWords: event.target.value.split(',').filter(item => item.trim() !== "")})
        })
    }

    async QQNumberInputListener() {
        const input = this.document.querySelector('#gr-Send2Who-input')
        input.value = (await grAPI.getConfig()).Send2Who.join(",")
        input.addEventListener('change', async event => {
            await grAPI.setConfig({Send2Who: event.target.value.split(',').filter(item => item.trim() !== "")})
        })
    }

    async keyGroupsInputListener() {
        const input = this.document.querySelector('#gr-key-groups-input')
        input.value = (await grAPI.getConfig()).listenGroups.join(",")
        input.addEventListener('change', async event => {
            await grAPI.setConfig({listenGroups: event.target.value.split(',').filter(item => item.trim() !== "")})
        })
    }

    //监听黑、白名单模式切换
    async blockTypeListener() {
        let blockType = undefined
        const typeSelEl = this.document.querySelector('#gr-block-type-selector')
        typeSelEl.value = (await grAPI.getConfig()).blockType

        typeSelEl.addEventListener('change', async event => {
            blockType = event.target.value

            // 发送设置密钥事件
            await grAPI.setConfig({blockType: blockType})
            console.log('[GR]名单设置为' + blockType)
        })
    }


    async onLoad() {
        this.activeButtonListener()
        this.randomDelayButtonListener()
        this.lowerBoundInputListener()
        this.upperBoundInputListener()
        this.feedbackMsgButtonListener()
        this.thanksMsgsInputListener()
        this.avoidWordsInputListener()
        this.avoidGroupsInputListener()
        this.activeAllGroupsButtonListener()
        this.blockTypeListener()
        this.keyGroupsInputListener()
        this.keyWordsInputListener()
        this.QQNumberInputListener()
        this.lowerBoundSendInputListener()
        this.upperBoundSendInputListener()
    }
}
