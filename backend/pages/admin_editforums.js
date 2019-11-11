module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var db = vars.db;
    var userinfo = evars.userinfo;

    var tmp = swig.compileFile("./frontend/templates/admin_editforums.html")
	
	var forum_groups = []
	
	var f_g = await db.all("select * from forum_groups order by _order")
    
    for(var i = 0; i < f_g.length; i++) {
        var forums = await db.all("select * from forums where forum_group = ? order by _order", f_g[i].id)
		forum_groups.push({
			id: f_g[i].id,
			name: f_g[i].name,
			forums: forums
		})
    }

    var output = tmp(Object.assign({
        forum_groups: forum_groups
    }, userinfo));
    serve(output)
}