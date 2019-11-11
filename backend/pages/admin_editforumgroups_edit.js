module.exports.GET = async function(req, serve, vars, evars) {
    var urlSegmentIndex = vars.urlSegmentIndex;
    var db = vars.db;
    var swig = vars.swig;
    var userinfo = evars.userinfo;
    var date_created = vars.date_created;

    var tmp = swig.compileFile("./frontend/templates/admin_editforumgroups_edit.html")

    var id = urlSegmentIndex(req.url, 3);
	
	var forum_group;
	
	var f_g = await db.get("select * from forum_groups where id=?", id)
	if(f_g){
        forum_group = f_g
		forum_group.date_created = date_created(forum_group.date_created)
		var output = tmp(Object.assign({
			forum_group: forum_group
		}, userinfo));
		serve(output)
	} else {
		serve("Invalid forum group ID")
	}
}