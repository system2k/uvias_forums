module.exports = function(req, res, userinfo, id){
	if(userinfo.logged_in) {
		var tmp = swig.compileFile("./src/html/compose_message.html")
		
		var to_username;
		
		database.get("select * from users where id=?", id, function(e, user){
			if(user) {
				to_username = user.username
				done()
			} else {
				res.end()
			}
		})
		
		function done(){
			var output = tmp(Object.assign({
				username: userinfo.username,
				to_username: to_username
			}, userinfo));
			res.write(output)
			res.end()
		}
	} else {
		res.end()
	}
}