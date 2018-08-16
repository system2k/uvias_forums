module.exports = function(){
	var http = require("http")
	var url = require("url")
	var fs = require("fs")
	var sql = require("sqlite3").verbose()
	var domain = require("domain")
	var swig = require("swig")
	var querystring = require("querystring")
	var crypto = require('crypto');
	
	var port = 81
	var database = new sql.Database("../database.db")
	var pre_loaded_images = {};
	function pre_load(name, path) {
		pre_loaded_images[name] = fs.readFileSync(path)
	}
	pre_load("fav_icon", "./src/image/fav_icon.png")
	pre_load("bar", "./src/image/bar.gif")
	pre_load("barGray", "./src/image/barGray.gif")
	
	var page_main = require("./pages/main.js")
	var page_SubForum = require("./pages/sf.js")
	var page_thread = require("./pages/thread.js")
	var page_register = require("./pages/register.js")
	var page_post = require("./pages/post.js")
	var page_login = require("./pages/login.js")
	
	var pw_encryption = "sha512WithRSAEncryption";
	encryptHash = function(pass, salt) {
		if(!salt) {
			var salt = crypto.randomBytes(10).toString("hex")
		}
		var hsh = crypto.createHmac(pw_encryption, salt).update(pass).digest("hex")
		var hash = pw_encryption + "$" + salt + "$" + hsh;
		return hash;
	};

	checkHash = function(hash, pass) {
		if(typeof hash !== "string") return false;
		hash = hash.split("$");
		if(hash.length !== 3) return false;
		if(typeof pass !== "string") return false;
		return encryptHash(pass, hash[1]) === hash.join("$");
	};
	
	database.get("select * from info where name='init'", function(a, b){
		if(typeof a == "object" && a !== null) {
			if(a.code == "SQLITE_ERROR") {
				database.run("create table info(name)", function(){
					database.run("insert into info values('init')", function(){
						database.run("create table subforums('id' integer PRIMARY KEY, 'name' text, 'desc' text, 'date_created' integer, post_count integer)", function(){
							database.run("insert into subforums values(null, ?, ?, ?, 0)", ["discussion1", "[No description]", Date.now()], function(){
								database.run("insert into subforums values(null, ?, ?, ?, 0)", ["2program", "Discussion about the forum", Date.now()], function(){
									database.run("create table threads(id integer primary key, subforum integer, title text, body text, date_created text, user text, type integer)", function(){
										database.run("create table users(id integer primary key, username text, password text, date_joined integer, posts integer)", function(){
											run()
										})
									})
								})
							})
						})
					})
				})
			}
		} else {
			run();
		}
	})
	
	function server_(req, res) {
		var d = domain.create()
		d.on('error', function(er) {
		   res.statusCode = 500;
		   res.end("500: An error occured")
		})
		d.add(req)
		d.add(res)
		d.run(function(){
			var path = url.parse(req.url)
			var pathname = path.pathname
			if(pathname.charAt(0) === "/") pathname = pathname.substr(1)
				
			if(pathname == "") {
				page_main(req, res, swig, database)
			} else if(pathname == "favicon.ico") {
				res.writeHead(200, {
					"Content-Type": "image/png"
				})
				res.end(pre_loaded_images["fav_icon"], "binary");
			} else if(pathname == "images/bar.gif") {
				res.writeHead(200, {
					"Content-Type": "image/gif"
				})
				res.end(pre_loaded_images["bar"], "binary");
			} else if(pathname == "images/barGray.gif") {
				res.writeHead(200, {
					"Content-Type": "image/gif"
				})
				res.end(pre_loaded_images["barGray"], "binary");
			} else if(pathname.startsWith("sf/")){
				page_SubForum(req, res, swig, database, pathname.substr(3))
			} else if(pathname.startsWith("thread/")) {
				page_thread(req, res, swig, database, pathname.substr(7))
			} else if(pathname == "register") {
				page_register(req, res, swig, querystring, database, encryptHash, crypto, url)
			} else if(pathname.startsWith("post/")) {
				page_post(req, res, swig, database, querystring, pathname.substr(5))
			} else if(pathname == "login"){
				page_login(req, res, database)
			} else {
				res.statusCode = 404;
				res.end("404: Page does not exist")
			}
		})
	}
	
	function run(){
		var server = http.createServer(server_)
		server.listen(port, function() {
			var addr = server.address();
			console.log("Server listening on port: " + addr.port)
		});
	}
	
}