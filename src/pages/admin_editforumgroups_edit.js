module.exports = function(req, res, userinfo, id){
	var tmp = swig.compileFile("./src/html/admin_editforumgroups_edit.html")
	
	var forum_group;
	
	database.get("select * from forum_groups where id=?", id, function(e, f_g){
		if(f_g){
			forum_group = f_g
			forum_group.date_created = date_created(forum_group.date_created)
			done()
		} else {
			res.end("Invalid forum group ID")
		}
	})
	
	function done(){
		var output = tmp(Object.assign({
			forum_group: forum_group
		}, userinfo));
		res.write(output)
		res.end()
	}
}