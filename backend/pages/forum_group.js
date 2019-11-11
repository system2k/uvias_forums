module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var db = vars.db;
    var userinfo = evars.userinfo;
    var urlSegmentIndex = vars.urlSegmentIndex;

    var tmp = swig.compileFile("./frontend/templates/forum_group.html")

    var id = urlSegmentIndex(req.url, 1);
	
	var forum_group;
	var f_g = await db.get("select * from forum_groups where id=?", id)
	if(f_g){
		forum_group = f_g
        
        var b = await db.all("select * from forums where forum_group=? order by _order", id)
		var output = tmp(Object.assign({
			forums: b,
			forum_group: forum_group
		}, userinfo));
		
		serve(output)
	} else {
		serve("Invalid forum group id.")
	}
}