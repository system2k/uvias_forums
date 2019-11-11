var http = require("http")
var url = require("url")
var fs = require("fs")
var sql = require("sqlite3").verbose()
var swig = require("swig")
var querystring = require("querystring")
var crypto = require("crypto")

var port = 1337
var postsPerPage = 30; // posts per page on threads
var dataPath = "../data";
var staticPath = "./frontend/static/";
var staticPathWeb = "static/";
if(!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath);
}
var databasePath = dataPath + "/" + "database.db";
console.log("Starting server...");

// properly take all data from an error stack
function process_error_arg(e) {
    var error = {};
    if(typeof e == "object") {
        // retrieve hidden properties
        var keys = Object.getOwnPropertyNames(e);
        for(var i = 0; i < keys.length; i++) {
            error[keys[i]] = e[keys[i]];
        }
    } else {
        error.data = e;
    }
    return error;
}

function asyncDbSystem(database) {
    const db = {
        // gets data from the database (only 1 row at a time)
        get: async function(command, params) {
            if(params == void 0 || params == null) params = []
            return new Promise(function(r, rej) {
                database.get(command, params, function(err, res) {
                    if(err) {
                        return rej({
                            sqlite_error: process_error_arg(err),
                            input: { command, params }
                        });
                    }
                    r(res);
                });
            });
        },
        // runs a command (insert, update, etc...) and might return "lastID" if needed
        run: async function(command, params) {
            if(params == void 0 || params == null) params = [];
            var err = false;
            return new Promise(function(r, rej) {
                database.run(command, params, function(err, res) {
                    if(err) {
                        return rej({
                            sqlite_error: process_error_arg(err),
                            input: { command, params }
                        });
                    }
                    var info = {
                        lastID: this.lastID
                    }
                    r(info);
                });
            });
        },
        // gets multiple rows in one command
        all: async function(command, params) {
            if(params == void 0 || params == null) params = [];
            return new Promise(function(r, rej) {
                database.all(command, params, function(err, res) {
                    if(err) {
                        return rej({
                            sqlite_error: process_error_arg(err),
                            input: { command, params }
                        });
                    }
                    r(res);
                });
            });
        },
        // get multiple rows but execute a function for every row
        each: async function(command, params, callbacks) {
            if(typeof params == "function") {
                callbacks = params;
                params = [];
            }
            var def = callbacks;
            var callback_error = false;
            var cb_err_desc = "callback_error";
            callbacks = function(e, data) {
                try {
                    def(data);
                } catch(e) {
                    callback_error = true;
                    cb_err_desc = e;
                }
            }
            return new Promise(function(r, rej) {
                database.each(command, params, callbacks, function(err, res) {
                    if(err) return rej({
                        sqlite_error: process_error_arg(err),
                        input: { command, params }
                    });
                    if(callback_error) return rej(cb_err_desc);
                    r(res);
                });
            });
        },
        // like run, but executes the command as a SQL file
        // (no comments allowed, and must be semicolon separated)
        exec: async function(command) {
            return new Promise(function(r, rej) {
                database.exec(command, function(err) {
                    if(err) {
                        return rej({
                            sqlite_error: process_error_arg(err),
                            input: { command }
                        });
                    }
                    r(true);
                });
            });
        }
    };
    return db;
}

var database = new sql.Database(databasePath);
var db = asyncDbSystem(database);


function listDir(addr, MP, dsu, po, opt) { // object, file path, web path, path only, options
    if(!opt) opt = {};
    var con = fs.readdirSync(MP)
    for(var i in con) {
        var currentPath = MP + con[i]
        if(!fs.lstatSync(currentPath).isDirectory()) {
            if(!po) {
                addr[dsu + con[i]] = fs.readFileSync(currentPath)
            } else {
                addr[dsu + con[i]] = currentPath;
            }
        } else {
            // Omitted folder? Cancel scanning folder
            if(con[i] == opt.omit_folder) {
                return;
            }
            listDir(addr, MP + con[i] + "/", dsu + con[i] + "/", po)
        }
    }
}

var static_data = {};
listDir(static_data, staticPath, staticPathWeb);

var pages = {
	main: "main.js",
	Forum: "sf.js",
	thread: "thread.js",
	register: "register.js",
	post: "post.js",
	login: "login.js",
	logout: "logout.js",
	reply: "reply.js",
	admin: "admin.js",
	admin_editannouncement: "admin_editannouncement.js",
	admin_editforums: "admin_editforums.js",
	admin_editforumgroups: "admin_editforumgroups.js",
	admin_createforum: "admin_createforum.js",
	admin_editforumgroups_edit: "admin_editforumgroups_edit.js",
	admin_createforumgroup: "admin_createforumgroup.js",
	admin_editforums_edit: "admin_editforums_edit.js",
	profile: "profile.js",
	forum_group: "forum_group.js",
	myforums: "myforums.js",
	search: "search.js",
	inbox: "inbox.js",
	compose_message: "compose_message.js",
    view_message: "view_message.js",
    static: "static.js"
}

