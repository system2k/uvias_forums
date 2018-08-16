module.exports = function(req, res, userinfo){
	var tmp = swig.compileFile("./src/html/members.html")
	
	var users = {};
	
	database.all("select * from users", function(e, usrs){
		for(i in usrs){
			users[i] = usrs[i]
			users[i].date_joined = joindate_label(users[i].date_joined)
			users[i].last_login = joindate_label(users[i].last_login)
		}
		done()
	})
	
	function done(){
		var output = tmp(Object.assign({
			users: users,
			letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
		}, userinfo));
		res.write(output)
		res.end()
	}
}