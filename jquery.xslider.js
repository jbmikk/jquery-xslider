(function( $ ){
	var each = function(callback) {
		return function() {
			var _args = arguments;
			return this.each(function(){
				callback.apply( this, _args);
			});
		}
	}

	var virtualIndex = function(children, i, dif) {
		return (i+dif >= children.length?
					i+dif-children.length:
					i+dif < 0? i+dif+children.length: i+dif);
	}

	var virtualChildren = function(children, focus, vfocus) {
		var dif = vfocus - focus;
		var vchildren = [];
		for(var i = 0; i < children.length; i++) {
			var vindex = virtualIndex(children, i, dif);
			vchildren[vindex] = children[i];
		}
		return vchildren;
	}

	var positions = function(viewport, data, children, focusindex, callback) {
		var focus = $(children[focusindex]);
		var vleft = data.conf.focus == 'centered'? (viewport.width()/2)-(focus.outerWidth(true)/2): 0;
		var vright = vleft + focus.outerWidth(true);
		var vtop =  (viewport.height()/2)-(focus.height()/2);

		var attrs = {};
		if(data.conf.vertical)
			attrs['top'] = vtop;

		callback(focus, $.extend({
			left: vleft,
		}, attrs));

		var _left = vleft;
		$.each(children.slice(0,focusindex).reverse(), function(i, child) {
			child = $(child);
			_left -= child.outerWidth(true);
			callback(child, $.extend({
				left: _left,
			}, attrs));
		});
		var _left = vright;
		$.each(children.slice(focusindex+1,children.length), function(i, child) {
			child = $(child);
			callback(child, $.extend({
				left: _left,
			}, attrs));
			_left += child.outerWidth(true);
		});
	}

	var virtualFocus = function(data, count) {
		return data.conf.focus == 'centered'?
			Math.floor(data.children.length/2)+(count < 0? -1: 0):
			1;
	}

	var checkPosition = function($this, index) {
		var data = $this.data('xslider');
		var threshold = 20;
		if(data.children.length > 0) {
			var first = $(data.children[0]);
			var last = $(data.children[data.children.length-1]);
			var left = first.position().left;
			var right = last.position().left + last.outerWidth();
			if(left > -threshold)
				$this.trigger('first-visible');
			else 
				$this.trigger('first-hidden');
			if(right -$this.width() < threshold )
				$this.trigger('last-visible');
			else 
				$this.trigger('last-hidden');
		}
		if(index+1 >= data.children.length) {
			$this.trigger('reached-last');
		} else if(index-1 < 0) {
			$this.trigger('reached-first');
		}
	}

	var methods = {
		init : each(function( options ) {
			var $this = $(this),
				data = $this.data('xslider');

			var conf = $.extend({
				autostart: true,
				loop: true,
				reverse: false,
				vertical: true,
				index: 0,
				interval: 5000,
				dummyCopies: 0,
				focus: null,
				children: null
			}, options);
				  
			// If the plugin hasn't been initialized yet
			if ( ! data ) {
				$this.css({
					overflow: 'hidden',
					position: 'relative'
				});
				var children = conf.children? $this.find(conf.children): $this.children();
				children.css({
					position: 'absolute',
				});

				$this.data('xslider', {
					target: $this,
					conf: conf,
					index: conf.index,
					playing: false,
					children: children
				});

				$(window).resize(function() {
					$this.xslider('render');
				});
				$this.xslider('render');
				if(conf.autostart) {
					$this.xslider('start');
				}
				setTimeout(function() {
					if(!conf.loop)
						checkPosition($this, 0);
				}, 0);
			}
		}),

		destroy : each(function( ) {
			var $this = $(this),
				data = $this.data('xslider');

			// Namespacing FTW
			$(window).unbind('.xslider');
			$this.removeData('xslider');
		}),

		render: each(function() {
			var $this = $(this),
				data = $this.data('xslider');
			var children = data.children.get(),
				focus = data.index;

			if(data.conf.loop) {
				var vfocus = virtualFocus(data,0);
				children = virtualChildren(data.children, data.index, vfocus);
				focus = vfocus;
			}

			positions($this, data, children, focus, function(child, pos) {
				$(child).css(pos);
			});
			if(!data.conf.loop)
				checkPosition($this, data.index);
		}),

		transition: each(function(count) {
			var $this = $(this),
				data = $this.data('xslider');
			var children = data.children.get(),
				newIndex, focus, vfocus, prevFocus;

			if(data.transitioning || data.children.length == 1)
				return;

			if(data.conf.loop) {
				newIndex = virtualIndex(data.children, data.index, count);
				vfocus = virtualFocus(data,count);
				children = virtualChildren(data.children, newIndex, vfocus);
				focus = vfocus;
				prevFocus = virtualIndex(data.children, focus, -count);
			} else {
				newIndex = data.index + count;

				if(newIndex >= data.children.length || newIndex < 0)
					return;
				if(data.index -1 < 0 && newIndex > data.index) {
					$this.trigger('left-first');
				} else if(data.index +1 >= data.children.length && newIndex < data.index) {
					$this.trigger('left-last');
				}
				focus = newIndex;
				prevFocus = focus-count;
			}
			data.transitioning = true;

			//Start position
			positions($this, data, children, prevFocus, function(child, pos) {
				$(child).css(pos);
			});
			//End position
			positions($this, data, children, focus, function(child, pos) {
				$(child).animate(pos, 400, function() {
					data.transitioning = false;
				});
			});
			data.index = newIndex;
			$this.trigger('transitioned', data.index);
			$this.xslider('reset');
		}),

		reset: each(function() {
			var $this = $(this),
				data = $this.data('xslider');
			if(data.timeout)
				clearTimeout(data.timeout);
			if(data.playing) {
				data.timeout = setTimeout(function() {
					if(data.conf.reverse)
						$this.xslider('previous');
					else
						$this.xslider('next');
				}, data.conf.interval);
			}
		}),

		start: each(function() {
			var $this = $(this),
				data = $this.data('xslider');
			data.playing = true;
			$this.xslider('reset');
		}),

		stop: each(function() {
			var $this = $(this),
				data = $this.data('xslider');
			data.playing = false;
			$this.xslider('reset');
		}),

		next: each(function() {
			var $this = $(this),
				data = $this.data('xslider');
			$this.xslider('transition', 1);
		}),

		index: each(function(index) {
			var $this = $(this),
				data = $this.data('xslider');
			$this.xslider('transition', index-data.index);
		}),

		previous: each(function() {
			var $this = $(this),
				data = $this.data('xslider');
			$this.xslider('transition', -1);
		})
	};

	$.fn.xslider = function( method ) {
    
		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.xslider' );
		}    
	};
})( jQuery );
