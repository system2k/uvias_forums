module.exports = function(req, res, userinfo){
	if(userinfo.logged_in) {
		var tmp = swig.compileFile("./src/html/inbox.html")
		
		var output = tmp(Object.assign({
			username: userinfo.username
		}, userinfo));
		res.write(output)
		res.end()
	} else {
		res.end()
	}
}