var http = require("http")
url = require("url")
var fs = require("fs")
var sql = require("sqlite3").verbose()
swig = require("swig")
querystring = require("querystring")
crypto = require("crypto")

var port = 1337
postsPerPage = 30; // posts per page on threads
database = new sql.Database("../database.db")
console.log("Starting server...");

get = async function(command, params) {
	if(!params) params = []
	return new Promise(function(r) {
		database.get(command, params, function(err, res) {
			if(err) {
				return rej(false)
			}
			r(res)
		})
	})
}

run = async function(command, params) {
	if(!params) params = []
	var err = false
	return new Promise(function(r, rej) {
		database.run(command, params, function(err, res) {
			if(err) {
				return rej(err)
			}
			var info = {
				lastID: this.lastID
			}
			r(info)
		})
	})
}

all = async function(command, params) {
	if(!params) params = []
	return new Promise(function(r, rej) {
		database.all(command, params, function(err, res) {
			if(err) {
				return rej(err)
			}
			r(res)
		})
	})
}

each = async function(command, params, callbacks) {
	if(typeof params == "function") {
		callbacks = params
		params = []
	}
	var def = callbacks
	var callback_error = false
	callbacks = function() {
		try {
			def(...arguments)
		} catch(e) {
			callback_error = true
		}
	}
	return new Promise(function(r, rej) {
		database.each(command, params, callbacks, function(err, res) {
			if(err || callback_error) {
				return rej(err)
			}
			r(res)
		})
	})
}

exec = async function(command) {
	return new Promise(function(r, rej) {
		database.exec(command, function(err) {
			if(err) {
				return rej(err)
			}
			r(true)
		})
	})
}

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

var algorithm = "sha512WithRSAEncryption";
encryptHash = function(pass, salt) {
	if(!salt) {
		var salt = crypto.randomBytes(10).toString("hex")
	}
	var hsh = crypto.createHmac(algorithm, salt).update(pass).digest("hex")
	var hash = salt + "@" + hsh;
	return hash;
};

checkHash = function(hash, pass) {
	if(typeof hash !== "string") return false;
	hash = hash.split("@");
	if(hash.length !== 2) return false;
	if(typeof pass !== "string") return false;
	return encryptHash(pass, hash[0]) === hash.join("@");
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
async function processCommand(cmd){
	var rawCommand = cmd;
	cmd = cmd.split(" ")
	if(cmd[0] === "rank") {
		var re = await run("update users set rank=? where username=? collate nocase", [cmd[2], cmd[1]])
		.then(function(){log("Rank for " + cmd[1] + " set to: " + cmd[2], "l_green")})
		.catch(function(){log("Error setting rank", "l_red")})
		lastCommand = rawCommand
	}
	if(cmd[0] === "update" && cmd[1] === "post-count") {
		await run("update forums set post_count = (select count(*) from threads where forum=forums.id and type=0 and deleted=0)")
		log("Updated forum post count to correct numbers", "l_green")
		await run("update users set posts = (select count(*) from threads where user=users.id and deleted=0)")
		log("Updated user post count to correct numbers", "l_green")
		log("Operation completed", "l_green")
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
		await run("insert into users values(null, ?, ?, ?, 0, 2, ?)", ["Admin", encryptHash("admin"), date_now, date_now])
		.catch(function(){log("An error occured while creating the admin account:", "l_red");console.log(e)})
		log("Added admin account successfully (username: admin, password: admin)", "l_green")
		
		await run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?, 1)", ["Forum 1", "Sample forum generated automatically using the console", date_now, 1])
		.catch(function(){log("An error occured while creating sample forum #1:", "red");console.log(e)})
		log("Added sample forum #1 successfully", "l_green")
		
		
		await run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?, 1)", ["Forum 2", "Another forum generated automatically using the console", date_now, 2])
		.catch(function(){log("An error occured while creating sample forum #2:", "l_red");console.log(e)})
		log("Added sample forum #2 successfully", "l_green")
		
		console.log("Sample data creation complete.")
	}
	if(cmd[0] === "repeat") {
		console.log("Repeating last command: " + lastCommand)
		processCommand(lastCommand)
	}
}

