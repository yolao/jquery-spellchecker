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
		
		spellcheck : function(options, callback){

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
		this.domObj = domObj;
		this.options = $.extend({
			rpc: "checkspelling.php",
			engine: "google" // pspell or google
		}, options || {});
		this.options.url = this.options.rpc+"?engine="+this.options.engine;
		this.elements = {};
		this.init();
	};

	SpellChecker.prototype = {

		// initial setup
		init : function(){
			var self = this;
			this.createElements();
			// hide the suggest box on document click
			$(document).bind("click", function(e){
				if (!$(e.target).hasClass(".spellcheck-word-highlight") && !$(e.target).parents().filter(".spellcheck-suggestbox").length) {
					self.hideBox();
				}
			});
		},

		// checks a chunk of text for bad words, then either shows the words below the original element (if texarea) or highlights the bad words
		check : function(callback){

			var self = this, node = this.domObj.nodeName, puncExp = '/^\W|[\W]+\W|\W$|\n|\t|\s{2,}/';
		
			if (node == "TEXTAREA" || node == "INPUT") {
				this.type = 'textarea';
				var text = $.trim($(this.domObj).val().replace(new RegExp(puncExp, "g"), " ")); // strip punctuation
				this.getJsonData(this.options.url, {text:text}, function(json){
					if (json.result) {
						callback(1);
						return;
					}
					if (!self.elements.$badwords) {
						self.elements.$badwords = $("<div></div>").attr("id", "spellcheck-badwords");
						$(self.domObj).after(self.elements.$badwords);
					} else {
						self.elements.$badwords.html("");
					}
					for(var badword in json) {
						$("<span></span>")
						.addClass("spellcheck-word-highlight")
						.text(self.options.engine == 'pspell' ? json[badword] : text.substr(json[badword][0], json[badword][1]))
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
				this.getJsonData(this.options.url, {text:text}, function(json){
					if (json.result) {
						callback(1);
						return;
					}
					var replace = "", html = $(self.domObj).html();
					// highlight bad words
					for(var badword in json) {
						var replaceWord = self.options.engine == 'pspell' ? json[badword] : text.substr(json[badword][0], json[badword][1]);
						// we only want unique word replacements
						if (!new RegExp(replaceWord, "i").test(replace)) {
							replace += replaceWord;
							html = html.replace(
								new RegExp("\\b("+replaceWord+")\\b", "ig"),
								'<span class=\"spellcheck-word-highlight\">$1</span>'
							);
						}
					}							
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
				width : this.elements.$suggestBox.outerWidth() < $domObj.outerWidth() ? $domObj.innerWidth()+"px" : "auto",
				left : offset.left+"px",
				top : (offset.top + $domObj.outerHeight()) + "px"
			}).fadeIn(200);		

			this.getJsonData(this.options.url, {suggest:$.trim($domObj.text())}, function(json){
				// build suggest word list
				self.elements.$suggestWords.empty();
				for(var i=0;i<(json.length<5?json.length:5);i++) {
					var $replaceWord = $("<a></a>")
						.attr({href: "#"})
						.addClass((!i?'first':''))
						.click(function(e){
							e.preventDefault();
							self.replace(domObj, this);
						})
						.text(json[i]);
					self.elements.$suggestWords.append($replaceWord);
				}								
				// no suggestions
				(!i) && self.elements.$suggestWords.append('<em>(no suggestions)</em>');
							
				// show the suggest box
				self.elements.$suggestFoot.show();
				self.elements.$suggestBox
				.css({
					width : self.elements.$suggestBox.outerWidth() < $domObj.outerWidth() ? $domObj.innerWidth()+"px" : "auto",
					left : self.elements.$suggestBox.outerWidth() + offset.left > $("body").width() ? 
						(offset.left - self.elements.$suggestBox.width()) + $domObj.outerWidth()+"px":offset.left+"px"
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
			$(domObj).next().remove();
			$(domObj).remove();
			$(this.domObj).val($(this.domObj).val().replace(new RegExp(domObj.innerHTML, "i"), replace.innerHTML));
		},

		// replace word in an HTML container that is not a form field
		replaceHtml : function(domObj, replace){
			$(domObj).after(replace.innerHTML).remove();
		},
		
		// remove spelling formatting from word to ignore in original element
		ignore : function() {
			this.hideBox();
			if (this.type == "textarea") {
				this.$curWord.remove();
			} else {
				this.$curWord.after(this.$curWord.html()).remove();
			}
		},
		
		// remove seplling formatting from all words to ignore in original element
		ignoreAll : function() {
			var self = this;
			this.hideBox();
			if (this.type == "textarea") {
				this.$curWord.remove();
			} else {
				$(".spellcheck-word-highlight", self.domObj).each(function(){
					(new RegExp(self.$curWord.html(), "i").test(this.innerHTML)) && $(this).after(this.innerHTML).remove(); // remove anchor
				});
			}
		},
		
		// add word to personal dictionary (pspell only)
		addToDictionary : function() {
			var self= this;
			this.hideBox(function(){
				confirm("Are you sure you want to add the word \""+this.$curWord.html()+"\" to the dictionary?") &&
				$.ajax({
					type : "POST",
					url : self.options.url,
					data : 'addtodictionary='+self.$curWord.html(),
					dataType : "json",
					error : function(XHR, status, error) {
						alert("Sorry, there was an error processing the request.");
					},
					success: self.check
				});			
			});
		},
		
		// remove spell check formatting
		remove : function() {
			$(".spellcheck-word-highlight", this.domObj).each(function(){
				$(this).after(this.innerHTML).remove()
			});
		},
		
		// sends post request, return JSON object
		getJsonData : function(url, data, callback){
			var xhr = $.ajax({
				type : "POST",
				url : url,
				data : data,
				dataType : "json",
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

		// creates the suggestbox
		createElements : function(){
			var self = this;
			this.elements.$suggestWords = 
				$("<div></div>")
				.addClass("spellcheck-suggestbox-words");
			this.elements.$ignoreWord = 
				$("<a></a>")
				.attr({ title: "ignore word", href: "#" })
				.click(function(e){
					e.preventDefault();
					self.ignore();
				})
				.text("Ignore word");
			this.elements.$ignoreAllWords = 
				$("<a></a>")
				.attr({ title: "ignore all words", href: "#"})
				.click(function(e){
					e.preventDefault();
					self.ignoreAll();
				})
				.text("Ignore all");
			this.elements.$ignoreWordsForever = 
				$("<a></a>")
				.attr({title: "ignore word forever (add to dictionary)", href: "#"})
				.click(function(e){
					e.preventDefault();
					self.addToDictionary();
				})
				.text("Ignore forever");
			this.elements.$suggestFoot = 
				$("<div></div>")
				.addClass("spellcheck-suggestbox-foot")
				.append(this.elements.$ignoreWord)
				.append(this.elements.$ignoreAllWords)
				.append(this.options.engine == "pspel" ? this.elements.$ignoreWordsForever : false);
			this.elements.$suggestBox = 
				$("<div></div>")
				.addClass("spellcheck-suggestbox")
				.append(this.elements.$suggestWords)
				.append(this.elements.$suggestFoot)
				.prependTo("body");
		}
		
	};	

})(jQuery);
