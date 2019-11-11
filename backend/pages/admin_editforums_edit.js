module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var db = vars.db;
    var userinfo = evars.userinfo;
    var date_created = vars.date_created;
    var urlSegmentIndex = vars.urlSegmentIndex;

    var tmp = swig.compileFile("./frontend/templates/admin_editforums_edit.html")

    var id = urlSegmentIndex(req.url, 2);
	
	var forum;
	var forum_group;
	
	var forum_groups;
	
	var for_ = await db.get("select * from forums where id=?", id)
	if(for_){
		forum = for_
		forum.date_created = date_created(forum.date_created)
        
        var f_g = await db.all("select * from forum_groups order by _order")
		forum_groups = f_g
		for(i in f_g){
			if(f_g[i].id == forum.forum_group) {
				forum_group = f_g[i]
			}
		}

        var output = tmp(Object.assign({
			forum: forum,
			forum_group: forum_group,
			forum_groups: forum_groups
		}, userinfo));
		serve(output)
	} else {
		serve("Invalid forum ID")
	}
}