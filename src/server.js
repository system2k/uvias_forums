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
	pre_load("img", "bottom_bar", "./src/image/bottom_bar.png")
	pre_load("img", "sidebar", "./src/image/sidebar.png")
	pre_load("img", "offline", "./src/image/offline.png")
	pre_load("img", "online", "./src/image/online.png")
	pre_load("img", "thread", "./src/image/thread.png")
	pre_load("img", "thread_read", "./src/image/thread_read.png")
	pre_load("img", "forum", "./src/image/forum.png")
	pre_load("img", "expand", "./src/image/expand.png")
	pre_load("img", "collapse", "./src/image/collapse.png")
	
	pre_load("js", "adminpanel", "./src/javascripts/adminpanel.js")
	
	var page_main = require("./pages/main.js")
	var page_Forum = require("./pages/sf.js")
	var page_thread = require("./pages/thread.js")
	var page_register = require("./pages/register.js")
	var page_post = require("./pages/post.js")
	var page_login = require("./pages/login.js")
	var page_logout = require("./pages/logout.js")
	var page_reply = require("./pages/reply.js")
	var page_admin = require("./pages/admin.js")
	var page_admin_editannouncement = require("./pages/admin_editannouncement.js")
	var page_admin_editforums = require("./pages/admin_editforums.js")
	var page_profile = require("./pages/profile.js")
	
	var cache_data = {
		announcement: ""
	}
	
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
	
	function configureStyle(n) {
		process.stdout.write("\x1B["+n+"m")
	}
	var cols = {
		red: 31,
		green: 32,
		yellow: 33,
		blue: 34,
		magenta: 35,
		cyan: 36,
		gray: 37,
		l_gray: 90,
		l_red: 91,
		l_green: 92,
		l_yellow: 93,
		l_blue: 94,
		l_magenta: 95,
		white: 97
	}
	function log(text, color) {
		if(color) configureStyle(cols[color])
		console.log(text)
		if(color) configureStyle(0)
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
	
	var lastCommand = ""
	var addsampledataconfirm = false;
	function processCommand(cmd){
		var rawCommand = cmd;
		cmd = cmd.split(" ")
		if(cmd[0] === "rank"){
			database.run("update users set rank=? where username=?", [cmd[2], cmd[1]], function(a,b){
				if(a == null) log("Rank for " + cmd[1] + " set to: " + cmd[2], "l_green")
				if(a !== null) log("Error setting rank", "l_red")
			})
			lastCommand = rawCommand
		}
		if(cmd[0] === "update" && cmd[1] === "post-count") {
			database.run("update forums set post_count = (select count(*) from threads where forum=forums.id and type=0 and deleted=0)", function(){
				log("Updated forum post count to correct numbers", "l_green")
				database.run("update users set posts = (select count(*) from threads where user=users.id and deleted=0)", function(){
					log("Updated user post count to correct numbers", "l_green")
					log("Operation completed", "l_green")
				})
			})
			lastCommand = rawCommand
		}
		if(cmd[0] === "log-active-users") {
			if(Object.keys(online_users).length === 0) log("There are no active users", "l_red")
			for(i in online_users){
				console.log(Date.now(), online_users[i], Date.now()-online_users[i])
			}
			lastCommand = rawCommand
		}
		if(cmd[0] === "add" && cmd[1] === "sample-data") {
			console.log("Are you sure you want to add sample data?\nThis must only be executed right after the database has been created and has no data on it.\nType 'yes' to continue adding sample data.\nUse at your own risk.")
			addsampledataconfirm = true
			lastCommand = rawCommand
		}
		if(cmd[0] === "yes" && addsampledataconfirm) {
			console.log("Adding data...")
			database.run("insert into users values(null, ?, ?, ?, 0, 2)", ["Admin", encryptHash("admin"), Date.now()], function(e){
				if(e) {
					log("An error occured while creating the admin account:", "l_red")
					console.log(e)
				} else {
					log("Added admin account successfully (username: admin, password: admin)", "l_green")
					database.run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?)", ["Forum 1", "Sample forum generated automatically using the console", Date.now(), 1], function(e){
						if(e) {
							log("An error occured while creating sample forum #1:", "red")
							console.log(e)
						} else {
							log("Added sample forum #1 successfully", "l_green")
							database.run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?)", ["Forum 2", "Another forum generated automatically using the console", Date.now(), 2], function(e){
								if(e) {
									log("An error occured while creating sample forum #2:", "l_red")
									console.log(e)
								} else {
									log("Added sample forum #2 successfully", "l_green")
									console.log("Sample data creation complete.")
								}
							})
						}
					})
				}
			})
		}
		if(cmd[0] === "repeat") {
			console.log("Repeating last command: " + lastCommand)
			processCommand(lastCommand)
		}
	}
	
	database.get("select * from info where name='init'", function(a, b){
		if(typeof a == "object" && a !== null) {
			if(a.code == "SQLITE_ERROR") {
				log("Creating tables...", "l_green")
				
				
				
				database.run("create table info(name text, data text)", function(){
					console.log("Created 'info'")
					db_initialize()
				})
				
				function db_initialize(){
					database.run("insert into info values('init', '')", function(){
						console.log("Marked database as initialized")
						db_announcement()
					})
				}
				
				function db_announcement(){
					database.run("insert into info values('announcement', 'No announcement')", function(){
						console.log("Added announcement")
						db_forums()
					})
				}
				
				function db_forums(){
					database.run("create table forums('id' integer PRIMARY KEY, 'name' text, 'desc' text, 'date_created' integer, thread_count integer, post_count integer, _order integer)", function(){
						console.log("Created 'forums'")
						db_threads()
					})
				}
				
				function db_threads(){
					database.run("create table threads(id integer primary key, forum integer, title text, body text, date_created integer, user integer, type integer, parent integer, thread integer, font integer, _order integer, deleted integer, views integer)", function(){
						console.log("Created 'threads'")
						db_users()
					})
				}
				
				function db_users(){
					database.run("create table users(id integer primary key, username text, password text, date_joined integer, posts integer, rank integer)", function(){
						console.log("Created 'users'")
						db_session()
					})
				}
				
				function db_session(){
					database.run("create table session(user_id integer, expire_date integer, key text)", function(){
						console.log("Created 'session'")
						db_views()
					})
				}
				
				function db_views(){
					database.run("create table views(user integer, date integer, type integer, max_readAll_id integer, post_id integer, forum_id integer)", function(){
						console.log("Created 'views'")
						log("Table creation complete.", "l_green")
						begin()
					})
				}
			}
		} else {
			begin();
		}
	})
	
	function begin(){
		database.get("select data from info where name='announcement'", function(err, anc){
			cache_data.announcement = anc.data
			start_server()
		})
	}
	
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
	
	/*
	if needed:
	
	res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
	res.setHeader("Pragma", "no-cache");
	res.setHeader("Expires", "0");
	*/
	
	
	var online_users = {}
	
	setInterval(function(){
		//check last activities
		var Now = Date.now()
		var Compare = Now - 1000 * 60 * 5 // in last 5 minutes
		for(i in online_users){
			var time = online_users[i]
			if(Compare > time) {
				delete online_users[i]
			}
		}
		//clear expired sessions
		database.all("delete from session where expire_date <= ?", [Date.now()])
	}, 1000*60) // check every minute
	
	process.on('uncaughtException', function(err) {
		if(err.errno === 'EADDRINUSE') {
			console.log("The port " + port + " is already in use. The server cannot start")
		} else {
			console.log(err)
		}
		process.exit()
	});
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
						top_rank: false,
						page_path: path.href,
						cookie: cookie,
						announcement: cache_data.announcement
					}
					online_users[user_id] = Date.now()
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
						top_rank: false,
						page_path: path.href,
						cookie: cookie,
						announcement: cache_data.announcement
					}
					comp()
				}
			})
			
			
			function comp(){
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
					
				} else if(pathname == "images/bottom_bar.png") {
					res.writeHead(200, {
						"Content-Type": "image/png"
					})
					res.end(pre_loaded_images["bottom_bar"], "binary");
					
				} else if(pathname == "images/sidebar.png") {
					res.writeHead(200, {
						"Content-Type": "image/png"
					})
					res.end(pre_loaded_images["sidebar"], "binary");
					
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
					
				} else if(pathname == "images/offline.png") {
					res.writeHead(200, {
						"Content-Type": "image/png"
					})
					res.end(pre_loaded_images["offline"], "binary");
					
				} else if(pathname == "images/online.png") {
					res.writeHead(200, {
						"Content-Type": "image/png"
					})
					res.end(pre_loaded_images["online"], "binary");
					
				} else if(pathname == "images/thread.png") {
					res.writeHead(200, {
						"Content-Type": "image/png"
					})
					res.end(pre_loaded_images["thread"], "binary");
					
				} else if(pathname == "images/thread_read.png") {
					res.writeHead(200, {
						"Content-Type": "image/png"
					})
					res.end(pre_loaded_images["thread_read"], "binary");
					
				} else if(pathname == "images/expand.png") {
					res.writeHead(200, {
						"Content-Type": "image/png"
					})
					res.end(pre_loaded_images["expand"], "binary");
					
				} else if(pathname == "images/collapse.png") {
					res.writeHead(200, {
						"Content-Type": "image/png"
					})
					res.end(pre_loaded_images["collapse"], "binary");
					
				} else if(pathname == "images/forum.png") {
					res.writeHead(200, {
						"Content-Type": "image/png"
					})
					res.end(pre_loaded_images["forum"], "binary");
					
				} else if(pathname.startsWith("sf/")){
					page_Forum(req, res, swig, database, pathname.substr(3), parseCookie, userinfo, querystring)
					
				} else if(pathname.startsWith("thread/")) {
					page_thread(req, res, swig, database, pathname.substr(7), parseCookie, userinfo, date_created, querystring, online_users)
					
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
					
				} else if(pathname.startsWith("admin")) {
					pathname = pathname.substr(5)
					if(userinfo.top_rank === false){
						res.writeHead(302, {
							"Location": "/admin"
						})
						res.end()
					}
					if(userinfo.top_rank === true){
						if(pathname == ""){
							page_admin(req, res, swig, userinfo, database, date_created, querystring, cache_data)
						} else if(pathname == "/editannouncement") {
							page_admin_editannouncement(req, res, swig, userinfo, database, date_created, querystring, cache_data)
						} else if(pathname == "/editforums") {
							page_admin_editforums(req, res, swig, userinfo, database, date_created, querystring, cache_data)
						} else {
							res.end("")
						}
					}
					
				} else if(pathname.startsWith("profile/")) {
					page_profile(req, res, swig, database, pathname.substr(8), date_created, userinfo)
					
				} else {
					res.statusCode = 404;
					res.end("404: Page does not exist")
				}
			}
			
		})
	}
	
	function start_server(){
		var server = http.createServer(server_)
		server.listen(port, function() {
			var addr = server.address();
			console.log("Server listening on port: " + addr.port)
		});
	}
	
}