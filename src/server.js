var http = require("http")
url = require("url")
var fs = require("fs")
var sql = require("sqlite3").verbose()
var domain = require("domain")
swig = require("swig")
querystring = require("querystring")
crypto = require('crypto');

var port = 80
postsPerPage = 30; // posts per page on threads
database = new sql.Database("../database.db")
//database = {}

//var sql_cmds = ["close", "configure", "run", "get", "all", "each", "exec", "prepare"]

/*database = { // prevent crashes
	get: function(){
		for(i in arguments){
			var fc = arguments[i]
			if(typeof fc === "function") {
				var pargs = arguments[i]
				arguments[i] = function(){
					try{pargs(...arguments)}catch(e){}
				}
			}
		}
		db.get(...arguments)
	},
	all: function(){
		for(i in arguments){
			var fc = arguments[i]
			if(typeof fc === "function") {
				var pargs = arguments[i]
				arguments[i] = function(){
					try{pargs(...arguments)}catch(e){}
				}
			}
		}
		db.all(...arguments)
	},
	each: function(){
		for(i in arguments){
			var fc = arguments[i]
			if(typeof fc === "function") {
				var pargs = arguments[i]
				arguments[i] = function(){
					try{pargs(...arguments)}catch(e){}
				}
			}
		}
		db.each(...arguments)
	},
	run: function(){
		for(i in arguments){
			var fc = arguments[i]
			if(typeof fc === "function") {
				var pargs = arguments[i]
				arguments[i] = function(){
					try{pargs(...arguments)}catch(e){}
				}
			}
		}
		db.run(...arguments)
	}
}*/

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

var pages = {
	page_main: "main.js",
	page_Forum: "sf.js",
	page_thread: "thread.js",
	page_register: "register.js",
	page_post: "post.js",
	page_login: "login.js",
	page_logout: "logout.js",
	page_reply: "reply.js",
	page_admin: "admin.js",
	page_admin_editannouncement: "admin_editannouncement.js",
	page_admin_editforums: "admin_editforums.js",
	page_admin_editforumgroups: "admin_editforumgroups.js",
	page_admin_createforum: "admin_createforum.js",
	page_admin_editforumgroups_edit: "admin_editforumgroups_edit.js",
	page_admin_createforumgroup: "admin_createforumgroup.js",
	page_admin_editforums_edit: "admin_editforums_edit.js",
	page_profile: "profile.js",
	page_forum_group: "forum_group.js",
	page_myforums: "myforums.js",
	page_members: "members.js",
	page_search: "search.js",
	page_inbox: "inbox.js",
	page_compose_message: "compose_message.js",
	page_view_message: "view_message.js"
}

for(i in pages){
	global[i] = require("./pages/" + pages[i])
}

