module.exports = function(req, res, database, cookieExpireDate, parseCookie) {
	var cookie = req.headers.cookie
    cookie = parseCookie(cookie)
	
	var sid = cookie.sessionid
	if(typeof sid !== "string") sid = "";
	database.get("delete from session where key = ?", [sid], function(a, b){
		res.writeHead(302, {
			"Set-Cookie": "sessionid=; expires=" + cookieExpireDate(0) + ";",
			"Location": "/"
		})
		res.end()
	})
}