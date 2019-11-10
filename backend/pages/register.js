module.exports.GET = async function(req, serve, vars) {
    var method = req.method.toLowerCase()
	
	if(method == "get") {
		var searchquery = querystring.parse(url.parse(req.url).query)
		
		var tmp = swig.compileFile("./src/html/register.html")
		
		var errLabel = ""
		if(searchquery.e == "1"){
			errLabel = "There already exists an account with the same username";
		}
		
		var output = tmp(Object.assign({
			err_label: errLabel
		}, userinfo));
		
		res.write(output)
		res.end()
	}
	if(method == "post") {
		var queryData = "";
		var error = false;
		req.on('data', function(data) {
			queryData += data;
			if (queryData.length > 2000) {
				queryData = "";
				res.end("")
				error = true
				req.connection.destroy();
			}
		});
		if(!error){
			req.on('end', async function(){
				var data = querystring.parse(queryData)
				
				var user = data.reg_user
				var pass = data.reg_pass
				
				var b = await get("select username from users where username=? collate nocase", user)
				if(b === undefined) {
					var date_now = Date.now()
					var new_us = await run("insert into users values(null, ?, ?, ?, 0, 0, ?)", [user, encryptHash(pass), date_now, date_now])
					var new_user_id = new_us.lastID
					var tkn = token(32)
					var expires = Date.now() + Month*2
					await run("insert into session values(?, ?, ?)", [new_user_id, expires, tkn])
					await run("update users set last_login=? where id=?", [Date.now(), new_user_id])
					res.writeHead(302, {
						"Set-Cookie": "sessionid=" + tkn + "; expires=" + cookieExpireDate(expires) + ";",
						"Location": "/"
					})
					res.end()
				} else {
					res.writeHead(302, {
						"Location": "/register?e=1"
					})
					res.end()
				}
			});
		}
	}
}

module.exports.POST = async function(req, serve, vars) {
    
}

var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

function token(len) {
    var str = "";
    for(var i = 0; i < len; i++) {
        str += chars.charAt(Math.floor(Math.random()*chars.length))
    }
    return str;
}

// milliseconds
var Second = 1000
var Minute = 60000
var Hour = 3600000
var Day = 86400000
var Week = 604800000
var Month = 2628002880
var Year = 31536034560
var Decade = 315360345600