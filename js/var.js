// common method
(function(exports){
	var ajax = function(url,method,extra){
		extra = extra || {}
		var defer = Q.defer();
		var xhr = new XMLHttpRequest();
		xhr.open(method,url,true);
		if(method.toLowerCase() === 'post'){
			xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		}
		if(extra.withCookie && delete(extra.withCookie)){
			xhr.withCredentials = true
		}
		Object.keys(extra).forEach(function(key){
			xhr.setRequestHeader(key,extra[key]);
		})
		xhr.onload = function(){
			defer.resolve(JSON.parse(this.responseText));
		}
		xhr.error = function(){
			defer.reject('network error');
		}
		xhr.onprogress = function(event){
			// event.lengthComputable不为真，则event.total等于0。
			if(event.lengthComputable){
				defer.notify(event.loaded / event.total);
			}
		}
		xhr.send(extra.data || null);
		return defer.promise;
	}

	var download = function(url,extra){
		var mimeType = url.split('.').pop(),
			filename = url.split('/').pop(),
			pathname = path.join(extra.path,filename),
			defer = Q.defer();
		var protocol;
		if(extra.https === true){
			protocol = https;
		}else{
			protocol = http;
		}
		protocol.get(url,function(res){
			var chunk = '',length = 0,
				statusCode = res.statusCode;
			if(statusCode === 301 && res.headers.location){
				// 这里是第一次的 defer，如果直接返回函数，那么触发 reject
				return download(res.headers.location,extra).then(function(ret){
					defer.resolve(ret);
				},function(err){
					defer.reject(err);
				},function(progress){
					defer.notify(progress);
				});
			}
			
			if(statusCode >=200 && statusCode < 300 || statusCode === 304){
				// progress.init(progressBar,+res.headers['content-length']);
				// media needed
				res.setEncoding('binary')
				res.on('data',function(d){
					chunk += d;
					length += d.length;
					// progress.setValue(length);
					defer.notify(length);
				})
				res.on('end',function(){
					// progress.end();
					defer.resolve({pathname: pathname,chunk: chunk});
				})
			}else if(statusCode !== 301){
				defer.reject(res);
			}
		})
		return defer.promise;
	}

	var saveFile = function(filename,chunk){
		var defer = Q.defer();
		// fs.writeFile(filename,chunk,'binary',function(err){
		// 	if(err){
		// 		defer.reject(err);
		// 	}else{
		// 		defer.resolve(filename);
		// 	}
		// })
		// try {
		// 	fs.readFileSync(filename)
		// }catch(e){
		// 	console.log(e)
		// }
		// nodejs errno: -2 wtf....
		// http://stackoverflow.com/questions/21843251/node-js-sporadically-failing-to-write-file-with-error-enoent-open-filename
		// http://www.daveeddy.com/2013/03/26/synchronous-file-io-in-nodejs/
		try{
			fs.writeFileSync(filename,chunk,'binary');
			defer.resolve(filename);
		}catch(e){
			defer.reject(e);
		}
		return defer.promise;
	}

	var readFile = function(filename){
		var defer = Q.defer();
		fs.readFile(filename,function(err,data){
			if(err){
				defer.reject(err);
			}else{
				defer.resolve(data.toString());
			}
		})
		return defer.promise;
	}

	var findParent = function(dom, callback) {
		var token;
		// return null or undefined
		while (!callback(dom)) {
			dom = dom.parentNode;
			if (token = (dom === document)) break;
		}
		if (token) {
			return null
		} else {
			return dom
		}
	}

	var domGenerator = function(domString){
		var el,ret;
		try{
			el = document.createElement('div');
			el.innerHTML = domString;
			ret = el.firstElementChild;
			return ret;
		}finally{
			el = ret = null;
		}
	}

	var selectDirectory = function(){
		var directory = document.getElementById('directory'),
			defer = Q.defer();
		var eventFn = function(e){
			defer.resolve(this.value);
			directory.removeEventListener('change',eventFn,false);
		}
		directory.addEventListener('change',eventFn,false)
		directory.click();
		return defer.promise;
	}

	var addDownloadTask = function(config){
		var self = this instanceof addDownloadTask ? this : Object.create(addDownloadTask.prototype);
		self.target = config.target;
		self.data = config.data;
		self.tpl = config.tpl;
		self.onDone = config.onDone;
		self.init();
		return self;
	}

	addDownloadTask.prototype = Object.create(progress.prototype);

	addDownloadTask.prototype.init = function(){
		var self = this;
		this.taskEl = domGenerator(this.tpl.call(this,this.data));
		this.bar = (this.target.appendChild(this.taskEl)).querySelector('progress');
		selectDirectory()
		.then(function(path){
			// file_size
			self.initProgress(self.bar,self.data['file_size']);
			return download(self.data.file_url,{https: true,path: path})
		})
		.then(function(ret){
			return saveFile(ret.pathname,ret.chunk)
		},function(err){
			console.log(err)
		},function(process){
			self.setValue(process);
		})
		.then(function(filename){
			self.end();
			console.log(filename)
			console.log(self.onDone)
		},function(err){
			console.log(err);
		})
	}

	exports.ajax = ajax;
	// exports.download = download;
	// exports.saveFile = saveFile;
	exports.readFile = readFile;
	exports.findParent = findParent;
	exports.addDownloadTask = addDownloadTask;
	// exports.selectDirectory = selectDirectory;
})(this)