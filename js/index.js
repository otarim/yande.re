var el = document.getElementById('start'),
	navBar = document.getElementById('navBar'),
	searchBar = document.getElementById('searchBar'),
	searchBtn = document.getElementById('go'),
	content = document.getElementById('content'),
	usercenter = document.getElementById('usercenter'),
	downloadArea = document.getElementById('download');

var mainView = (function(){
	var cache = {};
	var buildPreview = function(id,tpl){
		var data = cache[id],
			reg = /[\u4e00-\u9fa5]/g,
			date = new Date(data.created_at * 1e3);
		data.created_at = date.toLocaleDateString().replace(reg,'/')+date.toLocaleTimeString().replace(reg,'');
		data.file_size = (data.file_size / 1024).toFixed(2) + 'k';
		data.cwidth = 560;
		data.cheight = 560 * data.height / data.width;
		return tpl.replace(/{{([^}]*)}}/g, function(a, b) {
			return data[b];
		})

	}
	var cacheData = function(data){
		data.forEach(function(d){
			cache[d.id] = d;
		})
	}
	var getData = function(id){
		return cache[id];
	}
	return {
		buildPreview: buildPreview,
		cacheData: cacheData,
		getData: getData
	}
})()

var mainModel = {
	pageNum: 1,
	tag: '',
	splitSearch: function(keyword){
		switch(true){
			case keyword.indexOf('#') === 0 :
				this.tag = keyword.slice(1,-1);
				break;
			default:
				this.tag = '';
				break;
		}
	},
}

var wt = new Waterfall({
	colWrap: content,
	colClass: 'sp',
	colPrefix: 'balabala',
	imgClass: 'sp-m',
	colNum: 4,
	colWidth: 222,
	flexWidth: 200,
	distance: 2000,
	resize: true,
	maxColNum: 5,
	minColNum: 3,
	pageNum: 20,
	gutterWidth: 23,
	gutterHeight: 23,
	animate: true, //开启动画
	maxPage: 20,//不定义的话就没有数量限制
	maxNum: 500,//不定义的话就没有数量限制
	hasLayout: true,
	customProperty: {
		width: 'sample_width',
		height: 'sample_height'
	},
	fetch: function(callback){
		ajax('https://yande.re/post.json?page='+mainModel.pageNum+'&tags='+mainModel.tag,'get')
			.then(function(data){
				mainView.cacheData(data);
				mainModel.pageNum++;
				callback(data,'preview_url');
			},function(err){
				console.log(err)
			},function(progress){
				console.log(progress * 100 + '%')
			})
	},
	template: function(data){
		var reg = /[\u4e00-\u9fa5]/g,
			date = new Date(data.created_at * 1e3);
		var sumary = data.tags.split(' ').map(function(tag){
			return '<em data-tag="'+tag+'" title="'+tag+'">'+tag+'</em>';
		})
		var tpl = '<div class="sp-inner" data-id="'+data.id+'"><img src="'+data.preview_url+'" alt="" class="sp-m"><p>'+sumary+'<span class="sp-download">download</span></p></div>'+
		'<div class="sp-cm">'+
			'<p><em>id:</em><strong>'+data.id+'</strong></p>'+
			'<p><em>author:</em><strong><a href="">'+data.author+'</a></strong></p>'+
			'<p><em>resolution:</em><strong>'+data.width+'x'+data.height+'</strong></p>'+
			'<p><em>createTime:</em><strong>'+date.toLocaleDateString().replace(reg,'/')+date.toLocaleTimeString().replace(reg,'')+'</strong></p>'+
		'</div>';
		return tpl;
	}
	// onprocess: function(){
	// 	document.getElementById('r-ga').classList.toggle('r-ga');
	// },
	// onDone: function(){
	// 	document.getElementById('r-ga').classList.toggle('r-ga');
	// }
})

var largeModeView = new Popbox({
	shortcut: true,
	overlay: true,
    dragable: true
})


$('#content').on('mouseenter','.sp-inner',function(){
	$(this).find('p').addClass('active');
})
$('#content').on('mouseleave','.sp-inner',function(){
	$(this).find('p').removeClass('active');
})

searchBtn.addEventListener('click',function(e){
	mainModel.splitSearch(searchBar.value);
	mainModel.pageNum = 1;
	wt.reset();
	wt.fetchData();
},false)

content.addEventListener('click',function(e){
	var target = e.target,matchedTarget;
	if(target.tagName.toLowerCase() === 'em'){
		mainModel.tag = target.dataset['tag'];
		searchBar.value = '#' + mainModel.tag + '#';
		mainModel.pageNum = 1;
		wt.reset();
		wt.fetchData();
		return;
	}
	if(target.classList.contains('sp-download')){
		var id = findParent(target,function(t){
			return t.classList.contains('sp-inner')
		}).dataset['id'];
		// 实例化一个下载任务
		addDownloadTask({
			target: downloadArea,
			data: mainView.getData(id),
			tpl: function(data){
				var taskname = data.file_url.split('/').pop();
				return '<div class="download-bar"><p>'+taskname+'</p><progress></progress></div>'
			},
			onDone: function(){
				this.taskEl.classList.add('download-done');
			}
		});
		return;
	}
	matchedTarget = findParent(target,function(t){
		return t.classList.contains('sp-inner')
	})
	if(matchedTarget){
		var id = matchedTarget.dataset['id'];
		readFile('./view/largeMode.ota').then(function(tpl){
			largeModeView.reDraw(function(){
				return mainView.buildPreview(id,tpl);
			}).show()
		})
		return;
	}
},false)

usercenter.addEventListener('click',function(){
	this.classList.toggle('usercenter-active');
})

document.addEventListener('mousewheel', function(e){
	var direction = e.wheelDelta;
	if(direction < 0){
		navBar.classList.add('nav-bar-fixed')
	}else{
		navBar.classList.remove('nav-bar-fixed')
	}
}, false)


// promise 返回 promise 中的结果给下一个 then 调用
// process.execPath 当前文件路径