cache_data = {
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

parseCookie = function(cookie) {
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

cookieExpireDate = function(timestamp) {
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

var Month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
joindate_label = function(timestamp){
	timestamp = parseInt(timestamp)
	timestamp = new Date(timestamp)
	
	var mth = Month[timestamp.getMonth()]
	var day = ("0" + timestamp.getDate()).slice(-2)
	var yer = timestamp.getFullYear()
	
	
	return mth + " " + day + ", " + yer
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
		console.log("Are you sure you want to add sample data?\nThis must be run when the database is empty.\nType \"yes\" to continue.")
		addsampledataconfirm = true
		lastCommand = rawCommand
	}
	if(cmd[0] === "yes" && addsampledataconfirm) {
		console.log("Adding data...")
		
		var date_now = Date.now()
		database.run("insert into users values(null, ?, ?, ?, 0, 2, ?)", ["Admin", encryptHash("admin"), date_now, date_now], function(e){
			if(e) {
				log("An error occured while creating the admin account:", "l_red")
				console.log(e)
			} else {
				log("Added admin account successfully (username: admin, password: admin)", "l_green")
				sd_forum1()
			}
		})
		
		function sd_forum1(){
			database.run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?, 1)", ["Forum 1", "Sample forum generated automatically using the console", date_now, 1], function(e){
				if(e) {
					log("An error occured while creating sample forum #1:", "red")
					console.log(e)
				} else {
					log("Added sample forum #1 successfully", "l_green")
					sd_forum2()
				}
			})
		}
		
		function sd_forum2(){
			database.run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?, 1)", ["Forum 2", "Another forum generated automatically using the console", date_now, 2], function(e){
				if(e) {
					log("An error occured while creating sample forum #2:", "l_red")
					console.log(e)
				} else {
					log("Added sample forum #2 successfully", "l_green")
					console.log("Sample data creation complete.")
				}
			})
		}
		
		
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
				database.run("create table forums('id' integer PRIMARY KEY, 'name' text, 'desc' text, 'date_created' integer, thread_count integer, post_count integer, _order integer, forum_group integer)", function(){
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
				database.run("create table users(id integer primary key, username text, password text, date_joined integer, posts integer, rank integer, last_login integer)", function(){
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
					db_forum_groups()
				})
			}
			
			function db_forum_groups(){
				database.run("create table forum_groups(id integer PRIMARY KEY, name text, date_created integer, _order integer)", function(){
					console.log("Created 'forum_groups'")
					db_forum_group_main()
				})
			}
			
			function db_forum_group_main(){
				database.run("INSERT INTO forum_groups VALUES (null, ?, ?, ?)", ["Main forums", Date.now(), 1], function(e){
					console.log("Created 'Main forums' forum group")
					db_tracking()
				})
			}
			function db_tracking(){
				database.run("create table tracking(user integer, thread integer, date integer)", function(){
					console.log("Created 'tracking'")
					db_messages()
				})
			}
			function db_messages(){
				database.run("create table messages(id integer PRIMARY KEY, date integer, from_id integer, to_id integer, subject text, body text)", function(e){
					console.log("Created 'messages'")
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
date_created = function(timestamp){
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


online_users = {}

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

function checkPosNumber(n){ // check positive number
	if(typeof n == "number" && !isNaN(n) && n !== Infinity) {
		return n >= 0
	}
	if(typeof n == "string") {
		if(n === "") return false
		for(var str = 0; str < n.length; str++){
			var find = false;
			for(var i = 0; i < 10; i++){
				if(n.charAt(str) == i) {
					find = true
					break
				}
			}
			if(!find) {
				return false
			}
		}
		return true
	}
	return false
}

process.on('uncaughtException', function(err) {
	if(err.errno === 'EADDRINUSE') {
		console.log("The port " + port + " is already in use. The server cannot start")
	} else {
		console.log(err)
	}
	process.exit()
});

var Images = {
	"favicon.ico": ["image/png", "fav_icon"],
	"images/bar.gif": ["image/gif", "bar"],
	"images/barGray.gif": ["image/gif", "barGray"],
	"images/bottom_bar.png": ["image/png", "bottom_bar"],
	"images/sidebar.png": ["image/png", "sidebar"],
	"images/offline.png": ["image/png", "offline"],
	"images/online.png": ["image/png", "online"],
	"images/thread.png": ["image/png", "thread"],
	"images/thread_read.png": ["image/png", "thread_read"],
	"images/expand.png": ["image/png", "expand"],
	"images/collapse.png": ["image/png", "collapse"],
	"images/forum.png": ["image/png", "forum"]
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
		var path = url.parse(req.url)
		
		var cookie = req.headers.cookie
		cookie = parseCookie(cookie)
		var sid = cookie.sessionid
		if(typeof sid !== "string") sid = "";
		var user_id;
		var logged_in;
		
		var userinfo
		
		database.get("select user_id from session where key=?", [sid], function(a, b){
			var user_id = undefined
			if(b){
				database.get("select username from users where id=?", b.user_id, function(e, usr){
					user_id = b.user_id;
					logged_in = user_id != undefined
					var rank = 0;
					userinfo = {
						sid: sid,
						user_id: user_id,
						logged_in: logged_in,
						top_rank: false,
						page_path: path.href,
						cookie: cookie,
						announcement: cache_data.announcement,
						username: usr.username
					}
					online_users[user_id] = Date.now()
					if(logged_in) {
						database.get("select rank from users where id=?", [user_id], function(a, b){
							userinfo.top_rank = b.rank == 1 || b.rank == 2
							comp()
						})
					} else {
						comp()
					}
				})
			} else {
				userinfo = {
					sid: "",
					user_id: 0,
					logged_in: false,
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
				
			if(Images[pathname]) {
				res.writeHead(200, {
					"Content-Type": Images[pathname][0]
				})
				res.end(pre_loaded_images[Images[pathname][1]], "binary");
				
			} else if(pathname == "") {
				page_main(req, res, userinfo)
				
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
				page_Forum(req, res, pathname.substr("sf/".length), userinfo)
				
			} else if(pathname.startsWith("thread/")) {
				page_thread(req, res, pathname.substr("thread/".length), userinfo)
				
			} else if(pathname == "register") {
				page_register(req, res, userinfo)
				
			} else if(pathname.startsWith("post/")) {
				page_post(req, res, pathname.substr("post/".length), userinfo)
				
			} else if(pathname == "login"){
				page_login(req, res, userinfo)
				
			} else if(pathname == "logout"){
				page_logout(req, res)
				
			} else if(pathname.startsWith("reply/")){
				page_reply(req, res, pathname.substr("reply/".length), userinfo)
				
			} else if(pathname.startsWith("forum_group/")) {
				var id = pathname.substr("forum_group/".length)
				page_forum_group(req, res, userinfo, id)
				
			} else if(pathname.startsWith("myforums")) {
				page_myforums(req, res, userinfo)
				
			} else if(pathname == "members") {
				page_members(req, res, userinfo)
				
			} else if(pathname == "search") {
				page_search(req, res, userinfo)
				
			} else if(pathname == "inbox") {
				page_inbox(req, res, userinfo)
				
			} else if(pathname.startsWith("compose_message/")) {
				var id = pathname.substr("compose_message/".length)
				page_compose_message(req, res, userinfo, id)
				
			} else if(pathname.startsWith("view_message/")) {
				var id = pathname.substr("view_message/".length)
				page_view_message(req, res, userinfo, id)
				
			} else if(pathname.startsWith("admin")) {
				pathname = pathname.substr(5)
				if(userinfo.top_rank === false){
					res.writeHead(302, {
						"Location": "/admin"
					})
					res.end()
				}
				if(userinfo.top_rank === true){
					if(pathname.charAt(0) == "/") pathname = pathname.substr(1)
					
					if(pathname == ""){
						page_admin(req, res, userinfo)
						
					} else if(pathname == "editannouncement") {
						page_admin_editannouncement(req, res, userinfo)
						
					} else if(pathname.startsWith("editforums")) {
						pathname = pathname.substr("editforums".length)
						if(pathname.charAt(0) == "/") pathname = pathname.substr(1)
					
						if(pathname == "") {
							page_admin_editforums(req, res, userinfo)
						} else if(checkPosNumber(pathname)) {
							page_admin_editforums_edit(req, res, userinfo, pathname)
						} else {
							res.end("")
						}
						
						
					} else if(pathname.startsWith("editforumgroups")) {
						pathname = pathname.substr("editforumgroups".length)
						if(pathname.charAt(0) == "/") pathname = pathname.substr(1)
						if(pathname == "") {
							page_admin_editforumgroups(req, res, userinfo)
						} else if(checkPosNumber(pathname)) {
							page_admin_editforumgroups_edit(req, res, userinfo, pathname)
						} else {
							res.end("")
						}
						
					} else if(pathname == "createforum") {
						page_admin_createforum(req, res, userinfo)
						
					} else if(pathname == "createforumgroup") {
						page_admin_createforumgroup(req, res, userinfo)
						
					} else {
						res.end("")
					}
				}
				
			} else if(pathname.startsWith("profile/")) {
				page_profile(req, res, pathname.substr("profile/".length), userinfo)
				
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