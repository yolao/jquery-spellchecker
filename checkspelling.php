<?php

/*
 * Filename:	checkspelling.php
 * Project:	http://jquery-spellchecker.googlecode.com
 * Developer:	Richard Willis
 * Notes:	PHP5+  
 *
 */


!isset($_REQUEST['engine']) and exit('error: no spell engine specified');

$Spelling = new Spelling($_REQUEST['engine']);

class Spelling {

	// site specific personal dictionary folder, needs to have write perms
	protected $pspell_personal_dictionary = '/srv/projects/jquery-spellchecker.localdomain/dictionary';

	// default language
	protected $lang = 'en';

	public function __construct($rpc="google") {
		!isset($_GET['noheaders']) and $this->sendHeaders();
		if (isset($_REQUEST['lang']) and $_REQUEST['lang']) $this->lang = $_REQUEST['lang'];
		$this->pspell_personal_dictionary .= '/'.$this->lang.'.pws';
		method_exists($this, $rpc) and $this->$rpc();
	}

	private function pspell() {
		
		foreach($_REQUEST as $key => $value) {
			$$key = stripslashes(trim($value));
		}

		// load the dictionary
		$pspell_link = pspell_new_personal($this->pspell_personal_dictionary, $this->lang);
		
		// return suggestions
		if (isset($suggest)) {
			exit(json_encode(pspell_suggest($pspell_link, $suggest)));	
		} 
		// return badly spelt words
		elseif (isset($text)) {
			$words = array();
			foreach($text = explode(' ', $text) as $word) {
				if (!pspell_check($pspell_link, $word) and !in_array($word, $words)) {
					$words[] = utf8_encode(html_entity_decode($word));
				}
			}
			exit(json_encode($words));
		}
		// add word to personal dictionary
		elseif (isset($addtodictionary)) {
			$pspell_config = pspell_config_create('en');
			@pspell_config_personal($pspell_config, $this->pspell_personal_dictionary) or die('can\'t find pspell dictionary');
			$pspell_link = pspell_new_config($pspell_config);
			@pspell_add_to_personal($pspell_link, strtolower($addtodictionary)) or die('You can\'t add a word to the dictionary that contains any punctuation.');
			pspell_save_wordlist($pspell_link);
			exit(array());
		}	
		
	}
	
	private function google() {
	
		foreach($_REQUEST as $key => $value) {
			$$key = stripslashes(trim($value));
		}

		// return badly spelt words from a chunk of text	
		if (isset($text)) {
			$words = array();
			foreach($matches = $this->getGoogleMatches(stripslashes($text)) as $word) {
				// position & length of badly spelt word
				$words[] = substr($text, $word[1], $word[2]);
			}
			exit(json_encode($words));
		}
		// return suggestions for a specific word
		else if (isset($suggest)) {
			$matches = 
			$this->getGoogleMatches($suggest) and
			$matches[0][4] and 
			exit(json_encode(explode("\t", $matches[0][4]))) or
			exit(json_encode(array()));
		}	
	}
	
	private function getGoogleMatches($str) {
		$server = 'www.google.com';
		$port = 443;
		$path = '/tbproxy/spell?lang='.$this->lang.'&hl=en';
		$host = 'www.google.com';
		$url = 'https://' . $server;

		// setup XML request
		$xml = '<?xml version="1.0" encoding="utf-8" ?>';
		$xml .= '<spellrequest textalreadyclipped="0" ignoredups="0" ignoredigits="1" ignoreallcaps="1">';
		$xml .= '<text>'.$str.'</text></spellrequest>';

		// setup headers to be sent
		$header  = "POST {$path} HTTP/1.0 \r\n";
		$header .= "MIME-Version: 1.0 \r\n";
		$header .= "Content-type: application/PTI26 \r\n";
		$header .= "Content-length: ".strlen($xml)." \r\n";
		$header .= "Content-transfer-encoding: text \r\n";
		$header .= "Request-number: 1 \r\n";
		$header .= "Document-type: Request \r\n";
		$header .= "Interface-Version: Test 1.4 \r\n";
		$header .= "Connection: close \r\n\r\n";
		$header .= $xml;

		// response data
		$xml_response = '';

		// use curl if it exists
		if (function_exists('curl_init')) {
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL,$url);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
			curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $header);
			curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
			$xml_response = curl_exec($ch);
			curl_close($ch);
		} else {
			// use raw sockets
			$fp = @fsockopen('ssl://'.$server, $port, $errno, $errstr, 30) or die("Unable to contact spellcheck server: {$server} on port: {$port}");
			if ($fp) {
				// send request
				fwrite($fp, $header);

				// read response
				$xml_response = '';
				while (!feof($fp)) {
					$xml_response .= @fgets($fp, 128);
				}
				fclose($fp);
			} else {
				die('Could not open SSL connection to google.');
			}
		}

		// grab and parse content, remove google XML formatting
		$matches = array();
		preg_match_all('/<c o="([^"]*)" l="([^"]*)" s="([^"]*)">([^<]*)<\/c>/', $xml_response, $matches, PREG_SET_ORDER);

		// note: google will return encoded data, so no need to encode ut8 characters!
		return $matches;
	}
	
	private static function sendHeaders() {
		header('Content-type: application/json');			// data type
		header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");		// no cache
		header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");	// no cache
		header("Cache-Control: no-store, no-cache, must-revalidate");	// no cache
		header("Cache-Control: post-check=0, pre-check=0", false);	// no cache
	}
}