async function init_db() {
	if(!await get("select * from sqlite_master where type='table' and name='info'")) {
		log("Creating tables...", "l_green")
		
		await run("create table info(name text, data text)")
		console.log("Created 'info'")
		
		await run("insert into info values('init', '')")
		console.log("Marked database as initialized")
		
		await run("insert into info values('announcement', 'No announcement')")
		console.log("Added announcement")
		
		await run("create table forums('id' integer PRIMARY KEY, 'name' text, 'desc' text, 'date_created' integer, thread_count integer, post_count integer, _order integer, forum_group integer)")
		console.log("Created 'forums'")
		
		await run("create table threads(id integer primary key, forum integer, title text, body text, date_created integer, user integer, type integer, parent integer, thread integer, font integer, _order integer, deleted integer, views integer)")
		console.log("Created 'threads'")
		
		await run("create table users(id integer primary key, username text, password text, date_joined integer, posts integer, rank integer, last_login integer)")
		console.log("Created 'users'")
		
		await run("create table session(user_id integer, expire_date integer, key text)")
		console.log("Created 'session'")
		
		await run("create table views(user integer, date integer, type integer, max_readAll_id integer, post_id integer, forum_id integer, message_id integer)")
		console.log("Created 'views'")
		
		await run("create table forum_groups(id integer PRIMARY KEY, name text, date_created integer, _order integer)")
		console.log("Created 'forum_groups'")
		
		await run("INSERT INTO forum_groups VALUES (null, ?, ?, ?)", ["Main forums", Date.now(), 1])
		console.log("Created 'Main forums' forum group")
		
		await run("create table tracking(user integer, thread integer, date integer)")
		console.log("Created 'tracking'")
		
		await run("create table messages(id integer PRIMARY KEY, date integer, from_id integer, to_id integer, subject text, body text)")
		console.log("Created 'messages'")
		log("Table creation complete.", "l_green")
		begin()
	} else {
		begin()
	}
}
init_db()

