module.exports = function(req, res, userinfo){
	var tmp = swig.compileFile("./src/html/admin_createforum.html")
	
	var forum_groups = []
	
	database.all("select * from forum_groups order by _order", function(e, f_g){
		for(i in f_g){
			forum_groups.push(f_g[i])
		}
		done()
	})
	
	function done(){
		var output = tmp(Object.assign({
			forum_groups: forum_groups
		}, userinfo));
		res.write(output)
		res.end()
	}
}