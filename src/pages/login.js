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

module.exports = function(req, res) {
	var method = req.method.toLowerCase()
	
	if(method == "get") {
		var tmp = swig.compileFile("./src/html/login.html")
		
		var output = tmp(Object.assign({
			
		}, {}));
		
		res.write(output)
		res.end()
	}
	
	if(method == "post") {
		var queryData = "";
		var error = false;
		req.on('data', function(data) {
            queryData += data;
            if (queryData.length > 1000000) {
                queryData = "";
				res.end("")
                error = true
                req.connection.destroy();
            }
        });
		if(!error){
			req.on('end', function(){
				var data = querystring.parse(queryData)
				
				var user = data.user;
				var pass = data.pass;
				
				database.get("select * from users where username=? collate nocase", [user], function(a,b){
					if(b !== undefined){
						var chkpass = b.password;
						if(checkHash(chkpass, pass)){
							var tkn = token(32)
							var expires = Date.now() + Month*2
							database.run("insert into session values(?, ?, ?)", [b.id, expires, tkn], function() {
								database.run("update users set last_login=? where id=?", [Date.now(), b.id], function(){
									res.writeHead(302, {
										"Set-Cookie": "sessionid=" + tkn + "; expires=" + cookieExpireDate(expires) + ";",
										"Location": "/"
									})
									res.end()
								})
							})
						} else {
							res.end("User does not exist or password is wrong")
						}
					} else {
						res.end("User does not exist or password is wrong")
					}
				})
			});
		}
	}
}