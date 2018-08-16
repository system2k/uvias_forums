module.exports = function(req, res, swig, database, parseCookie, userinfo) {
	var tmp = swig.compileFile("./src/html/main.html")
	
	var subforums = [];
	
	database.all("select * from subforums order by _order", function(a, b){
		for(i in b){
			subforums.push(b[i])
		}
		var output = tmp(Object.assign({
			subforums: subforums,
			logged_in: userinfo.loggedin
		}, userinfo));
		
		res.write(output)
		res.end()
	})
}