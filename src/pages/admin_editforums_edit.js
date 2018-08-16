module.exports = function(req, res, userinfo, id){
	var tmp = swig.compileFile("./src/html/admin_editforums_edit.html")
	
	var forum;
	var forum_group;
	
	var forum_groups;
	
	database.get("select * from forums where id=?", id, function(e, for_){
		if(for_){
			forum = for_
			forum.date_created = date_created(forum.date_created)
			step1()
		} else {
			res.end("Invalid forum ID")
		}
	})
	
	function step1(){
		database.all("select * from forum_groups order by _order", function(e, f_g){
			forum_groups = f_g
			for(i in f_g){
				if(f_g[i].id == forum.forum_group) {
					forum_group = f_g[i]
				}
			}
			done()
		})
	}
	
	function done(){
		var output = tmp(Object.assign({
			forum: forum,
			forum_group: forum_group,
			forum_groups: forum_groups
		}, userinfo));
		res.write(output)
		res.end()
	}
}