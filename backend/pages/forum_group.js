module.exports.GET = async function(req, serve, vars) {
    var tmp = swig.compileFile("./src/html/forum_group.html")
	
	var forum_group;
	var f_g = await get("select * from forum_groups where id=?", id)
	if(f_g){
		forum_group = f_g
		done()
	} else {
		res.end("Invalid forum group id.")
	}
	
	async function done(){
		var b = await all("select * from forums where forum_group=? order by _order", id)
		var output = tmp(Object.assign({
			forums: b,
			forum_group: forum_group
		}, userinfo));
		
		res.write(output)
		res.end()
	}
}

module.exports.POST = async function(req, serve, vars) {
    
}