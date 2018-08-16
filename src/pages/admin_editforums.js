module.exports = function(req, res, swig, userinfo, database, date_created, querystring, cache_data){
	var tmp = swig.compileFile("./src/html/admin_editforums.html")
	
	database.all("select * from forums", function(a,b){
		var forums = []
		for(i in b){
			forums.push({
				id: b[i].id,
				name: b[i].name,
				desc: b[i].desc,
				date_created: date_created(b[i].date_created),
				thread_count: b[i].thread_count,
				post_count: b[i].post_count,
				_order: b[i]._order
			})
		}
		var output = tmp(Object.assign({
			logged_in: userinfo.loggedin,
			forums: forums,
			forum_count: forums.length
		}, userinfo));
		res.write(output)
		res.end()
	})
}