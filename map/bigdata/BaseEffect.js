/*
 * @Author: hejin.gao gaohj@zhiwyl.com
 * @Date: 2023-12-09 14:55:56
 * @LastEditors: hejin.gao gaohj@zhiwyl.com
 * @LastEditTime: 2023-12-13 16:58:09
 * @FilePath: \webgl-kit\packages\kit-effects\BaseEffect.js
 * @Description: 
 * 
 * Copyright (c) 2023 by ${git_name_email}, All Rights Reserved. 
 */
export default class BaseEffect {

    // 构造函数
    constructor(viewer) {
		if( !Cesium.defined(viewer) ) throw new Error("viewer is not undefine!");
        this._v = viewer;
        this._c = viewer.camera;
        this._s = viewer.scene;
        this._show = true;
        this._options = {};
    }

    /**
     * 绘制
     * @param {object} options  参数对像
     */
    draw(options) {
        this._options = options;
    }

    /**
     * 定位到对象
     */
    flyTo() { }

    /**
     * 消毁对象
     */
    destroy() { }

    /**
     * 显示/隐藏
     * @param {boolean} bool 
     */
    set show(bool) {
        this._show = bool;
        if (bool) {
            // set entity or primitive/datasource show.
        }
    }
    get show() {
        return this._show;
    }
}