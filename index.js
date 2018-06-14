import React from 'react'

const isIE = () => {
    return window.navigator.pointerEnabled || window.navigator.msPointerEnabled;
};

export default class PellEditor extends React.Component {

	constructor() {
		super();
		this.container                = null;
		this.editor                   = null;
		this.editorElem               = null;
		this.lastEditRange            = null;
		this.selection                = document.getSelection() || document.selection;
		this.editorChange             = this.editorChange.bind(this);
		this.editorPaste              = this.editorPaste.bind(this);
		this.editorKeyDown            = this.editorKeyDown.bind(this);
		this.editorClear              = this.editorClear.bind(this);
		this.editorInsertImage        = this.editorInsertImage.bind(this);
		this.editorFocus              = this.editorFocus.bind(this);
		this.editorBlur               = this.editorBlur.bind(this);
		this.editorClick              = this.editorClick.bind(this);
		this.editorKeyUp              = this.editorKeyUp.bind(this);
		this.editorInsertNewLine      = this.editorInsertNewLine.bind(this);
		this.editorScrollToBottom     = this.editorScrollToBottom.bind(this);
		this.editorImageControlSelect = this.editorImageControlSelect.bind(this);
		this.editorInsertText         = this.editorInsertText.bind(this);
	}

	// 编辑框内容发生变化
	editorChange(e) {
		this.lastEditRange = this.selection.getRangeAt(0);
		this.editorAnchorIsEnd() && this.editorScrollToBottom();
	}

	// 获取剪切板里面的字符串
	editorGetClipboardData(items) {
		return new Promise(resolve => {
			const item = items.length > 1 ? items[1] : items[0];
			if (item.kind === 'string') {
				item.getAsString(str => {
					resolve(str);
				});
			} else {
				resolve('');
			}
		})
	}

	pellEditorHandlePast = (html)=> {
        html = html.replace(/<img[\w\-\s"=;:]*src="[/.\w:]+\/(s\d{2})\.png"[\w\s\-"=;:]*\/?>/g, '#E-$1');
        const div = document.createElement('div');
		div.innerHTML = html;
		document.body.appendChild(div)
        html = div.innerText.replace(/\r/g, '');
        html = div.innerText.replace(/\n/g, '');
        const contentStr = [];
        let fragment = '';
        for(let i = 0, len = html.length; i < len; i++) {
            const tempFragment = html.substr(i, len);
            if(/^#E-s\d{2}/.test(tempFragment)) {
                !!fragment && contentStr.push(fragment);
                contentStr.push(tempFragment.substr(0, 6));
                i = i + 5;
                fragment = '';
            } else {
                fragment += html[i]
            }
        }
        contentStr.push(fragment);
        for(let i = 0, len = contentStr.length; i < len; i ++) {
            if(/^#E-s\d{2}/.test(contentStr[i])) {
                this.editorInsertImage(`//storage.360buyimg.com/jimi/resources/images/${contentStr[i].substr(3,6)}.png`);
            } else {
                this.editorInsertText(contentStr[i])
            }
        }
        return false;
    }

	// 编辑框有内容粘贴
	editorPaste(e) {
		e.preventDefault();
		e.stopPropagation();
		this.editorGetClipboardData(e.clipboardData.items).then(str => {
			str = this.pellEditorHandlePast(str);
			if (str) {
				const div = document.createElement('div');
				div.innerHTML = str;
				str = div.innerText.replace(/\r/g, '');
				str = div.innerText.replace(/\n/g, '');
			}
		});
	}

	// 编辑框按钮按下事件
	editorKeyDown(e) {
		const { keyBindingFn, handleKeyCommand } = this.props;
		if (keyBindingFn) {
			const cmd = keyBindingFn(e);
			if (cmd) {
				e.preventDefault();
				e.stopPropagation();
				handleKeyCommand(cmd);
				return;
			}
		}
		if (e.keyCode === 13) {
			e.preventDefault();
			e.stopPropagation();
			this.editorInsertNewLine();
		}

	}

	// 当键盘按键弹起时
	editorKeyUp(e) {
		this.editorChange();
	}

	// 清除编辑框中的内容
	editorClear() {
		this.editorFocus();
		this.editorElem.innerHTML = '';
		this.editorChange();
	}