for(i in pages){
	pages[i] = require("./backend/pages/" + pages[i])
}

var cache_data = {
	announcement: ""
};

var algorithm = "sha512WithRSAEncryption";
var encryptHash = function(pass, salt) {
	if(!salt) {
		var salt = crypto.randomBytes(10).toString("hex")
	}
	var hsh = crypto.createHmac(algorithm, salt).update(pass).digest("hex")
	var hash = salt + "@" + hsh;
	return hash;
};

var checkHash = function(hash, pass) {
	if(typeof hash !== "string") return false;
	hash = hash.split("@");
	if(hash.length !== 2) return false;
	if(typeof pass !== "string") return false;
	return encryptHash(pass, hash[0]) === hash.join("@");
};

var parseCookie = function(cookie) {
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

var cookieExpireDate = function(timestamp) {
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

var Month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var joindate_label = function(timestamp){
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
		await db.run("insert into users values(null, ?, ?, ?, 0, 2, ?)", ["Admin", encryptHash("admin"), date_now, date_now])
		.catch(function(){log("An error occured while creating the admin account:", "l_red");console.log(e)})
		log("Added admin account successfully (username: admin, password: admin)", "l_green")
		
		await db.run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?, 1)", ["Forum 1", "Sample forum generated automatically using the console", date_now, 1])
		.catch(function(){log("An error occured while creating sample forum #1:", "red");console.log(e)})
		log("Added sample forum #1 successfully", "l_green")
		
		
		await db.run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?, 1)", ["Forum 2", "Another forum generated automatically using the console", date_now, 2])
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
	if(!await db.get("select * from sqlite_master where type='table' and name='info'")) {
		log("Creating tables...", "l_green")
		
		await db.run("create table info(name text, data text)")
		console.log("Created 'info'")
		
		await db.run("insert into info values('init', '')")
		console.log("Marked database as initialized")
		
		await db.run("insert into info values('announcement', 'No announcement')")
		console.log("Added announcement")
		
		await db.run("create table forums('id' integer PRIMARY KEY, 'name' text, 'desc' text, 'date_created' integer, thread_count integer, post_count integer, _order integer, forum_group integer)")
		console.log("Created 'forums'")
		
		await db.run("create table threads(id integer primary key, forum integer, title text, body text, date_created integer, user integer, type integer, parent integer, thread integer, font integer, _order integer, deleted integer, views integer)")
		console.log("Created 'threads'")
		
		await db.run("create table users(id integer primary key, username text, password text, date_joined integer, posts integer, rank integer, last_login integer)")
		console.log("Created 'users'")
		
		await db.run("create table session(user_id integer, expire_date integer, key text)")
		console.log("Created 'session'")
		
		await db.run("create table views(user integer, date integer, type integer, max_readAll_id integer, post_id integer, forum_id integer, message_id integer)")
		console.log("Created 'views'")
		
		await db.run("create table forum_groups(id integer PRIMARY KEY, name text, date_created integer, _order integer)")
		console.log("Created 'forum_groups'")
		
		await db.run("INSERT INTO forum_groups VALUES (null, ?, ?, ?)", ["Main forums", Date.now(), 1])
		console.log("Created 'Main forums' forum group")
		
		await db.run("create table tracking(user integer, thread integer, date integer)")
		console.log("Created 'tracking'")
		
		await db.run("create table messages(id integer PRIMARY KEY, date integer, from_id integer, to_id integer, subject text, body text)")
        console.log("Created 'messages'")
        



        console.log("Adding sample data...")
		
		var date_now = Date.now()
		await db.run("insert into users values(null, ?, ?, ?, 0, 2, ?)", ["Admin", encryptHash("admin"), date_now, date_now])
		.catch(function(){log("An error occured while creating the admin account:", "l_red");console.log(e)})
		log("Added admin account successfully (username: admin, password: admin)", "l_green")
		
		await db.run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?, 1)", ["Forum 1", "Sample forum generated automatically using the console", date_now, 1])
		.catch(function(){log("An error occured while creating sample forum #1:", "red");console.log(e)})
		log("Added sample forum #1 successfully", "l_green")
		
		
		await db.run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?, 1)", ["Forum 2", "Another forum generated automatically using the console", date_now, 2])
		.catch(function(){log("An error occured while creating sample forum #2:", "l_red");console.log(e)})
		log("Added sample forum #2 successfully", "l_green")
		
		console.log("Sample data creation complete.")


		log("Table creation complete.", "l_green")
		begin()
	} else {
		begin()
	}
}
init_db()

async function begin(){
	var anc = await db.get("select data from info where name='announcement'")
	cache_data.announcement = anc.data
	start_server()
}

