module.exports = function(req, res, swig, database, parseCookie, userinfo) {
	var tmp = swig.compileFile("./src/html/main.html")
	
	var forums = [];
	
	database.all("select * from forums order by _order", function(a, b){
		for(i in b){
			forums.push(b[i])
		}
		var output = tmp(Object.assign({
			forums: forums,
			logged_in: userinfo.loggedin
		}, userinfo));
		
		res.write(output)
		res.end()
	})
}