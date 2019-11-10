module.exports.GET = async function(req, serve, vars) {
    var cookie = req.headers.cookie
    cookie = parseCookie(cookie)
	
	var sid = cookie.sessionid
	if(typeof sid !== "string") sid = "";
	await run("delete from session where key = ?", sid)
	res.writeHead(302, {
		"Set-Cookie": "sessionid=; expires=" + cookieExpireDate(0) + ";",
		"Location": req.headers.referer
	})
	res.end()
}

module.exports.POST = async function(req, serve, vars) {
    
}