	editorImageControlSelect() {
		return false;
	}

	// 设置图片不可编辑
	editorDisableEditImg() {
		const images = this.editorElem.querySelectorAll('img');
		if (!images.length) {
			return;
		}
		for (let i = 0, len = images.length; i < len; i++) {
			images[i].contentEditable = false;
			images[i].setAttribute('unselectable', 'on');
		}
	}

	// 插入图片
	editorInsertImage(url) {
		this.editorFocus();
		if (this.lastEditRange) {
			this.selection.removeAllRanges();
			this.selection.addRange(this.lastEditRange);
		}
		document.execCommand('insertImage', false, url);
		if (isIE()) {
			let anchorOffset = this.selection.anchorOffset;
			const childNodes = this.editorElem.childNodes;
			const anchorNode = this.selection.anchorNode;
			if (anchorNode.nodeName === '#text') {
				for (let i = 0, len = childNodes.length; i < len; i++) {
					if (anchorNode === childNodes[i]) {
						anchorOffset = i + 1;
					}
				}
			}
			let activeNode = null;
			for (let i = 0, len = childNodes.length; i < len; i++) {
				if (anchorOffset === i) {
					activeNode = childNodes[i];
				}
			}
			const range = document.createRange();
			range.selectNodeContents(this.editorElem);
			range.collapse(true);
			range.setEnd(this.editorElem, anchorOffset + 1);
			range.setStart(this.editorElem, anchorOffset + 1);
			this.selection.removeAllRanges();
			this.selection.addRange(range);
		}
		this.editorChange();
		this.editorFocus();
	}

	// 插入文本
	editorInsertText(text) {
		this.editorFocus();
		if (this.lastEditRange) {
			this.selection.removeAllRanges();
			this.selection.addRange(this.lastEditRange);
		}
		document.execCommand('insertText', false, text);
		this.editorChange();
	}

	// 点击编辑框
	editorClick() {
		this.lastEditRange = this.selection.getRangeAt(0);
	}

	// 编辑框获取焦点
	editorFocus() {
		this.editorElem.focus();
	}

	// 编辑框失去焦点
	editorBlur() {
		this.editorElem.blur();
	}

	// 插入新的一行
	editorInsertNewLine() {
		const last = this.editorAnchorIsEnd();
		if (isIE()) {
			const range = document.selection.createRange();
			range.text = '\r\n';
		} else {
			const last = this.editorAnchorIsEnd();
			document.execCommand('insertHTML', false, last ? '<br/><br/>' : '<br/>');
		}
		this.editorChange();

	}

	// 判断焦点是否在最后
	editorAnchorIsEnd() {
		let last = false;
		const anchorNode = this.selection.anchorNode;
		const nodeName = anchorNode.nodeName;
		const anchorOffset = this.selection.anchorOffset;
		const nextNode = anchorNode.nextSibling;
		const childNodes = this.editorElem.childNodes;
		if (nodeName === 'PRE') {
			if (childNodes.length - anchorOffset <= 1) {
				last = true;
			}
		} else {
			// 在文本区域
			if (anchorNode.nodeValue && anchorOffset === anchorNode.nodeValue.length) {
				if (nextNode === null || nextNode.nodeName === 'BR') {
					last = true;
				}
			}
		}
		return last;
	}

	// 编辑框滚动到最底部
	editorScrollToBottom() {
		// this.editorElem.scrollTop = this.editorElem.scrollHeight;
	}

	// 渲染组件
	render() {
		return (<div className="pell-editor-wrapper">
				<div contentEditable
					ref={ref => this.editor = ref}
					className="pell-editor-content"
					onPaste={this.editorPaste}
					onKeyDown={this.editorKeyDown}
					onKeyUp={this.editorKeyUp}
					onClick={this.editorClick}
				></div>
			</div>);
	}

	// 检测editorState是否发生了改变
	componentWillReceiveProps(nextProps) {
		if (this.props.editorState !== nextProps.editorState) {
			this.aspectOuterApi();
		}
	}

	// 组建渲染完成
	componentDidMount() {
		this.editorElem = document.getElementsByClassName('pell-editor-wrapper')[0];
		this.aspectOuterApi();
		this.editorFocus();
	}
}