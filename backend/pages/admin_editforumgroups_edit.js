module.exports.GET = async function(req, serve, vars) {
    var tmp = swig.compileFile("./src/html/admin_editforumgroups_edit.html")
	
	var forum_group;
	
	var f_g = await get("select * from forum_groups where id=?", id)
	if(f_g){
		forum_group = f_g
		forum_group.date_created = date_created(forum_group.date_created)
		done()
	} else {
		res.end("Invalid forum group ID")
	}

	function done(){
		var output = tmp(Object.assign({
			forum_group: forum_group
		}, userinfo));
		res.write(output)
		res.end()
	}
}

module.exports.POST = async function(req, serve, vars) {
    
}