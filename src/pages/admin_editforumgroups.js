module.exports = function(req, res, swig, userinfo, database, date_created, querystring, cache_data){
	var tmp = swig.compileFile("./src/html/admin_editforumgroups.html")
	
	var forum_groups = []
	
	database.all("select * from forum_groups order by _order", function(e, f_g){
		forum_groups = f_g
		done()
	})
	
	function done(){
		var output = tmp(Object.assign({
			logged_in: userinfo.loggedin,
			forum_groups: forum_groups
		}, userinfo));
		res.write(output)
		res.end()
	}
}