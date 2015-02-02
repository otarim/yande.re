var progress = (function(){
	var progress = function(conig){
	}
	progress.prototype = {
		initProgress: function(){
			var arg = [].slice.call(arguments);
			this.el = arg.shift();
			var max = arg.pop();
			var beginValue = arg[0] || 0;
			this.el.dataset['show'] = false;
			toggle.call(this);
			setValue.call(this,'max',max).call(this,'value',beginValue);
		},
		setValue: function(value){
			setValue.call(this,'value',value)
		},
		end: function(callback){
			toggle.call(this);
			setValue.call(this,'max',0).call(this,'value',0);
			callback.call(this);
		} 
	}
	function toggle(){
		var visible;
		if(this.el.dataset['show'] === 'false'){
			this.el.dataset['show'] = 'true';
			display = 'block';
		}else{
			this.el.dataset['show'] = 'false';
			display = 'none';
		}
		this.el.style.display = display;
	}
	function setValue(type,value){
		this.el.setAttribute(type,value);
		return setValue;
	}
	return progress;
})();