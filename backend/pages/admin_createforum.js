module.exports.GET = async function(req, serve, vars) {
    var tmp = swig.compileFile("./src/html/admin_createforum.html")
	
	var forum_groups = []
	
	var f_g = await all("select * from forum_groups order by _order")
	for(i in f_g){
		forum_groups.push(f_g[i])
	}
	done()
	
	function done(){
		var output = tmp(Object.assign({
			forum_groups: forum_groups
		}, userinfo));
		res.write(output)
		res.end()
	}
}

module.exports.POST = async function(req, serve, vars) {
    
}