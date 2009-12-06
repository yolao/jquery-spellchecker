/*
 * 
 * jquery.spellchecker.js - a simple jQuery Spell Checker
 * Copyright (c) 2009 Richard Willis
 * MIT license  : http://www.opensource.org/licenses/mit-license.php
 * Project      : http://jquery-spellchecker.googlecode.com
 * Contact      : willis.rh@gmail.com
 *
 */

(function($){

	$.fn.extend({
		
		spellchecker : function(options, callback){

			return this.each(function(){
				if ($(this).data('spellchecker') && $(this).data("spellchecker")[options]){
					$(this).data("spellchecker")[options](callback);
				} else {
					$(this).data('spellchecker', new SpellChecker(this, (options && options.constructor === Object) && options || null));
					(options && options.constructor == String) && $(this).data("spellchecker")[options](callback);
				}
			});

		}
	});

	var SpellChecker = function(domObj, options) {
		this.options = $.extend({
			rpc: "checkspelling.php",
			lang: "en", 
			engine: "pspell",		// pspell or google
			after: domObj,			// after which element to insert the bad words list into dom, can be use selector
			append: "",			// optional, will default to this if value is given, can be selector
			suggestBoxPosition: "bottom"	// default position of suggest box; top or bottom
		}, options || {});
		this.options.url = this.options.rpc+"?engine="+this.options.engine;
		this.domObj = domObj;
		this.elements = {};
		this.init();
	};

	SpellChecker.prototype = {

		init : function(){
			var self = this;
			this.createElements();
			$(this.domObj).addClass("spellcheck-container");
			// hide the suggest box on document click
			$(document).bind("click", function(e){
				if (!$(e.target).hasClass(".spellcheck-word-highlight") && !$(e.target).parents().filter(".spellcheck-suggestbox").length) {
					self.hideBox();
				}
			});
		},

		// checks a chunk of text for bad words, then either shows the words below the original element (if texarea) or highlights the bad words
		check : function(callback){

			var self = this, node = this.domObj.nodeName, tagExp = '<[^>]+>', puncExp = '^\\W|[\\W]+\\W|\\W$|\\n|\\t|\\s{2,}';
		
			if (node == "TEXTAREA" || node == "INPUT") {
				this.type = 'textarea';
				var text = $.trim(
					$(this.domObj).val()
					.replace(new RegExp(tagExp, "g"), "")	// strip html tags
					.replace(new RegExp(puncExp, "g"), " ") // strip punctuation
				);
				this.getJsonData(this.options.url, {text: text, lang: this.options.lang}, function(json){
					if (json.result) {
						callback(1);
						return;
					}
					if (!self.elements.$badwords) {
						// we only want one instance of this block in the dom
						if (!$("#spellcheck-badwords").length) {
							self.elements.$badwords = $("<div></div>").attr("id", "spellcheck-badwords");
							if (self.options.append) {
								$(self.options.append).append(self.elements.$badwords);
							} else {
								$(self.options.after).after(self.elements.$badwords);
							}
						} else {
							self.elements.$badwords = $("#spellcheck-badwords").empty();
						}
					} else {
						self.elements.$badwords.html("");
					}
					for(var badword in json) {
						$("<span></span>")
						.addClass("spellcheck-word-highlight")
						.text(json[badword])
						.appendTo(self.elements.$badwords);
					}
					$(".spellcheck-word-highlight", self.elements.$badwords).click(function(){
						self.suggest(this);
					}).after("<span class=\"spellcheck-sep\">,</span> ");

					$(".spellcheck-sep:last", self.elements.$badwords).addClass("spellcheck-sep-last");
					(callback) && callback();
				});
			} else {
				this.type = 'html';
				var text = $.trim($(this.domObj).text().replace(new RegExp(puncExp, "g"), " ")); // strip punctuation
				this.getJsonData(this.options.url, {text: text, lang: this.options.lang}, function(json){
					if (json.result) {
						callback(1);
						return;
					}
					var html = $(self.domObj).html();
					// highlight bad words
					$.each(json, function(key, replaceWord){
						html = html.replace(
							new RegExp("\\b("+replaceWord+")\\b", "ig"),
							'<span class=\"spellcheck-word-highlight\">$1</span>'
						);
					});			
					$(self.domObj).html(html);
					$(".spellcheck-word-highlight", self.domObj).click(function(){
						self.suggest(this);
					});
					(callback) && callback();
				});
			}
		},

		// gets a list of suggested words, appends to the suggestbox and shows the suggestbox
		suggest : function(domObj){

			var self = this, $domObj = $(domObj), offset = $domObj.offset();
			this.$curWord = $(domObj);
		
			this.elements.$suggestFoot.hide();	
			this.elements.$suggestWords.html('<em>Loading..</em>');
			this.elements.$suggestBox
			.css({
				width : "auto",
				left : offset.left + "px",
				top : 
					(this.options.suggestBoxPosition == "top" ?
					(offset.top - ($domObj.outerHeight() + 10)) + "px" :
					(offset.top + $domObj.outerHeight()) + "px")
			}).fadeIn(200);		

			this.getJsonData(this.options.url, {suggest: $.trim($domObj.text()), lang: this.options.lang}, function(json){

				self.elements.$suggestFoot.show();
				self.elements.$suggestWords.empty();

				// build suggest word list
				for(var i=0; i < (json.length < 5 ? json.length : 5); i++) {
					self.elements.$suggestWords.append(
						$('<a href="#">'+json[i]+'</a>').addClass((!i?'first':''))
						.click(function(e){
							e.preventDefault();
							self.replace(domObj, this);
						})
					);
				}								

				// no word suggestions
				(!i) && self.elements.$suggestWords.append('<em>(no suggestions)</em>');

				// get browser viewport height
				var viewportHeight = window.innrHeight ? window.innerHeight : $(window).height();
							
				// position the suggest box
				self.elements.$suggestBox
				.css({
					top :	(self.options.suggestBoxPosition == "top") ||
						(offset.top + $domObj.outerHeight() + self.elements.$suggestBox.outerHeight() > viewportHeight + 10) ?
						(offset.top - (self.elements.$suggestBox.height()+5)) + "px" : 
						(offset.top + $domObj.outerHeight() + "px"),
					width : "auto",
					left :	(self.elements.$suggestBox.outerWidth() + offset.left > $("body").width() ? 
						(offset.left - self.elements.$suggestBox.width()) + $domObj.outerWidth()+"px" : 
						offset.left+"px")
				});

			});
		},

		// hides the suggest box	
		hideBox : function(callback) {
			this.elements.$suggestBox.fadeOut(250, function(){
				(callback != undefined) && callback();
			});				
		},
	
		// replace incorrectly spelt word with suggestion
		replace : function(domObj, replace) {
			this.hideBox();
			switch(this.type) {
				case "textarea": this.replaceTextbox(domObj, replace); break;
				case "html" : this.replaceHtml(domObj, replace); break;
			}
		},

		// replace word in a textarea
		replaceTextbox : function(domObj, replace){
			this.removeBadword($(domObj));
			$(this.domObj).val($(this.domObj).val().replace(new RegExp("\\b"+domObj.innerHTML+"\\b", "ig"), replace.innerHTML));
		},

		// replace word in an HTML container that is not a form field
		replaceHtml : function(domObj, replace){
			$(domObj).after(replace.innerHTML).remove();
		},
		
		// remove spelling formatting from word to ignore in original element
		ignore : function() {
			this.hideBox();
			if (this.type == "textarea") {
				this.removeBadword(this.$curWord);
			} else {
				this.$curWord.after(this.$curWord.html()).remove();
			}
		},
		
		// remove seplling formatting from all words to ignore in original element
		ignoreAll : function() {
			var self = this;
			this.hideBox();
			if (this.type == "textarea") {
				this.removeBadword(this.$curWord);
			} else {
				$(".spellcheck-word-highlight", self.domObj).each(function(){
					(new RegExp(self.$curWord.html(), "i").test(this.innerHTML)) && $(this).after(this.innerHTML).remove(); // remove anchor
				});
			}
		},

		removeBadword : function($domObj){
			($domObj.next().hasClass("spellcheck-sep")) && $domObj.next().remove();
			$domObj.remove();
			if (!$(".spellcheck-sep", this.elements.$badwords).length){
				this.remove();
			} else {
				$(".spellcheck-sep:last", this.elements.$badwords).addClass("spellcheck-sep-last");
			}
		},
		
		// add word to personal dictionary (pspell only)
		addToDictionary : function() {
			var self= this;
			this.hideBox(function(){
				confirm("Are you sure you want to add the word \""+self.$curWord.text()+"\" to the dictionary?") &&
				$.ajax({
					type : "POST",
					url : self.options.url,
					data : 'addtodictionary='+self.$curWord.html(),
					dataType : "json",
					error : function(XHR, status, error) {
						alert("Sorry, there was an error processing the request.");
					},
					success: function(){
						self.ignoreAll();
						self.check();
					}
				});			
			});
		},
		
		// remove spell check formatting
		remove : function() {
			$(".spellcheck-word-highlight").each(function(){
				$(this).after(this.innerHTML).remove()
			});
			$("#spellcheck-badwords").remove();
			$(this.domObj).removeClass("spellcheck-container");
			this.elements.$suggestBox.remove();
		},
		
		// sends post request, return JSON object
		getJsonData : function(url, data, callback){
			var xhr = $.ajax({
				type : "POST",
				url : url,
				data : data,
				dataType : "json",
				cache : false,
				error : function(XHR, status, error) {
					alert("Sorry, there was an error processing the request.");
				},
				success : function(json){
					if (!json.length) {
						json.result = 1;	
					}
					(callback) && callback(json);
				}
			});
			return xhr;
		},

		// creates the suggestbox and stores the elements in an array for later use
		createElements : function(){
			var self = this;
			this.elements.$suggestWords = 
				$('<div></div>').addClass("spellcheck-suggestbox-words");
			this.elements.$ignoreWord = 
				$('<a href="#">Ignore Word</a>')
				.click(function(e){
					e.preventDefault();
					self.ignore();
				});
			this.elements.$ignoreAllWords = 
				$('<a href="#">Ignore all</a>')
				.click(function(e){
					e.preventDefault();
					self.ignoreAll();
				});
			this.elements.$ignoreWordsForever = 
				$('<a href="#" title="ignore word forever (add to dictionary)">Ignore forever</a>')
				.click(function(e){
					e.preventDefault();
					self.addToDictionary();
				});
			this.elements.$suggestFoot = 
				$("<div></div>")
				.addClass("spellcheck-suggestbox-foot")
				.append(this.elements.$ignoreWord)
				.append(this.elements.$ignoreAllWords)
				.append(this.options.engine == "pspell" ? this.elements.$ignoreWordsForever : false);
			this.elements.$suggestBox = 
				$("<div></div>")
				.addClass("spellcheck-suggestbox")
				.append(this.elements.$suggestWords)
				.append(this.elements.$suggestFoot)
				.prependTo("body");
		}
		
	};	

})(jQuery);
