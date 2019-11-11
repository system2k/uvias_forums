module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var db = vars.db;
    var userinfo = evars.userinfo;

    var tmp = swig.compileFile("./frontend/templates/admin_createforum.html")
	
	var forum_groups = []
	
	var f_g = await db.all("select * from forum_groups order by _order")
	for(i in f_g){
		forum_groups.push(f_g[i])
	}
    
    var output = tmp(Object.assign({
        forum_groups: forum_groups
    }, userinfo));
    serve(output)
}