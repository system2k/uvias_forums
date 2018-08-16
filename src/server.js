module.exports = function(){
	var http = require("http")
	var url = require("url")
	var fs = require("fs")
	var sql = require("sqlite3").verbose()
	var domain = require("domain")
	var swig = require("swig")
	var querystring = require("querystring")
	var crypto = require('crypto');
	
	var port = 80
	var database = new sql.Database("../database.db")
	var pre_loaded_images = {};
	var pre_loaded_content = {};
	function pre_load(type, name, path) {
		if(type == "img") pre_loaded_images[name] = fs.readFileSync(path)
		if(type == "js") pre_loaded_content[name] = fs.readFileSync(path)
	}
	pre_load("img", "fav_icon", "./src/image/fav_icon.png")
	pre_load("img", "bar", "./src/image/bar.gif")
	pre_load("img", "barGray", "./src/image/barGray.gif")
	
	pre_load("js", "adminpanel", "./src/javascripts/adminpanel.js")
	
	var page_main = require("./pages/main.js")
	var page_SubForum = require("./pages/sf.js")
	var page_thread = require("./pages/thread.js")
	var page_register = require("./pages/register.js")
	var page_post = require("./pages/post.js")
	var page_login = require("./pages/login.js")
	var page_logout = require("./pages/logout.js")
	var page_reply = require("./pages/reply.js")
	var page_admin = require("./pages/admin.js")
	
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
	
	function parseCookie(cookie) {
		try {
			if(typeof cookie !== "string") {
				return {};
			}
			cookie = cookie.split(";");
			var list = {}
			for(var i in cookie) {
				var c = cookie[i].split("=");
				if(c.length > 2) {
					var ar = c;
					var var2 = ar.pop();
					ar = ar.join("=")
					ar = ar.replace(/ /g, "");
					var2 = var2.replace(/ /g, "");
					list[ar] = var2
				} else if(c.length === 2) {
					list[decodeURIComponent(c[0].replace(/ /g, ""))] = decodeURIComponent(c[1].replace(/ /g, ""))
				} else if(c.length === 1) {
					if(c[0] !== "") list[c[0]] = null
				}
			}
			return list;
		} catch(e) {
			return {};
		}
	}
	
	function cookieExpireDate(timestamp) {
		var dayWeekList = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		var monthList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		var _DayOfWeek = dayWeekList[new Date(timestamp).getDay()];
		var _Day = new Date(timestamp).getDate();
		var _Month = monthList[new Date(timestamp).getMonth()];
		var _Year = new Date(timestamp).getFullYear();
		var _Hour = new Date(timestamp).getHours();
		var _Minute = new Date(timestamp).getMinutes();
		var _Second = new Date(timestamp).getSeconds();

		var compile = _DayOfWeek + ", " + _Day + " " + _Month + " " + _Year + " " + _Hour + ":" + _Minute + ":" + _Second + " UTC";
		return compile
	}
	
	var stdin = process.stdin;
	stdin.setRawMode(true);
	stdin.resume();
	stdin.setEncoding("utf8");
	
	var command = "";
	
	stdin.on("data", function(key){
		if(key === "\u0003"){
			process.exit()
		}
		if(key === "\b"){
			command = command.substring(0, command.length-1)
			process.stdout.write("\033[1D")
			process.stdout.write(" ")
			process.stdout.write("\033[1D")
		} else if(key === "\r"){
			process.stdout.write("\n")
			processCommand(command)
			command = ""
		} else {
			process.stdout.write(key)
			command += key
		}
	});
	
	function processCommand(cmd){
		cmd = cmd.split(" ")
		if(cmd[0] === "rank"){
			database.run("update users set rank=? where username=?", [cmd[2], cmd[1]], function(a,b){
				if(a == null) console.log("Rank for " + cmd[1] + " set to: " + cmd[2])
				if(a !== null) console.log("Error setting rank")
			})
		}
	}
	
	database.get("select * from info where name='init'", function(a, b){
		if(typeof a == "object" && a !== null) {
			if(a.code == "SQLITE_ERROR") {
				database.run("create table info(name)", function(){
					database.run("insert into info values('init')", function(){
						database.run("create table subforums('id' integer PRIMARY KEY, 'name' text, 'desc' text, 'date_created' integer, post_count integer, _order integer)", function(){
							database.run("create table threads(id integer primary key, subforum integer, title text, body text, date_created integer, user integer, type integer, parent integer, font integer, _order integer)", function(){
								database.run("create table users(id integer primary key, username text, password text, date_joined integer, posts integer, rank integer)", function(){
									database.run("create table session(user_id integer, expire_date integer, key text)", function(){
										run()
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
	
	var Month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
	var _data_ago = ["minute", "hour", "day", "month", "year"]
	function date_created(timestamp){
		timestamp = parseInt(timestamp)
		var raw_ts = timestamp
		timestamp = new Date(timestamp)
		
		var mth = Month[timestamp.getMonth()]
		var day = ("0" + timestamp.getDate()).slice(-2)
		var yer = timestamp.getFullYear()
		
		var hr = timestamp.getHours()
		var mt = ("0" + timestamp.getMinutes()).slice(-2)
		
		var ampm = "AM"
		if(hr >= 12) {
			ampm = "PM"
			if(hr > 12) {
				hr -= 12
			}
		}
		
		hr = ("0" + hr).slice(-2)
		
		var minutes_ago = Math.floor((Date.now() - raw_ts)/(60000));
		var _data = _data_ago[0];
		
		if(minutes_ago >= 501120){
			_data = _data_ago[4]
			minutes_ago = Math.floor(minutes_ago/501120)
		} else if(minutes_ago >= 41760) {
			_data = _data_ago[3]
			minutes_ago = Math.floor(minutes_ago/41760)
		} else if(minutes_ago >= 1440){
			_data = _data_ago[2]
			minutes_ago = Math.floor(minutes_ago/1440)
		} else if(minutes_ago >= 60){
			_data = _data_ago[1]
			minutes_ago = Math.floor(minutes_ago/60)
		}
		if(minutes_ago !== 1){
			_data += "s"
		}
		
		
		return mth + " " + day + ", " + yer + " " + hr + ":" + mt + " " + ampm + " (" + minutes_ago + " " + _data + " ago)"
	}
	
	function server_(req, res) {
		var d = domain.create()
		d.on('error', function(er) {
		   res.statusCode = 500;
		   res.end("500: An error occured")
		})
		d.add(req)
		d.add(res)
		d.run(function(){
			
			
			var cookie = req.headers.cookie
			cookie = parseCookie(cookie)
			var sid = cookie.sessionid
			if(typeof sid !== "string") sid = "";
			var user_id;
			var loggedin;
			
			var userinfo
			
			database.get("select user_id from session where key=?", [sid], function(a, b){
				var user_id = undefined
				if(b){
					user_id = b.user_id;
					loggedin = user_id != undefined
					var rank = 0;
					userinfo = {
						sid: sid,
						user_id: user_id,
						loggedin: loggedin,
						top_rank: false
					}
					if(loggedin) {
						database.get("select rank from users where id=?", [user_id], function(a, b){
							userinfo.top_rank = b.rank == 1 || b.rank == 2
							comp()
						})
					} else {
						comp()
					}
				} else {
					userinfo = {
						sid: "",
						user_id: 0,
						loggedin: false,
						top_rank: false
					}
					comp()
				}
			})
			
			
			function comp(){
				var path = url.parse(req.url)
				var pathname = path.pathname
				if(pathname.charAt(0) === "/") pathname = pathname.substr(1)
					
				if(pathname == "") {
					page_main(req, res, swig, database, parseCookie, userinfo)
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
				} else if(pathname == "scripts/adminpanel.js") {
					if(userinfo.top_rank === false){
						res.writeHead(302, {
							"Location": "scripts/adminpanel.js"
						})
						res.end()
					}
					if(userinfo.top_rank === true){
						res.writeHead(200, {
							"Content-Type": "application/javascript"
						})
						res.end(pre_loaded_content["adminpanel"], "binary");
					}
				} else if(pathname.startsWith("sf/")){
					page_SubForum(req, res, swig, database, pathname.substr(3), parseCookie, userinfo)
				} else if(pathname.startsWith("thread/")) {
					page_thread(req, res, swig, database, pathname.substr(7), parseCookie, userinfo, date_created)
				} else if(pathname == "register") {
					page_register(req, res, swig, querystring, database, encryptHash, crypto, url, parseCookie, userinfo)
				} else if(pathname.startsWith("post/")) {
					page_post(req, res, swig, database, querystring, pathname.substr(5), parseCookie, userinfo)
				} else if(pathname == "login"){
					page_login(req, res, database, querystring, checkHash, cookieExpireDate)
				} else if(pathname == "logout"){
					page_logout(req, res, database, cookieExpireDate, parseCookie)
				} else if(pathname.startsWith("reply/")){
					page_reply(req, res, database, pathname.substr(6), parseCookie, swig, querystring, userinfo)
				} else if(pathname == "admin") {
					if(userinfo.top_rank === false){
						res.writeHead(302, {
							"Location": "/admin"
						})
						res.end()
					}
					if(userinfo.top_rank === true){
						page_admin(req, res, swig, userinfo, database, date_created, querystring)
					}
				} else {
					res.statusCode = 404;
					res.end("404: Page does not exist")
				}
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