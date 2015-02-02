// waterfall.js by otarim
// todo: 不足1屏的滚动问题
;
(function(w, d, undefined) {
	// Polyfill
	var proto = Array.prototype,
		getElementsByClassName = function() {};
	if (![].forEach) {
		proto.forEach = function(callback, thisArg) {
			var ret = [];
			for (var i = 0, l = this.length; i < l; i++) {
				callback.apply(thisArg || null, [this[i], i, this]);
			}
			return this;
		};
	}
	if (![].map) {
		proto.map = function(callback, thisArg) {
			var ret = [];
			for (var i = 0, l = this.length; i < l; i++) {
				ret.push(callback.apply(thisArg || null, [this[i], i, this]));
			}
			return ret;
		};
	}
	if (![].indexOf) {
		proto.indexOf = function(who) {
			for (var i = 0, l = this.length, ret; i < l; i++) {
				if (this[i] == who) {
					ret = i;
					break;
				}
			}
			return ret;
		}
	}
	if (![].some) {
		proto.some = function(callback, thisArg) {
			var ret = false;
			for (var i = 0, l = this.length; i < l; i++) {
				if (callback.apply(thisArg || null, [this[i], i, this]) === true) {
					ret = true;
					return ret;
				}
			}
			return ret;
		};
	}
	if (![].fill) {
		proto.fill = function(num) {
			var ret = [];
			for (var i = 0; i < this.length; i++) {
				ret.push(num);
			}
			return ret;
		}
	}
	if (d.getElementsByClassName) {
		getElementsByClassName = function(dom, className) {
			return dom.getElementsByClassName(className)
		}
	} else {
		getElementsByClassName = function(dom, className) {
			dom = dom || document;
			var ret = [],
				nodelists = dom.getElementsByTagName('*'),
				reg = new RegExp('(^|\\s)' + className + '(\\s|$)');
			for (var i = 0, l = nodelists.length, node; i < l; i++) {
				node = nodelists[i];
				if (reg.test(node.className)) {
					ret.push(node);
				}
			}
			nodelists = undefined;
			return ret;
		}
	}
	// from MDN
	if (typeof Object.create != 'function') {
		(function() {
			var F = function() {};
			Object.create = function(o) {
				if (arguments.length > 1) {
					throw Error('Second argument not supported');
				}
				if (o === null) {
					throw Error('Cannot set a null [[Prototype]]');
				}
				if (typeof o != 'object') {
					throw TypeError('Argument must be an object');
				}
				F.prototype = o;
				return new F;
			};
		})();
	}
	var Waterfall = function(config) {
			this.colPrefix = config.colPrefix || +new Date() + 'seed';
			this.colWrap = config.colWrap;
			this.colwrapStyle = this.colWrap.style;
			this.colClass = config.colClass;
			this.imgClass = config.imgClass;
			this.colWidth = config.colWidth;
			this.flexWidth = config.flexWidth;
			this.gutterWidth = config.gutterWidth || 20;
			this.gutterHeight = config.gutterHeight || 20;
			this.colNum = config.colNum || 4;
			this.maxColNum = config.maxColNum;
			this.minColNum = config.minColNum;
			this.specialCol = config.columnHeight && config.columnHeight.slice();
			this.specialColHeight = config.specialColHeight || 0;
			this.columnHeight = config.columnHeight || new Array(this.colNum || 4).fill(0);
			this.resize = config.resize;
			this.onResize = config.onResize;
			this.pageNum = config.pageNum || 15;
			this.fetch = config.fetch;
			this.fetchBtn = config.fetchBtn;
			this.animate = config.animate;
			this.__lock = this.sid = this.page = 0;
			this.__lockCount = this.pageNum;
			this.data = [];
			this.distance = config.distance || 0;
			this.tpl = config.template;
			this.maxPage = config.maxPage;
			this.maxNum = config.maxNum;
			this.onPrepend = config.onPrepend;
			this.onDone = config.onDone;
			this.onprocess = config.onprocess;
			this.imgDone = config.imgDone;
			this.imgError = config.imgError;
			this.eventStatus = true;
			this.__imgQueue = [];
			this.__animateQueue = [];
			this.todo = []; //已经存在的 dom
			this.hasLayout = config.hasLayout || false;
			this.customProperty = config.customProperty || {};
			this.initialize();
		}
		// Waterfall方法
	Waterfall.prototype = Object.create({
		initialize: function() {
			if (this.fetchBtn) {
				this.fetchBtn._display = this.fetchBtn.style.display;
				this.bindFetchEvent();
			} else {
				this.bindDefaultFetchEvent();
			}
			if (this.resize) {
				this.prepareResize(false);
				this.bindResizeEvent()
			}
			this.__lock = 1;
			this.mainProcess();
		},
		mainProcess: function() {
			var self = this;
			if (!this.maxPage && !this.maxNum ||
				this.maxPage && this.page < this.maxPage ||
				this.maxNum && this.sid < this.maxNum) {
				if (this.fetchBtn) {
					this.fetchBtn.style.display = 'none'
				}
				// 执行onprocess函数
				this.onprocess && this.onprocess();
				this.fetch(function(data, key) {
					self.data = data;
					if (data.length) {
						// 重置lockcount
						self.__lockCount = data.length;
						var imgs = data.map(function(obj) {
							return obj[key];
						})
						self.makeImgQueue(imgs);
						if (self.hasLayout) {
							data.forEach(function(el, index) {
								el.sid = index;
								self.procssConfig(el);
							})
							Waterfall.__handleOpacity(self);
							self.resetStauts();
						}
					} else {
						// 重置lockcount
						self.__lockCount = self.pageNum;
						// 空数据的情况,重置参数
						self.resetStauts();
					}
				})
			} else {
				this.switchEvent(false);
			}
		},
		fetchData: function() {
			if (!this.__lock) {
				this.__lock = 1;
				this.mainProcess();
			}
		},
		bindFetchEvent: function() {
			var self = this;
			this.fetchBtn.onclick = function() {
				self.fetchData();
			}
		},
		bindDefaultFetchEvent: function() {
			var self = this,
				distance = this.distance,
				timmer;
			// scroll事件绑定
			this.fnHandler = function() {
				clearTimeout(timmer);
				timmer = setTimeout(function() {
					var sTop = d.body.scrollTop + d.documentElement.scrollTop,
						viewHeight = w.innerHeight || d.documentElement.clientHeight,
						scrollHeight = d.documentElement.scrollHeight || d.body.scrollHeight;
					if (sTop + viewHeight >= scrollHeight - distance) {
						self.fetchData();
					}
				}, 200)
			}
			Waterfall.__addEvent(w, 'scroll', this.fnHandler);
		},
		bindResizeEvent: function() {
			var self = this,
				timmer;
			var resizeFn = function() {
				clearTimeout(timmer);
				timmer = setTimeout(function() {
					self.prepareResize(true);
				}, 200)
			}
			Waterfall.__addEvent(w, 'resize', resizeFn);
		},
		prepareResize: function(Manual) {
			var pinWidth = this.colWidth + this.gutterWidth;
			var clientWidth = w.innerWidth || d.documentElement.clientWidth;
			var colNum = parseInt(clientWidth / pinWidth, 10);
			if (colNum === this.colNum) return;
			// 超过最大列数，设置为最大列数
			if (this.maxColNum && colNum > this.maxColNum) {
				colNum = this.maxColNum
			}
			if (this.minColNum && colNum < this.minColNum) {
				colNum = this.minColNum
			}
			var wrapWidth = pinWidth * colNum;
			this.colWrap.style.cssText += ';width: ' + wrapWidth + 'px;';
			var self = this;
			if (this.specialCol) {
				if (colNum < this.specialCol.length) {
					this.columnHeight = this.specialCol.slice().splice(0, colNum);
				} else {
					this.columnHeight = this.specialCol.slice().concat(new Array(colNum - this.specialCol.length).fill(this.specialColHeight));
				}
			} else {
				this.columnHeight = new Array(colNum).fill(0);
			}
			this.onResize && this.onResize.call(this, colNum);
			Manual && this.doResize();
			this.colNum = colNum;
		},
		doResize: function() {
			var self = this;
			var appendResize = function(dom) {
				var minHeight = Waterfall.__min(self.columnHeight);
				var top = minHeight.value;
				var left = minHeight.index * (self.colWidth + self.gutterWidth);
				dom.el.style.cssText += ';top: ' + top + 'px;left: ' + left + 'px;';
				// 更新 columnHeight
				self.columnHeight[Waterfall.__min(self.columnHeight).index] += dom.layout;
				self.colwrapStyle.cssText += ';height: ' + Waterfall.__max(self.columnHeight).value + 'px';
			}
			this.todo.forEach(function(dom) {
				appendResize(dom);
			})
		},
		makeImgQueue: function(data) {
			var self = this;
			data.forEach(function(d, index) {
				var img = new Image;
				img.onload = function() {
					self.__lockCount--;
					if (self.imgDone) {
						self.imgDone.call(self, img)
					}
				}
				// 处理图片加载失败的情况,加载失败后,直接从队列中删除
				// 防止setInterval继续检测队列中的错误图片
				img.onerror = function(err) {
					self.__lockCount--;
					self.__imgQueue.splice(self.__imgQueue.indexOf(img), 1)
					if (self.imgError) {
						self.imgError.call(self, err)
					}
				}
				img.src = d;
				img.sid = index;
				self.__imgQueue.push(img);
			})
			if (!this.hasLayout) {
				Waterfall.__calcImgSize(this, this.procssConfig);
			}
		},
		procssConfig: function(img) {
			var self = this,
				top, left, width, height, minHeight, extra;
			if (this.hasLayout) {
				width = this.customProperty['width'];
				height = this.customProperty['height'];
				extra = {
					naturalwidth: img[width],
					naturalheight: img[height]
				}
			} else {
				width = 'width';
				height = 'height';
				// 缓存图片原始宽高
				extra = {
					naturalwidth: img.naturalWidth ? img.naturalWidth : img.width,
					naturalheight: img.naturalHeight ? img.naturalHeight : img.height
				}
			}
			minHeight = Waterfall.__min(this.columnHeight);
			top = minHeight.value;
			left = minHeight.index * (this.colWidth + this.gutterWidth);
			this.replaceTpl({
				top: top,
				left: left,
				height: self.flexWidth * img[height] / img[width],
				sid: this.sid,
				sidIndex: img.sid
			}, extra)
			this.sid++;
		},
		replaceTpl: function(config, extra) {
			// 根据sid匹配data的数据在进行replace操作
			var data = this.data[config.sidIndex],
				tmpDom = d.createElement('div'),
				renderResult = '',
				img;
			// renderResult = this.tpl.replace(/{{([^}]*)}}/g, function(a, b) {
			// 	return data[b];
			// })
			renderResult = this.tpl(data);
			tmpDom.innerHTML = renderResult;
			tmpDom.className = this.colClass;
			try {
				tmpDom.dataset.id = this.colPrefix + config.sid;
			} catch (e) {
				tmpDom['data-id'] = this.colPrefix + config.sid;
			}
			tmpDom.style.cssText += ';top: ' + config.top + 'px;' + 'left: ' + config.left + 'px;';
			img = getElementsByClassName(tmpDom, this.imgClass)[0];
			img.width = this.flexWidth;
			img.height = config.height;
			if (extra) {
				for (var i in extra) {
					if (extra.hasOwnProperty(i)) {
						img[i] = extra[i];
					}
				}
			}
			this.animate && this.resize && Waterfall.__supportCSS3 && (tmpDom.style.cssText += ';-webkit-transition: all linear .5s;-moz-transition: all linear .5s;-ms-transition: all linear .5s;-o-transition: all linear .5s;transition: all linear .5s;')
			// todo: .cssText = 'filter...' ie获取offsetHeight有一定几率返回0
			this.animate && (img.style.filter = 'alpha(opacity=0)', img.style.cssText += ';opacity: 0;-webkit-transition: opacity linear .5s;-moz-transition: opacity linear .5s;-ms-transition: opacity linear .5s;-o-transition: opacity linear .5s;transition: opacity linear .5s;')
			this.onPrepend && this.onPrepend.call(this, tmpDom);
			this.colWrap.appendChild(tmpDom);
			// 更新当前高度
			var layout = tmpDom.offsetHeight + this.gutterHeight;
			this.columnHeight[Waterfall.__min(this.columnHeight).index] += layout;
			this.todo.push({
				el: tmpDom,
				layout: layout
			})
			this.colwrapStyle.cssText += ';height: ' + Waterfall.__max(this.columnHeight).value + 'px';
			this.animate && this.animation(img);
		},
		animation: function(dom) {
			if (Waterfall.__supportCSS3) {
				dom.style.cssText += 'opacity: 1';
			} else {
				// 推入animate队列进行处理,轮询队列做透明度处理,处理结束的从队列中删除
				this.__animateQueue.push(dom);
			}
		},
		// 开关滚动事件
		switchEvent: function(value) {
			if (value === true && !this.eventStatus) {
				if (this.fetchBtn) {
					this.bindFetchEvent();
				} else {
					Waterfall.__addEvent(w, 'scroll', this.fnHandler);
				}
				this.eventStatus = true;
			} else if (value === false) {
				if (this.fetchBtn) {
					this.fetchBtn.onclick = undefined;
				} else {
					Waterfall.__detachEvent(w, 'scroll', this.fnHandler);
				}
				this.eventStatus = false;
			}
		},
		resetStauts: function() {
			// 检查当前批次的所有的任务,如果所有任务都完成,触发onDone
			// if (self.__lock && !self.__lockCount) {
			if (this.fetchBtn) {
				this.fetchBtn.style.display = this.fetchBtn._display
			}
			this.__lock = 0;
			this.page++;
			this.onDone && this.onDone.call(self);
			// }
		},
		reset: function(){
			if (this.fetchBtn) {
				this.fetchBtn.style.display = this.fetchBtn._display
			}
			this.__lock = this.sid = this.page = 0;
			this.__imgQueue = [];
			this.__animateQueue = [];
			this.todo = []; //已经存在的 dom
			this.columnHeight = new Array(this.colNum).fill(0);
			this.colWrap.innerHTML = '';
		}
	})
	// Waterfall私有属性
	Waterfall.__version = '3.0';
	Waterfall.__calcImgSize = function(model, callback) {
		// 必须让宽高检查不阻塞其他图片的宽高检查
		// 所以宽高检查的应该是同时的
		// 建立一个队列
		// 循环队列所有的图片
		var interval = Waterfall.__isMobile ? 200 : 20;
		var todos = model.__imgQueue.slice();
		var timmer = setInterval(function() {
			var queue = model.__imgQueue,
				queueLen = queue.length;
			// 循环检查队列
			if (queueLen) {
				for (var i = 0; i < queueLen; i++) {
					var img = queue[i];
					if (img.end) {
						// 重置i为当前索引,并且裁剪当前的len缓存
						queue.splice(i--, 1);
						queueLen--;
					} else {
						if (img.width || img.height) {
							img.end = true;
							// model.__animateQueueLength++;
							// callback.call(model, img)

						}
					}
				}
			} else {
				clearInterval(timmer)
				// 全部任务完成，执行animate
				for (var i = 0; i < todos.length; i++) {
					callback.call(model, todos[i]);
				}
				Waterfall.__handleOpacity(model);
				model.resetStauts();
			}
		}, interval)
	}
	Waterfall.__handleOpacity = function(model) {
		// 队列为空的时候,那么清除计数器,动画结束
		// 注意....异常抛出时....this指向全局...
		clearTimeout(model.qtimmer);
		var q = model.__animateQueue;
		// qlen = q.length;
		(function() {
			if (q.length) {
				for (var i = 0; i < q.length; i++) {
					var dom = q[i];
					// if(typeof dom === 'undefined') {return;}
					var domstyle = dom.style;
					if (dom.end) {
						q.splice(i--, 1);
					} else {
						domstyle.filter = "alpha(opacity=" + Math.floor((dom.__opacity ? dom.__opacity : (dom.__opacity = 0, 0)) * 100) + ")";
						if (dom.__opacity === 1) {
							if (dom.removeAttribute) dom.removeAttribute('filter');
							dom.end = true;
						} else {
							dom.__opacity += 1 / 16;
						}
					}
				}
				model.qtimmer = setTimeout(arguments.callee, 16)
			} else {
				clearTimeout(model.qtimmer)
			}
		})()
	}
	Waterfall.__isMobile = (function() {
		return 'ontouchstart' in d;
	})()
	Waterfall.__addEvent = function(el, type, callback) {
		if (typeof addEventListener === 'function') {
			return el.addEventListener(type, callback, false)
		} else {
			return el.attachEvent('on' + type, callback)
		}
	}
	Waterfall.__detachEvent = function(el, type, callback) {
		if (typeof removeEventListener === 'function') {
			return el.removeEventListener(type, callback, false)
		} else {
			return el.detachEvent('on' + type, callback)
		}
	}
	Waterfall.__supportCSS3 = (function() {
		var prefix = ['', '-webkit-', '-o-', '-moz-', '-ms-'],
			div = d.createElement('div'),
			divStyle = div.style;
		return prefix.some(function(pre) {
			return pre + 'transition' in divStyle;
		})
	})()
	Waterfall.__max = function(arr) {
		var value = Math.max.apply(Math, arr);
		return {
			value: value,
			index: arr.indexOf(value)
		}
	}
	Waterfall.__min = function(arr) {
		var value = Math.min.apply(Math, arr);
		return {
			value: value,
			index: arr.indexOf(value)
		}
	}
	w.Waterfall = Waterfall;
})(window, document)