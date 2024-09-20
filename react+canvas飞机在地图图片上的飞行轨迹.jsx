import React, { Component } from 'react';
import './test4.less';
import iconWindActive from '@/assets/icon/icon_wind_active.png'
import mapBG from '@/assets/img/map_bg.png'

class DataCount extends Component {
    constructor(props) {
        super(props)
        this.state = {
            canvas: null,
            canvasPoint: null,
            canvasMove: null,
            center: {}, // 迁徙线起点位置
            directionArr: [], // 迁徙线终点位置
            endKeep: [], // 保存一下各个迁徙线起点
            end: [], // 运动中的各迁徙线时间p时所在位置
            p: 0, // 时间记录，每到1时变为0
            step: 0.005, // 时间每次递增量
            animationSpeed: 0.03, // 点动画效果圆圈每次增加量
            dotNumber: 25, // 动画迁徙线 动态的线的部分由多少个点组成
            rate: 1.053, // 1.033 贝塞尔曲线计算时用到的参数
            requestAnimationFrameName: '',
            compareData: [ // 用于临时计算各终点位置的参数
                { x: 0.65, y: 0.89 },
                { x: 0.094, y: 0.76 },
                { x: 0.95, y: 0.28 },
                { x: 0.19, y: 0.19 },
                { x: 0.49, y: 0.08 }
            ],
            radius: 1, // 航路点半径
            radiusRing: 1,
            radiusRingMin: 1,
            radiusRingMax: 25, // 最大设为25时，涟漪消失的不会很突兀
            dotColor: '243,254,193',
            ringColor: 'rgba(236,210,32,0.5)',
            plane: null
        }
        this.drawMove = this.drawMove.bind(this)
    }
    componentDidMount() {
        this.state.plane = document.getElementById('airportIcon');
        this.init();
    }
    init() {
        // 获取需要画布达到的宽高数据
        const mapBox = document.getElementsByClassName('mapBox')[0];
        const width = mapBox.offsetWidth;
        const height = mapBox.offsetHeight;
        // 拿到三个画布，给定宽高
        const canvas = document.getElementById('canvas');
        const canvasPoint = document.getElementById('canvasPoint');
        const canvasMove = document.getElementById('canvasMove');
        canvas.width = width;
        canvas.height = height;
        canvasPoint.width = width;
        canvasPoint.height = height;
        canvasMove.width = width;
        canvasMove.height = height;
        this.state.canvas = canvas.getContext('2d');
        this.state.canvasPoint = canvasPoint.getContext('2d');
        this.state.canvasMove = canvasMove.getContext('2d');
        // 找到所有迁徙线起点，项目中我的起点是太原，所以大概找到一下
        this.state.center = {
            x: Math.ceil(width * 0.52),
            y: Math.ceil(height * 0.48)
        };
        // 各线终点 以下仅为参考，具体以项目要求为准
        for (let i = 0; i <= 4; i++) {
            this.state.directionArr[i] = {
                x: Math.ceil(width * this.state.compareData[i].x),
                y: Math.ceil(height * this.state.compareData[i].y)
            }
            this.state.endKeep[i] = {
                x: this.state.center.x,
                y: this.state.center.y
            };
        }
        this.state.end = JSON.parse(JSON.stringify(this.state.endKeep));
        // 画线开始
        this.drawAllLine();
    }
    drawAllLine() {
        // 根据每个点分别画线
        this.state.directionArr.forEach(item => {
            this.drawLine(item);
        });
        this.drawMove();
    }
    drawLine({ x, y }) {
        this.state.canvas.beginPath();
        this.state.canvas.moveTo(this.state.center.x, this.state.center.y); // 起始点（x,y）
        // 计算贝塞尔曲线控制点位置
        const coord = this.calcCp([x, y], [this.state.center.x, this.state.center.y]);
        this.state.canvas.quadraticCurveTo(coord.x, coord.y, x, y); //创建二次贝塞尔曲线
        // 线宽1
        this.state.canvas.lineWidth = 1;
        // 线颜色
        this.state.canvas.strokeStyle = '#5cb85c';
        this.state.canvas.stroke();
        this.state.canvas.closePath();
    }
    drawPoint(x1, y1) {
        // 最里圈小圆
        this.state.canvasPoint.fillStyle = `rgba(${this.state.dotColor}, 1)`;
        this.state.canvasPoint.beginPath();
        this.state.canvasPoint.arc(x1, y1, this.state.radius, 0, 2 * Math.PI);
        this.state.canvasPoint.closePath();
        this.state.canvasPoint.fill();

        // 外层小圆
        this.state.canvasPoint.fillStyle = `rgba(${this.state.dotColor}, 0.3)`;
        this.state.canvasPoint.beginPath();
        this.state.canvasPoint.arc(x1, y1, this.accAdd(this.state.radius, 3), 0, 2 * Math.PI);
        this.state.canvasPoint.closePath();
        this.state.canvasPoint.fill();

        // 以下为涟漪部分
        if (this.state.radiusRing >= this.state.radiusRingMax) {
            this.state.radiusRing = this.state.radiusRingMin;
        }
        this.state.canvasPoint.fillStyle = this.state.ringColor;
        this.state.canvasPoint.beginPath();
        this.state.canvasPoint.arc(x1, y1, this.state.radiusRing, 0, 2 * Math.PI);
        this.state.canvasPoint.closePath();
        this.state.canvasPoint.fill();
        // this.radiusRing += 0.03;
        this.state.radiusRing += this.state.animationSpeed;
        this.state.ringColor =
            this.state.ringColor
                .split(',')
                .slice(0, 3)
                .join(',') +
            ',' +
            (0.5 - (this.state.radiusRing - this.state.radiusRingMin) * 0.02) +
            ')';
    }
    drawMivie(index) {
        const {directionArr, center, p, canvasMove, end, dotNumber, step, dotColor, } = this.state
        // 获取当前时间p时贝塞尔曲线的x, y点
        const coord = this.calcCp(
            [directionArr[index].x, directionArr[index].y],
            [center.x, center.y]
        );
        const x = this.calcRightNow(p, center.x, coord.x, directionArr[index].x);
        const y = this.calcRightNow(p, center.y, coord.y, directionArr[index].y);
        canvasMove.beginPath();
        canvasMove.moveTo(end[index].x, end[index].y);
        canvasMove.lineTo(x, y);
        const gnt1 = canvasMove.createLinearGradient(end[index].x, end[index].y, x, y);
        gnt1.addColorStop(0, '#fff');
        gnt1.addColorStop(1, '#ECD220');
        canvasMove.strokeStyle = gnt1;
        canvasMove.lineWidth = 1;
        canvasMove.stroke();
        // this.canvasMove.closePath();
        for (var i = 0; i < dotNumber; i++) {
            let _t = p - step * i * 2 >= 0 ? p - step * i * 2 : 1 + (p - step * i * 2);
            const coord1 = this.calcCp(
                [directionArr[index].x, directionArr[index].y],
                [center.x, center.y]
            );
            const x1 = this.calcRightNow(_t, center.x, coord1.x, directionArr[index].x);
            const y1 = this.calcRightNow(_t, center.y, coord1.y, directionArr[index].y);
            canvasMove.fillStyle = 'rgba(' + dotColor + ',' + (1 - (1 / dotNumber) * i) + ')';
            canvasMove.beginPath();
            canvasMove.arc(x1, y1, 1, 0, 2 * Math.PI);
            canvasMove.fill();
            canvasMove.closePath();
        }
        // 加个小飞机图标飞起来
        const xx = this.calcRightNow(p + step * 3, center.x, coord.x, directionArr[index].x);
        const yy = this.calcRightNow(p + step * 2, center.y, coord.y, directionArr[index].y);
        const img = this.createIcon(xx, yy, index);
        canvasMove.drawImage(img, xx - 8, yy - 8);
        end[index].x = x;
        end[index].y = y;
    }
    // 获取当前时间p时贝塞尔曲线的x, y点, 此方法不区分x y
    calcRightNow(p, start, controlPoint, end) {
        return Math.pow(1 - p, 2) * start + 2 * p * (1 - p) * controlPoint + Math.pow(p, 2) * end;
    }
    getAngle(x, y) {
        var radian = Math.atan(y / x); // 弧度
        var angle = Math.floor(180 / (Math.PI / radian)); // 弧度转角度
        if (x < 0) {
            // x小于0的时候加上180°，即实际角度
            angle = angle + 180;
        }
        return angle;
    }
    createIcon(x, y, index) {
        const deg = this.getAngle(x - this.state.end[index].x, y - this.state.end[index].y);
        const c = document.createElement('canvas');
        c.width = 16;
        c.height = 16;
        const cCtx = c.getContext('2d');
        cCtx.translate(8, 8);
        if (y < this.state.end[index].y && ((Math.abs(deg) > 80 && Math.abs(deg) < 91) || (deg > 240 && deg < 270))) {
            cCtx.drawImage(this.state.plane, -8, -8);
        } else if (x >= this.state.end[index].x && y < this.state.end[index].y) {
            cCtx.rotate(((-deg + 20) * Math.PI) / 180);
            cCtx.drawImage(this.state.plane, -8, -8);
            cCtx.rotate(((deg - 20) * Math.PI) / 180);
        } else if (x < this.state.end[index].x && y < this.state.end[index].y) {
            cCtx.rotate(((-deg + 160) * Math.PI) / 180);
            cCtx.drawImage(this.state.plane, -8, -8);
            cCtx.rotate(((deg - 160) * Math.PI) / 180);
        } else if (x < this.state.end[index].x && y >= this.state.end[index].y) {
            cCtx.rotate(((-deg + 45) * Math.PI) / 180);
            cCtx.drawImage(this.state.plane, -8, -8);
            cCtx.rotate(((deg - 45) * Math.PI) / 180);
        } else {
            cCtx.rotate(((225 - deg) * Math.PI) / 180);
            cCtx.drawImage(this.state.plane, -8, -8);
            cCtx.rotate(((deg - 225) * Math.PI) / 180);
        }
        return c;
    }
    drawMove() {
        cancelAnimationFrame(this?.state.requestAnimationFrameName);
            // 动态线的画布
            this.state.canvasMove.clearRect(0, 0, 10000, 10000);
            if (this.state.p >= 1) {
                this.state.p = this.state.step;
                this.state.end = JSON.parse(JSON.stringify(this.state.endKeep));
            }
            // 点的画布
            this.state.canvasPoint.clearRect(0, 0, 10000, 10000);
            this.drawPoint(this.state.center.x, this.state.center.y);
            this.state.directionArr.forEach((item, index) => {
                this.drawMivie(index);
                this.drawPoint(item.x, item.y);
            });
            this.state.p = this.accAdd(this.state.p, this.state.step);
            this.state.requestAnimationFrameName = requestAnimationFrame(this.drawMove);
    }
    /*
         * num: 要被转换的数字
         * exnum: 当前中心坐标 不一定是x还是y
         */
    calcCp(start, end) {
        let middleX = 0;
        let middleY = 0;
        if (start[0] > end[0] && start[1] > end[1]) {
            middleX = ((start[0] + end[0]) / 2) * this.state.rate;
            middleY = ((start[1] + end[1]) / 2) * (2 - this.state.rate);
        }
        if (start[0] > end[0] && start[1] < end[1]) {
            middleX = ((start[0] + end[0]) / 2) * this.state.rate;
            middleY = ((start[1] + end[1]) / 2) * this.state.rate;
        }
        if (start[0] < end[0] && start[1] > end[1]) {
            middleX = ((start[0] + end[0]) / 2) * (2 - this.state.rate);
            middleY = ((start[1] + end[1]) / 2) * (2 - this.state.rate);
        }
        if (start[0] < end[0] && start[1] < end[1]) {
            middleX = ((start[0] + end[0]) / 2) * (2 - this.state.rate);
            middleY = ((start[1] + end[1]) / 2) * this.state.rate;
        }
        return {
            x: middleX,
            y: middleY
        };
    }
    accAdd(arg1, arg2) {
        let r1, r2, m;
        try {
            r1 = arg1.toString().split('.')[1].length;
        } catch (e) {
            r1 = 0;
        }
        try {
            r2 = arg2.toString().split('.')[1].length;
        } catch (e) {
            r2 = 0;
        }
        m = Math.pow(10, Math.max(r1, r2));
        return (arg1 * m + arg2 * m) / m;
    }
    render() {
        return (
            <div className="box" >
                <div className="mapBox">
                    <div className="map">
                        <img src={mapBG} alt="" />
                    </div>
                    {/* 线 */}
                    <canvas id='canvas' className="canvas" />
                    {/* 点 */}
                    <canvas id='canvasPoint' className="canvas" />
                    {/* 动态效果 */}
                    <canvas id='canvasMove' className="canvas" />
                    <img className="airport" id="airportIcon" src={iconWindActive} alt="" />
                </div>
            </div>
        )
    }
}

export default DataCount;