async function begin(){
	var anc = await get("select data from info where name='announcement'")
	cache_data.announcement = anc.data
	start_server()
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
	if(hr === 0) {
		hr = 12;
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
function InternalServerError(res) {
	res.statusCode = 500;
	res.end("(500) Internal server error")
}
function server_(req, res) {
	$ = function(fc) {
		var args = []
		for(var i = 1; i < arguments.length; i++) {
			args.push(arguments[i])
		}
		var exec = fc(...args)
		if(exec) {
			if(exec.catch) {
				exec.catch(function(e) {
					InternalServerError(res)
				})
			}
		}
	}
	
	serve = async function() {
		var path = url.parse(req.url)
		
		var cookie = req.headers.cookie
		cookie = parseCookie(cookie)
		var sid = cookie.sessionid
		if(typeof sid !== "string") sid = "";
		var user_id;
		var logged_in;
		
		var userinfo
		
		var pathname = path.pathname
		if(pathname.charAt(0) === "/") pathname = pathname.substr(1)
		
		// get user information
		var b = await get("select user_id from session where key=?", sid)
		var user_id = undefined
		if(b) {
			var usr = await get("select username from users where id=?", b.user_id)
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
				username: usr.username,
				inbox_unread: 0
			}
			online_users[user_id] = Date.now()
			
			if(!Images[pathname]) {
				var view = await get("select count(*) as cnt from views where user=? and type=3", user_id)
				var count = view.cnt
				var msgs = await get("select count(*) as cnt from messages where to_id=?", user_id)
				var message_count = msgs.cnt
				var not_read = message_count - count
				userinfo.inbox_unread = not_read
				$(nxt)
			} else {
				$(nxt)
			}
			async function nxt(){
				var b = await get("select rank from users where id=?", user_id)
				userinfo.top_rank = b.rank == 1 || b.rank == 2
				comp()
			}
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
		
		// get page from url
		function comp(){
			if(Images[pathname]) {
				res.writeHead(200, {
					"Content-Type": Images[pathname][0]
				})
				res.end(pre_loaded_images[Images[pathname][1]], "binary");
				
			} else if(pathname == "") {
				$(page_main, req, res, userinfo)
				
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
				$(page_Forum, req, res, pathname.substr("sf/".length), userinfo)
				
			} else if(pathname.startsWith("thread/")) {
				$(page_thread, req, res, pathname.substr("thread/".length), userinfo)
				
			} else if(pathname == "register") {
				$(page_register, req, res, userinfo)
				
			} else if(pathname.startsWith("post/")) {
				$(page_post, req, res, pathname.substr("post/".length), userinfo)
				
			} else if(pathname == "login"){
				$(page_login, req, res, userinfo)
				
			} else if(pathname == "logout"){
				$(page_logout, req, res)
				
			} else if(pathname.startsWith("reply/")){
				$(page_reply, req, res, pathname.substr("reply/".length), userinfo)
				
			} else if(pathname.startsWith("forum_group/")) {
				var id = pathname.substr("forum_group/".length)
				$(page_forum_group, req, res, userinfo, id)
				
			} else if(pathname.startsWith("myforums")) {
				$(page_myforums, req, res, userinfo)
				
			} else if(pathname == "members") {
				$(page_members, req, res, userinfo)
				
			} else if(pathname == "search") {
				$(page_search, req, res, userinfo)
				
			} else if(pathname == "inbox") {
				$(page_inbox, req, res, userinfo)
				
			} else if(pathname.startsWith("compose_message/")) {
				var id = pathname.substr("compose_message/".length)
				$(page_compose_message, req, res, userinfo, id)
				
			} else if(pathname.startsWith("view_message/")) {
				var id = pathname.substr("view_message/".length)
				$(page_view_message, req, res, userinfo, id)
				
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
						$(page_admin, req, res, userinfo)
						
					} else if(pathname == "editannouncement") {
						$(page_admin_editannouncement, req, res, userinfo)
						
					} else if(pathname.startsWith("editforums")) {
						pathname = pathname.substr("editforums".length)
						if(pathname.charAt(0) == "/") pathname = pathname.substr(1)
					
						if(pathname == "") {
							$(page_admin_editforums, req, res, userinfo)
						} else if(checkPosNumber(pathname)) {
							$(page_admin_editforums_edit, req, res, userinfo, pathname)
						} else {
							res.end("")
						}
						
						
					} else if(pathname.startsWith("editforumgroups")) {
						pathname = pathname.substr("editforumgroups".length)
						if(pathname.charAt(0) == "/") pathname = pathname.substr(1)
						if(pathname == "") {
							$(page_admin_editforumgroups, req, res, userinfo)
						} else if(checkPosNumber(pathname)) {
							$(page_admin_editforumgroups_edit, req, res, userinfo, pathname)
						} else {
							res.end("")
						}
						
					} else if(pathname == "createforum") {
						$(page_admin_createforum, req, res, userinfo)
						
					} else if(pathname == "createforumgroup") {
						$(page_admin_createforumgroup, req, res, userinfo)
						
					} else {
						res.end("")
					}
				}
				
			} else if(pathname.startsWith("profile/")) {
				$(page_profile, req, res, pathname.substr("profile/".length), userinfo)
				
			} else {
				res.statusCode = 404;
				res.end("(404) Page does not exist")
			}
		}
	}
	
	$(serve)
}

function start_server(){
	var server = http.createServer(server_)
	server.listen(port, function() {
		var addr = server.address();
		console.log("Server listening on port: " + addr.port + ". Address: " + addr.address + ":" + addr.port)
	});
}