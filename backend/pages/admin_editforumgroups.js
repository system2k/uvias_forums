module.exports.GET = async function(req, serve, vars) {
    var tmp = swig.compileFile("./src/html/admin_editforumgroups.html")
	
	var forum_groups = []
	
	var f_g = await all("select * from forum_groups order by _order")
	forum_groups = f_g
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