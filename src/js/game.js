window.$p1 = document.getElementById('p1');
window.$p2 = document.getElementById('p2');



var Game = function (Role) {
  this.myRole = Role
  this.activeUser = 'p1'
  // 基本参数
  this.config = {
    isMobile: false,
    helper: false, // 默认关闭helper
    background: 0x282828, // 背景颜色
    ground: -1, // 地面y坐标
    fallingSpeed: 0.2, // 游戏失败掉落速度
    cubeColor: 0xbebebe,
    cubeWidth: 3, // 方块宽度
    cubeHeight: 1, // 方块高度
    cubeDeep: 3, // 方块深度
    // cubeWidth: 4, // 方块宽度
    // cubeHeight: 2, // 方块高度
    // cubeDeep: 4, // 方块深度
    jumperColor: 0x333333,
    jumperWidth: 1, // jumper宽度
    jumperHeight: 2, // jumper高度
    jumperDeep: 1, // jumper深度
  }
  // 方块配置
  this.blockMap = [
    {
      geometry: 'CylinderGeometry',
      materia: 1,
      nextDir: 'left',
      range: 3.7
    },
    {
      geometry: 'CubeGeometry',
      materia: 2,
      nextDir: 'right',
      range: 1.2
    }
  ]
  this.blockMapMax = this.blockMap.length - 1;
  // 游戏状态
  this.score = 0
  this.size = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  this.scene = new THREE.Scene()
  this.cameraPos = {
    current: new THREE.Vector3(0, 0, 0), // 摄像机当前的坐标
    next: new THREE.Vector3() // 摄像机即将要移到的位置
  }
  this.camera = new THREE.OrthographicCamera(this.size.width / -80, this.size.width / 80, this.size.height / 80, this.size.height / -80, 0, 5000)
  this.renderer = new THREE.WebGLRenderer({antialias: true})

  var planceGeometry = new THREE.PlaneGeometry(this.size.width, this.size.height);    // PlaneGeometry: 翻译 平面几何    (参数: 宽60, 高20)
  var planeMaterial = new THREE.MeshLambertMaterial({ color: 0xdddddd });    // MeshLambertMaterial: 翻译 网格材质    (用来设置平面的外观, 颜色，透明度等)
  var plane = new THREE.Mesh(planceGeometry, planeMaterial);    // 把这2个对象合并到一个名为plane(平面)的Mesh(网格)对象中
  plane.receiveShadow = true;    // 平面接收阴影
  plane.rotation.x = -0.5*Math.PI;    // 绕x轴旋转90度
  plane.position.x = 0;    // 平面坐标位置
  plane.position.y = -1;
  plane.position.z = 0;
  this.plane = plane;
  this.scene.add(this.plane);    // 将平面添加到场景


  this.cubes = [] // 方块数组
  this.cubeStat = {
    nextDir: '' // 下一个方块相对于当前方块的方向: 'left' 或 'right'
  }
  this.jumperStat = {
    ready: false, // 鼠标按完没有
    xSpeed: 0, // xSpeed根据鼠标按的时间进行赋值
    ySpeed: 0  // ySpeed根据鼠标按的时间进行赋值
  }
  this.falledStat = {
    location: -1, // jumper所在的位置
    distance: 0 // jumper和最近方块的距离
  }
  this.fallingStat = {
    speed: 0.2, // 游戏失败后垂直方向上的掉落速度
    end: false // 掉到地面没有
  }
  this.combo = 0; // 连续调到中心的次数，起始为0

}
Game.prototype = {
  init: function (initBlockList) {
    this._checkUserAgent() // 检测是否移动端
    this._setCamera() // 设置摄像机位置
    this._setRenderer() // 设置渲染器参数
    this._setLight() // 设置光照
    // this._createCube() // 加一个方块
    // this._createCube() // 再加一个方块
    this._initCreateCube(initBlockList) // 初始化两个块
    this._createJumper() // 加入游戏者jumper
    this._updateCamera() // 更新相机坐标

    if(this.config.helper){  // 开启helper
      this._createHelpers();
    }

    var self = this
    var mouseEvents = (self.config.isMobile) ?
    {
      down: 'touchstart',
      up: 'touchend',
    }
    :
    {
      down: 'mousedown',
      up: 'mouseup',
    }
    // 事件绑定到canvas中
    var canvas = document.querySelector('canvas')
    canvas.addEventListener(mouseEvents.down, function () {
      // console.log('mousedown');
      if (self.myRole === self.activeUser) {
        self._handleMousedown()
      } else {
        console.log('还没轮到你呢！');
      }
    })
    // 监听鼠标松开的事件
    canvas.addEventListener(mouseEvents.up, function (evt) {
      // console.log('mouseup');
      if (self.myRole === self.activeUser) {
        self._handleMouseup()
      } else {
        console.log('还没轮到你呢！');
      }
    })
    // 监听窗口变化的事件
    window.addEventListener('resize', function () {
      self._handleWindowResize()
    })
  },
  // 游戏失败重新开始的初始化配置
  restart: function () {
    this.score = 0
    this.switchActiveUser(true);
    this.cameraPos = {
      current: new THREE.Vector3(0, 0, 0),
      next: new THREE.Vector3()
    }
    this.fallingStat = {
      speed: 0.2,
      end: false
    }
    // 删除所有方块
    var length = this.cubes.length
    for(var i=0; i < length; i++){
      this.scene.remove(this.cubes.pop())
    }
    // 删除jumper
    this.scene.remove(this.jumper)
    // 显示的分数设为 0
    this.successCallback(this.score)
    this._createCube()
    this._createCube()
    this._createJumper()
    this._updateCamera()
  },
  // 游戏成功的执行函数, 外部传入
  addSuccessFn: function (fn) {
    this.successCallback = fn
  },
  // 游戏失败的执行函数, 外部传入
  addFailedFn: function (fn) {
    this.failedCallback = fn
  },
  // 检测是否手机端
  _checkUserAgent: function () {
    var n = navigator.userAgent;
    if (n.match(/Android/i) || n.match(/webOS/i) || n.match(/iPhone/i) || n.match(/iPad/i) || n.match(/iPod/i) || n.match(/BlackBerry/i)){
      this.config.isMobile = true
    }
  },
  // THREE.js辅助工具
  _createHelpers: function () {
    // 法向量辅助线
    var axesHelper = new THREE.AxesHelper(10)
    this.scene.add(axesHelper);

    // 平行光辅助线
    var helper = new THREE.DirectionalLightHelper(this.directionalLight, 5 );
    this.scene.add( helper );
  },
  // 窗口缩放绑定的函数
  _handleWindowResize: function () {
    this._setSize()
    this.camera.left = this.size.width / -80
    this.camera.right = this.size.width / 80
    this.camera.top = this.size.height / 80
    this.camera.bottom = this.size.height / -80
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.size.width, this.size.height)
    this._render()
  },
  /**
   *鼠标按下或触摸开始绑定的函数
   *根据鼠标按下的时间来给 xSpeed 和 ySpeed 赋值
   *@return {Number} this.jumperStat.xSpeed 水平方向上的速度
   *@return {Number} this.jumperStat.ySpeed 垂直方向上的速度
  **/
  _handleMousedown: function () {
    var self = this

    self.pressDownCount = 0;
    console.log(self.jumper.position.y);

    function act() {
    // if (!self.jumperStat.ready && self.jumper.scale.y > 0.02) {
      // 以jumperBody蓄力一半为最大值
      if (!self.jumperStat.ready && self.jumperBody.scale.y > 0.02 &&  self.jumperBody.scale.y >= 0.5) {
        self.pressDownCount += 1;
        self.jumperBody.scale.y -= 0.01  // jumper随按压时间降低高度，即减小jumper.scale.y值
        // self.jumper.scale.y -= 0.01  // jumper随按压时间降低高度，即减小jumper.scale.y值
        self.jumperHead.position.y -= 0.02 // jumper头部跟随下降

        self.jumperStat.xSpeed += 0.004
        self.jumperStat.ySpeed += 0.008

        self.jumperStat.yTimes = (1 - self.jumperBody.scale.y) / 0.01; // 计算倍数, 用于jumper在y轴的旋转
        // console.log( self.jumperBody.scale.y, self.jumperStat.yTimes );

        self.mouseDownFrameHandler =  requestAnimationFrame(act);
      }
      self._render(self.scene, self.camera);
    }
    act();
  },
  _handleReceiveMouseDown: function(count) {
    var self = this

    var pressCount = count;
    console.log(self.jumper.position.y);

    function act() {
    // if (!self.jumperStat.ready && self.jumper.scale.y > 0.02) {
      // 以jumperBody蓄力一半为最大值
      if (pressCount > 0) { 
        pressCount --;
        self.pressDownCount += 1;
        self.jumperBody.scale.y -= 0.01  // jumper随按压时间降低高度，即减小jumper.scale.y值
        // self.jumper.scale.y -= 0.01  // jumper随按压时间降低高度，即减小jumper.scale.y值
        self.jumperHead.position.y -= 0.02 // jumper头部跟随下降

        self.jumperStat.xSpeed += 0.004
        self.jumperStat.ySpeed += 0.008

        self.jumperStat.yTimes = (1 - self.jumperBody.scale.y) / 0.01; // 计算倍数, 用于jumper在y轴的旋转
        // console.log( self.jumperBody.scale.y, self.jumperStat.yTimes );

        self.mouseDownFrameHandler =  requestAnimationFrame(act);

        self._render(self.scene, self.camera);
      } else {
        self._handleMouseup();
      }
    }
    act();
  },
  // 鼠标松开或触摸结束绑定的函数
  _handleMouseup: function () {
    var self = this
    // console.log('self.jumperStat.xSpeed', self.jumperStat.xSpeed);
    // console.log('self.jumperStat.ySpeed', self.jumperStat.ySpeed);
    // console.log('self.self.jumper.position.y :>> ', self.jumper.position.y);
    if (self.activeUser === self.myRole) {
      console.log('self. :>> ', self.pressDownCount);
      self.notifyInfo({
        type: "jump",
        data: self.pressDownCount
      })
    }
    // 标记鼠标已经松开
    self.jumperStat.ready = true;
    cancelAnimationFrame(self.mouseDownFrameHandler);
    var frameHandler;

    function act() {
      // console.log('---------');
      // console.log('yspeed:',self.jumperStat.ySpeed );
      // console.log('py:',self.jumper.position.y );
      // console.log('---------');
      // 判断jumper是在方块水平面之上，是的话说明需要继续运动
      // if (self.jumper.position.y >= 1) { // 此处不应该只判断jumper的位置，而是应该判断jumper的y速度
      if (self.jumperStat.ySpeed > 0 || self.jumper.position.y >= 1) {
        // jumper根据下一个方块的位置来确定水平运动方向

        var jumperRotateBase = self.jumperStat.yTimes / 2;

        if (self.cubeStat.nextDir === 'left') {
          self.jumper.position.x -= self.jumperStat.xSpeed
          // 在20倍以上的程度才有翻转效果
          // if(self.jumperStat.yTimes > 30){
          //   // 小人起跳翻转
          //   if(self.jumper.rotation.z < Math.PI*2){
          //       self.jumper.rotation.z += Math.PI / jumperRotateBase;
          //   }
          //   // 到达最高点
          //   if(self.jumperStat.ySpeed == 0){
          //     self.jumper.rotation.z = Math.PI;
          //   }
          // }

        } else {
          self.jumper.position.z -= self.jumperStat.xSpeed
          // 在20倍以上的程度才有翻转效果
          // if(self.jumperStat.yTimes > 30){
          //   // 小人起跳翻转
          //   if(self.jumper.rotation.x < Math.PI*2){
          //     self.jumper.rotation.x -= Math.PI / jumperRotateBase;
          //   }
          //   // 到达最高点
          //   if(self.jumperStat.ySpeed == 0){
          //     self.jumper.rotation.x = -Math.PI;
          //   }
          // }
        }

        // jumper在垂直方向上运动
        self.jumper.position.y += self.jumperStat.ySpeed
        // 运动伴随着缩放
        if ( self.jumperBody.scale.y < 1 ) {
          self.jumperBody.scale.y += 0.02;
          self.jumperHead.position.y += 0.02 // 头部跟随上升
        }
        // jumper在垂直方向上先上升后下降
        self.jumperStat.ySpeed -= 0.01
        // 每一次的变化，渲染器都要重新渲染，才能看到渲染效果
        self._render(self.scene, self.camera)

        frameHandler = requestAnimationFrame(act);
      }else{
        cancelAnimationFrame(frameHandler);
        landed();
      }
    }

    function landed() {

      // 用于测试combo，手动设置掉到正中心
      // self.jumper.position.x = self.cubes[self.cubes.length - 1].position.x;
      // self.jumper.position.z =  self.cubes[self.cubes.length - 1].position.z;

      // jumper掉落到方块水平位置，开始充值状态，并开始判断掉落是否成功
      self.jumperStat.ready = false
      self.jumperStat.xSpeed = 0
      self.jumperStat.ySpeed = 0
      self.jumper.position.y = .5
      // 还原jumper的旋转角度和head的位置
      self.jumper.rotation.z = 0
      self.jumper.rotation.x = 0
      self.jumperHead.position.y = 0

      self._checkInCube();

      if (self.falledStat.location === 1) {
        // 跳成功
        if (self.myRole === self.activeUser) {
          // 播放掉落成功音效
          if(ActMusic){
            ActMusic.play();
          }
  
          // 掉落成功，进入下一步
          self.score += Math.pow(2, self.combo); // 随着combo
          // self._createCube()
          self._landSuccess();
          self._updateCamera()
  
          if (self.successCallback) {
            self.successCallback(self.score)
          }
  
          // 切换当前用户
          self.switchActiveUser();
        }

      } else {
        // 掉落失败，进入失败动画
        self._falling();

        // // 播放掉落失败音效
        if(FallMusic){
          FallMusic.play();
        }

        // 播报胜利用户
        const winUser = self.activeUser === 'p1' ? 'p2' : 'p2';
        // alert('获胜者为：' + winUser)
        self.winUser = winUser;
      }
    }

    act();
  },
  // 接收到对手着陆成功
  handleOtherLand(cubeIndex) {
    var self = this
    // 播放掉落成功音效
    if(ActMusic){
      ActMusic.play();
    }

    // 掉落成功，进入下一步
    self.score += Math.pow(2, self.combo); // 随着combo
    // self._createCube()
    self._createCube(cubeIndex);
    self._updateCamera()

    if (self.successCallback) {
      self.successCallback(self.score)
    }

    // 切换当前用户
    self.switchActiveUser();
  },
  switchActiveUser(init) {
    var self = this;
    console.log('------------------', init);
    console.log(self.activeUser);
    const act = init ? 'p2' : self.activeUser;
    document.getElementById('p1').classList.remove('active');
    document.getElementById('p2').classList.remove('active');
    self.activeUser = act === 'p1' ? 'p2' : 'p1';
    console.log(self.activeUser);
    console.log('------------------');

    document.getElementById(self.activeUser).classList.add('active');
  },
  /**
   *游戏失败执行的碰撞效果
   *@param {String} dir 传入一个参数用于控制倒下的方向：'rightTop','rightBottom','leftTop','leftBottom','none'
  **/
  _fallingRotate: function (dir) {
    var self = this
    var offset = self.falledStat.distance - self.config.cubeWidth / 2
    var rotateAxis = 'z' // 旋转轴
    var rotateAdd = self.jumper.rotation[rotateAxis] + 0.1 // 旋转速度
    var rotateTo = self.jumper.rotation[rotateAxis] < Math.PI/2 // 旋转结束的弧度
    var fallingTo = self.config.ground + self.config.jumperWidth / 2 + offset

    if (dir === 'rightTop') {
      rotateAxis = 'x'
      rotateAdd = self.jumper.rotation[rotateAxis] - 0.1
      rotateTo = self.jumper.rotation[rotateAxis] > -Math.PI/2
      self.jumper.translate.z = offset
      // self.jumper.geometry.translate.z = offset
    } else if (dir === 'rightBottom') {
      rotateAxis = 'x'
      rotateAdd = self.jumper.rotation[rotateAxis] + 0.1
      rotateTo = self.jumper.rotation[rotateAxis] < Math.PI/2
      self.jumper.translate.z = -offset
      // self.jumper.geometry.translate.z = -offset
    } else if (dir === 'leftBottom') {
      rotateAxis = 'z'
      rotateAdd = self.jumper.rotation[rotateAxis] - 0.1
      rotateTo = self.jumper.rotation[rotateAxis] > -Math.PI/2
      self.jumper.translate.x = -offset
      // self.jumper.geometry.translate.x = -offset
    } else if (dir === 'leftTop') {
      rotateAxis = 'z'
      rotateAdd = self.jumper.rotation[rotateAxis] + 0.1
      rotateTo = self.jumper.rotation[rotateAxis] < Math.PI/2
      self.jumper.translate.x = offset
      // self.jumper.geometry.translate.x = offset
    } else if (dir === 'none') {
      rotateTo = false
      fallingTo = self.config.ground
    } else {
      throw Error('Arguments Error')
    }
    if (!self.fallingStat.end) {
      if (rotateTo) {
        self.jumper.rotation[rotateAxis] = rotateAdd
      } else if (self.jumper.position.y > fallingTo) {
        self.jumper.position.y -= self.config.fallingSpeed
      } else {
        self.fallingStat.end = true
      }
      self._render()
      requestAnimationFrame(function(){
        self._falling()
      })
    } else {
      if (self.failedCallback) {
        self.failedCallback()
      }
    }
  },
  /**
   *游戏失败进入掉落阶段
   *通过确定掉落的位置来确定掉落效果
  **/
  _falling: function () {
    var self = this
    if (self.falledStat.location == 0) {
      self._fallingRotate('none')
    } else if (self.falledStat.location === -10) {
      if (self.cubeStat.nextDir == 'left') {
        self._fallingRotate('leftTop')
      } else {
        self._fallingRotate('rightTop')
      }
    } else if (self.falledStat.location === 10) {
      if (self.cubeStat.nextDir == 'left') {
        if (self.jumper.position.x < self.cubes[self.cubes.length - 1].position.x) {
          self._fallingRotate('leftTop')
        } else {
          self._fallingRotate('leftBottom')
        }
      } else {
        if (self.jumper.position.z < self.cubes[self.cubes.length - 1].position.z) {
          self._fallingRotate('rightTop')
        } else {
          self._fallingRotate('rightBottom')
        }
      }
    }
  },
  /**
   *判断jumper的掉落位置
   *@return {Number} this.falledStat.location
   * -1 : 掉落在原来的方块，游戏继续
   * -10: 掉落在原来方块的边缘，游戏失败
   *  1 : 掉落在下一个方块，游戏成功，游戏继续
   *  10: 掉落在下一个方块的边缘，游戏失败
   *  0 : 掉落在空白区域，游戏失败
  **/
  _checkInCube: function () {

    if (this.cubes.length > 1) {
      var cubeScore = 0;
      // jumper 的位置
      var pointO = {
        x: this.jumper.position.x,
        z: this.jumper.position.z
      }
      // 当前方块的位置
      var pointA = {
        x: this.cubes[this.cubes.length - 1 - 1].position.x,
        z: this.cubes[this.cubes.length - 1 - 1].position.z
      }
      // 下一个方块的位置
      var pointB = {
        x: this.cubes[this.cubes.length - 1].position.x,
        z: this.cubes[this.cubes.length - 1].position.z
      }
      var distanceS, // jumper和当前方块的坐标轴距离
          distanceL;  // jumper和下一个方块的坐标轴距离
      // 判断下一个方块相对当前方块的方向来确定计算距离的坐标轴

      if (this.cubeStat.nextDir === 'left') {
        distanceS = Math.abs(pointO.x - pointA.x)
        distanceL = Math.abs(pointO.x - pointB.x)
      } else {
        distanceS = Math.abs(pointO.z - pointA.z)
        distanceL = Math.abs(pointO.z - pointB.z)
      }
      var should = this.config.cubeWidth / 2 + this.config.jumperWidth /2
      var result = 0
      if (distanceS < should ) {
        // 落在当前方块，将距离储存起来，并继续判断是否可以站稳
        this.falledStat.distance = distanceS
        result = distanceS < this.config.cubeWidth / 2 ? -1 : -10
      } else if (distanceL < should) {
        this.falledStat.distance = distanceL
        // 落在下一个方块，将距离储存起来，并继续判断是否可以站稳
        result = distanceL < this.config.cubeWidth / 2 ? 1 : 10

        if(pointO.x == pointB.x && pointO.z == pointB.z){
          this.combo++;
        }else{
          this.combo = 0;
        }

      } else {
        result = 0
      }
      this.falledStat.location = result;
    }
  },
  // 每成功一步, 重新计算摄像机的位置，保证游戏始终在画布中间进行
  _updateCameraPos: function () {
    var lastIndex = this.cubes.length - 1
    var pointA = {
      x: this.cubes[lastIndex].position.x,
      z: this.cubes[lastIndex].position.z
    }
    var pointB = {
      x: this.cubes[lastIndex - 1].position.x,
      z: this.cubes[lastIndex - 1].position.z
    }
    var pointR = new THREE.Vector3()
    pointR.x = (pointA.x + pointB.x) / 2
    pointR.y = 0
    pointR.z = (pointA.z + pointB.z) / 2
    this.cameraPos.next = pointR
  },
  // 基于更新后的摄像机位置，重新设置摄像机坐标
  _updateCamera: function () {
      var self = this
      var c = {
        x: self.cameraPos.current.x,
        y: self.cameraPos.current.y,
        z: self.cameraPos.current.z
      }
      var n = {
        x: self.cameraPos.next.x,
        y: self.cameraPos.next.y,
        z: self.cameraPos.next.z
      }
      if (c.x > n.x  || c.z > n.z) {
        self.cameraPos.current.x -= 0.1
        self.cameraPos.current.z -= 0.1
        if (self.cameraPos.current.x - self.cameraPos.next.x < 0.05) {
          self.cameraPos.current.x = self.cameraPos.next.x
        }
        if (self.cameraPos.current.z - self.cameraPos.next.z < 0.05) {
          self.cameraPos.current.z = self.cameraPos.next.z
        }
        self.camera.lookAt(new THREE.Vector3(c.x, 0, c.z))

        // 更新光源


        self._render()
        requestAnimationFrame(function(){
          self._updateCamera()
        })
      }
  },
  // 初始化jumper：游戏主角
  _createJumper: function () {
    var self = this
    var material = new THREE.MeshLambertMaterial({color: this.config.jumperColor})
    var bodyGeometry = new THREE.CylinderGeometry(this.config.jumperWidth/3,this.config.jumperDeep/2,this.config.jumperHeight, 40)
    var headGeometry = new THREE.SphereGeometry( this.config.jumperDeep/2, 32, 32 );
    bodyGeometry.translate(0 , 1, 0 )
    headGeometry.translate(0, 2.4, 0);
    this.jumperBody = new THREE.Mesh(bodyGeometry, material);
    this.jumperHead = new THREE.Mesh(headGeometry, material);
    this.jumperBody.castShadow = true; // 产生阴影
    this.jumperHead.castShadow = true; // 产生阴影

    var mesh = new THREE.Group();
    mesh.add(this.jumperBody);
    mesh.add(this.jumperHead);
    mesh.position.y = 3;
    mesh.position.x = this.config.jumperWidth / 2;
    mesh.position.z = this.config.jumperWidth / 2;

    this.jumper = mesh
    this.scene.add(this.jumper);

    this.directionalLight.target = this.jumper; // 将平行光跟随jumper

    function jumperInitFall() {
      if (self.jumper.position.y > 1) {
        self.jumper.position.y -= 0.1
        self._render(self.scene, self.camera)
        requestAnimationFrame(function () {
          jumperInitFall();
        })
      }
    }
    jumperInitFall();

  },
  _initCreateCube: function(initBlockList) {
    const list = initBlockList || [Math.floor(Math.random()*(this.blockMapMax+1)), Math.floor(Math.random()*(this.blockMapMax+1))];
    this._createCube(list[0]);
    this._createCube(list[1]);

    // 通知p2初始化
    if (!initBlockList) {
      console.log('通知对方生成块', list);
      const data = {
        type: 'init',
        data: list
      }
      this.notifyInfo(data)
    }
  },
  _landSuccess: function() {
    const index = Math.floor(Math.random()*(this.blockMapMax+1));
    this._createCube(index);

    const data = {
      type: 'land',
      data: index
    }
    this.notifyInfo(data)

  },
  notifyInfo(data) {
    // 发起通知
    console.log('发起通知 :>> ' + data.type, data);
  },
  // 新增一个方块, 新的方块有2个随机方向
  _createCube: function (index) {
    
    // Math.floor(Math.random()*(max-min+1)+min);
    // const randomIndex = index || Math.floor(Math.random()*(1+1));
    const blockConfig = this.blockMap[index];
    console.log('blockConfig :>> ', blockConfig);

    var geometryObj = this._createGeometry(blockConfig.geometry); // 生成一个集合体
    console.log('geometryObj :>> ', geometryObj);
    var materialObj = this._createMaterial()(blockConfig.materia); // 生成材质
    console.log('materialObj :>> ', materialObj);

    var mesh = new THREE.Mesh(geometryObj.geometry, materialObj.material)
    mesh.castShadow = true; // 产生阴影
    mesh.receiveShadow = true;    // 接收阴影

    if( this.cubes.length ) {
      // this.cubeStat.nextDir =  Math.random() > 0.5 ? 'left' : 'right'
      this.cubeStat.nextDir =  blockConfig.nextDir;
      mesh.position.x = this.cubes[this.cubes.length - 1].position.x
      mesh.position.y = this.cubes[this.cubes.length - 1].position.y
      mesh.position.z = this.cubes[this.cubes.length - 1].position.z


      if (this.cubeStat.nextDir === 'left') {
        // mesh.position.x = this.cubes[this.cubes.length - 1].position.x-4*Math.random() - 6
        mesh.position.x = this.cubes[this.cubes.length - 1].position.x - blockConfig.range - 6
      } else {
        // mesh.position.z = this.cubes[this.cubes.length - 1].position.z-4*Math.random() - 6
        mesh.position.z = this.cubes[this.cubes.length - 1].position.z - blockConfig.range - 6
      }
    }

    this.cubes.push(mesh)
    // 当方块数大于6时，删除前面的方块，因为不会出现在画布中
    if (this.cubes.length > 6) {
      this.scene.remove(this.cubes.shift())
    }
    this.scene.add(mesh)
    // 每新增一个方块，重新计算摄像机坐标
    if ( this.cubes.length > 1) {
      this._updateCameraPos();
    }

  },

  _render: function () {
    this.renderer.render(this.scene, this.camera)
  },
  _setLight: function () {
    var light = new THREE.AmbientLight( 0xffffff, 0.3 )
    this.scene.add( light )

    this.directionalLight = new THREE.DirectionalLight( 0xffffff , 10);
    this.directionalLight.distance = 0;
    this.directionalLight.position.set( 60, 50, 40 )
    this.directionalLight.castShadow = true; // 产生阴影
    this.directionalLight.intensity = 0.5;
    this.scene.add(this.directionalLight)
  },
  _setCamera: function () {
    this.camera.position.set(100, 100, 100)
    this.camera.lookAt(this.cameraPos.current)
  },
  _setRenderer: function () {
    this.renderer.setSize(this.size.width, this.size.height)
    this.renderer.setClearColor(this.config.background)
    this.renderer.shadowMap.enabled = true; // 开启阴影

    document.body.appendChild(this.renderer.domElement)
  },
  _setSize: function () {
    this.size.width = window.innerWidth,
    this.size.height = window.innerHeight
  },
  _createMaterial: function(){ // 生成材质/贴图
    var config = this.config;
     // 所有的材质数组
    var materials = [
      {
        material : new THREE.MeshLambertMaterial({color: config.cubeColor}),
        type: 'DefaultCubeColor'
      },
      RandomColor(),
      clockMaterial(),
      RadialGradient(),
      RadialGradient2(),
      Chess(),
      wireFrame(),
    ];

    return function (idx) {
      if(idx == undefined){
        idx = Math.floor(Math.random()*materials.length);
      }
      return materials[idx];
    }

    function clockMaterial() {
      var texture;
      var matArray = []; // 多贴图数组

      texture = new THREE.CanvasTexture(canvasTexture); // 此处的canvasTexture来自canvas.texture.js文件
      texture.needsUpdate = true;

      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshBasicMaterial({ map: texture }));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));

      return {
        material : matArray,
        type: 'Clock'
      }
    }

    function RadialGradient() {
      var texture;
      var matArray = []; // 多贴图数组

      var canvasTexture1 = document.createElement("canvas");
      canvasTexture1.width=16;
      canvasTexture1.height=16;
      var ctx= canvasTexture1.getContext("2d");
      // 创建渐变
      var grd=ctx.createRadialGradient(50,50,32,60,60,100);
      grd.addColorStop(0,"red");
      grd.addColorStop(1,"white");
      // 填充渐变
      ctx.fillStyle=grd;
      ctx.fillRect(10,10,150,80);

      texture = new THREE.CanvasTexture(canvasTexture1);
      texture.needsUpdate = true;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; // 指定重复方向为两个方向
      texture.repeat.set(5,5); // 设置重复次数都为4

      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshBasicMaterial({ map: texture }));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));

      return {
        material : matArray,
        type: 'RadialGradient'
      }
    }

    function RadialGradient2() {

      var canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;

      var context = canvas.getContext('2d');
      var gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.2, 'rgba(0,255,255,1)');
      gradient.addColorStop(0.4, 'rgba(0,0,64,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,1)');

      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);

      var matArray = []; // 多贴图数组
      var texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;

      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshBasicMaterial({ map: texture }));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));
      matArray.push(new THREE.MeshLambertMaterial({color: config.cubeColor}));

      return {
        material : matArray,
        type: 'RadialGradient2'
      }
    }

    function Chess() {
      var texture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/Ovilia/ThreeExample.js/master/img/chess.png');
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; // 指定重复方向为两个方向
      texture.repeat.set(2, 2); // 设置重复次数都为4

      return {
        material : new THREE.MeshBasicMaterial( { map: texture } ),
        type : 'Chess'
      }
    }

    function RandomColor(){
      var color = '#'+Math.floor(Math.random()*16777215).toString(16);
      return {
        material : new THREE.MeshLambertMaterial({color: color}),
        type : 'RandomColor',
        color : color,
      }
    }

    function wireFrame(){
      return {
        material: new THREE.MeshLambertMaterial({color: config.cubeColor, wireframe: true}),
        type: 'wireFrame'
      }
    }

  },
  _createGeometry: function(geometry){ // 生成几合体
    // var obj = {};
    // if(Math.random() > 0.5){  // 添加圆柱型方块
    //   obj.geometry = new THREE.CylinderGeometry(this.config.cubeWidth / 2, this.config.cubeWidth / 2, this.config.cubeHeight, 40)
    //   obj.type = 'CylinderGeometry';
    // }else{ // 方块
    //   obj.geometry = new THREE.CubeGeometry(this.config.cubeWidth,this.config.cubeHeight,this.config.cubeDeep)
    //   obj.type = 'CubeGeometry';
    // }
    // return obj;

    var obj = {};
    if(geometry == "CylinderGeometry"){  // 添加圆柱型方块
      obj.geometry = new THREE.CylinderGeometry(this.config.cubeWidth / 2, this.config.cubeWidth / 2, this.config.cubeHeight, 40)
      obj.type = 'CylinderGeometry';
    }else{ // 方块
      obj.geometry = new THREE.CubeGeometry(this.config.cubeWidth,this.config.cubeHeight,this.config.cubeDeep)
      obj.type = 'CubeGeometry';
    }
    return obj;
  }

}