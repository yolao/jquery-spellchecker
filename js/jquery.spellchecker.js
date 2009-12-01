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

	// note, perhaps only 1 instance of the spellchecker would be better??

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
				if (!$(e.target).hasClass(".spellcheck-badspelling") && !$(e.target).parents().filter(".suggestDrop").length) {
					self.hideBox();
				}
			});
		},

		// checks a chunk of text for bad words, then either shows the words below the original element (if texarea) or highlights the bad words
		check : function(callback){

			var self = this, node = this.domObj.nodeName;
		
			if (node == "TEXTAREA") {
				this.checkTextarea(function(text, json) {
					if (!self.elements.$badwords) {
						self.elements.$badwords = $("<div></div>").attr("id", "spellcheck-badwords");
						$(self.domObj).after(self.elements.$badwords);
					} else {
						self.elements.$badwords.html("");
					}
					for(var badword in json) {
						$("<span></span>")
						.addClass("spellcheck-badspelling")
						.text(self.options.engine == 'pspell' ? json[badword] : text.substr(json[badword][0], json[badword][1]))
						.appendTo(self.elements.$badwords);
					}
					$(".spellcheck-badspelling", self.elements.$badwords).click(function(){
						self.suggest(this);
					}).after("<span class=\"spellcheck-sep\">,</span>");
					(callback) && callback();
				});
			} else {
				var html = $(this.domObj).html();
				this.checkHTML(function(text, json){
					var replace = "";
					// highlight bad words
					for(var badword in json) {
						var replaceWord = self.options.engine == 'pspell' ? json[badword] : text.substr(json[badword][0], json[badword][1]);
						// we only want unique word replacements
						if (!new RegExp(replaceWord, "i").test(replace)) {
							replace += replaceWord;
							html = html.replace(
								new RegExp("\\b("+replaceWord+")\\b", "ig"),
								'<span class=\"spellcheck-badspelling\">$1</span>'
							);
						}
					}							
					$(self.domObj).html(html);
					$(".spellcheck-badspelling", self.domObj).click(function(){
						self.suggest(this);
					});
					(callback) && callback();
				});
			}
		},

		// grabs, munges and checks textarea text, returns JSON object of bad words
		checkTextarea : function(callback){
			this.type = 'textarea';
			var text = $.trim($(this.domObj).val().replace(/^\W|[\W]+\W|\W$|\n|\t|\s{2,}/g, " ")); // strip punctuation
			this.checkText(text, function(json){
				(callback) && callback(text, json);
			});
		},

		// grabs, munges and checks HTML text, returns JSON object of bad words
		checkHTML : function(callback){
			this.type = 'html';
			var text = $.trim($(this.domObj).text().replace(/^\W|[\W]+\W|\W$|\n|\t|\s{2,}/g, " ")); // strip punctuation
			this.checkText(text, function(json) {
				(callback) && callback(text, json);
			});
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

			this.getWordSuggestions($.trim($domObj.text()), function(json){
				// build suggest word list
				self.elements.$suggestWords.empty();
				for(var i=0;i<(json.length<5?json.length:5);i++) {
					var $replaceWord = $("<a></a>")
						.attr({href: "#",class: (!i?'first':'')})
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

		// sends post request to check a chunk of text, return JSON object of incorrectly spelt words
		checkText : function(text, callback){
			var self = this,
			xhr = $.ajax({
				type : "POST",
				url : this.options.url,
				data : 'text='+text,
				dataType : "json",
				error : function(XHR, status, error) {
					alert("Sorry, there was an error processing the request.");
				},
				success : function(json){
					if (!json.length) {
						$(".loading").hide();
						alert('There are no incorrectly spelt words :)');
					} else {
						(callback) && callback(json);
					}
				}
			});
			return xhr;
		},

		// sends post request to get single word suggestions, return JSON object of suggested words
		getWordSuggestions : function(text, callback) {
			var self = this,
			xhr = $.ajax({
				type : "POST",
				url : this.options.url,
				data : "suggest="+text,
				dataType : "json",
				error : function(XHR, status, error) {
					alert("Sorry, there was an error processing the request.");
				},
				success : function(json){			
					(callback) && callback(json);
				}
			});
			return xhr;
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
			this.$curWord.after(this.$curWord.html()).remove();
			this.hideBox();
		},
		
		// remove seplling formatting from all words to ignore in original element
		ignoreAll : function() {
			var self = this;
			$("span.spellcheck-badspelling", self.domObj).each(function(){
				(new RegExp(self.$curWord.html(), "i").test(this.innerHTML)) && $(this).after(this.innerHTML).remove(); // remove anchor
			});
			this.hideBox();
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
			$("span.spellcheck-badspelling", this.domObj).each(function(){
				$(this).after(this.innerHTML).remove()
			});
		},

		// creates the suggestbox
		createElements : function(){
			var self = this;
			this.elements.$suggestWords = 
				$("<div></div>")
				.attr({id: "suggestwords"});
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
				.attr({id: "suggestfoot", class: "foot"})
				.append(this.elements.$ignoreWord)
				.append(this.elements.$ignoreAllWords)
				.append(this.options.engine == "pspel" ? this.elements.$ignoreWordsForever : false);
			this.elements.$suggestBox = 
				$("<div></div>")
				.attr({id: "suggestbox", class: "suggestDrop"})
				.append(this.elements.$suggestWords)
				.append(this.elements.$suggestFoot)
				.prependTo("body");
		}

	};	

})(jQuery);
