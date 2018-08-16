module.exports = function(req, res, id, userinfo) {
	var method = req.method.toLowerCase()
	
	if(method == "get"){
		var tmp = swig.compileFile("./src/html/profile.html")
		
		database.get("select * from users where id=?", [id], function(a,b){
			if(a || b === undefined) {
				res.end("User does not exist")
			} else {
				var output = tmp(Object.assign({
					username: b.username,
					posts: b.posts,
					joindate: date_created(b.date_joined),
					rank: b.rank,
					last_login: date_created(b.last_login),
					user: b
				}, userinfo));
				
				res.write(output)
				res.end()
			}
		})
	}
}