var Month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var _data_ago = ["minute", "hour", "day", "month", "year"];
var date_created = function(timestamp){
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


var online_users = {}

/*setInterval(function(){
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
}, 1000*60) // check every minute*/

function checkPosNumber(n){
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

process.on("uncaughtException", function(err) {
	if(err.errno === "EADDRINUSE") {
		console.log("The port " + port + " is already in use. The server cannot start");
	} else {
		console.log(err)
	}
	process.exit()
});

var url_regexp = [
    [/^$/g, pages.main],

    [/^sf\/(.*)[\/]?$/g, pages.Forum],
    [/^thread\/(.*)[\/]?$/g, pages.thread],
    [/^post\/(.*)[\/]?$/g, pages.post],

    [/^login[\/]?$/g, pages.login],
    [/^logout[\/]?$/g, pages.logout],

    [/^reply\/(.*)[\/]?$/g, pages.reply],
    [/^forum_group\/(.*)[\/]?$/g, pages.forum_group],
    [/^myforums[\/]?$/g, pages.myforums],
    [/^search[\/]?$/g, pages.search],
    [/^inbox[\/]?$/g, pages.inbox],
    [/^compose_message\/(.*)[\/]?$/g, pages.compose_message],
    [/^view_message\/(.*)[\/]?$/g, pages.view_message],

    [/^admin[\/]?$/g, pages.admin],
    [/^admin\/editannouncement[\/]?$/g, pages.admin_editannouncement],
    [/^admin\/editforums[\/]?$/g, pages.admin_editforums],
    [/^admin\/editforums\/(.*)[\/]?$/g, pages.admin_editforums_edit],
    [/^admin\/editforumgroups[\/]?$/g, pages.admin_editforumgroups],
    [/^admin\/editforumgroups\/(.*)[\/]?$/g, pages.admin_editforumgroups_edit],
    [/^admin\/createforum[\/]?$/g, pages.admin_createforum],
    [/^admin\/createforumgroup[\/]?$/g, pages.admin_createforumgroup],

    [/^static\/(.*)[\/]?$/g, pages.static],

    [/^profile\/(.*)[\/]?$/g, pages.profile]
];

function urlSegmentIndex(url, idx) {
    if(url.charAt(0) == "/") url = url.substr(1);
    url = url.split("/");
    return url[idx];
}

function handle_error(e) {
    console.log(e)
}

function wait_response_data(req, res) {
    var sizeLimit = 1000000;
    var queryData = "";
    var error = false;
    return new Promise(function(resolve) {
        req.on("data", function(data) {
            if(error) return;
            try {
                if(data.length <= 250000) { // limit of individual packets
                    queryData += data;
                }
                if (queryData.length > sizeLimit) { // hard limit
                    queryData = "";
                    res.writeHead(413);
                    res.end("Payload too large");
                    error = true;
                    resolve(null);
                }
            } catch(e) {
                handle_error(e);
            }
        });
        req.on("end", function() {
            if(error) return;
            try {
                resolve(querystring.parse(queryData, null, null, { maxKeys: 256 }));
            } catch(e) {
                resolve(null);
            }
        });
    });
}

var global_vars = {
    swig,
    db,
    url,
    static_data,
    urlSegmentIndex,
    date_created,
    parseCookie,
    cookieExpireDate,
    postsPerPage,
    joindate_label,
    online_users,
    querystring
};

function InternalServerError(res) {
	res.statusCode = 500;
	res.end("(500) Internal server error")
}
async function server_(req, res) {
    var path = url.parse(req.url);
    var pathname = path.pathname.substr(1);

    function serve(data) {
        if(!data) data = "";
        res.end(data);
    }

    var found = false;
    for(var i = 0; i < url_regexp.length; i++) {
        var row = url_regexp[i];
        var regexp = row[0];
        var obj = row[1];
        if(pathname.match(regexp)) {
            var method = req.method;
            var resdata;
            var userinfo = {
                sid: "123456789",
                user_id: 1,
                logged_in: true,
                top_rank: true,
                page_path: path.href,
                cookie: parseCookie(req.headers.cookie),
                announcement: cache_data.announcement,
                username: "Admin",
                inbox_unread: 0
            };
            if(method == "GET" && obj.GET) {
                resdata = await obj.GET(req, serve, global_vars, {
                    userinfo,
                    res
                });
                found = true;
            } else if(method == "POST" && obj.POST) {
                var pdata = await wait_response_data(req, res);
                if(!pdata) pdata = {};
                resdata = await obj.POST(req, serve, global_vars, {
                    pdata,
                    userinfo,
                    res
                });
                found = true;
            } else if(method == "DELETE" && obj.DELETE) {
                resdata = await obj.DELETE(req, serve, global_vars, {
                    userinfo,
                    res
                });
                found = true;
            } else {
                return res.end("Invalid method");
            }
            break;
        }
    }

    if(!found) {
        return res.end("404");
    }

	/*$ = function(fc) {
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
		}*/
}

function start_server(){
	var server = http.createServer(async function(req, res) {
        try {
            await server_(req, res);
        } catch(e) {
            console.log(e)
            return res.end("500 internal server error");
        }
    })
	server.listen(port, function() {
		var addr = server.address();
		console.log("Server listening on port: " + addr.port + ". Address: " + addr.address + ":" + addr.port)
	});
}