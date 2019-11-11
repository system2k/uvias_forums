module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var userinfo = evars.userinfo;

    var tmp = swig.compileFile("./frontend/templates/admin_createforumgroup.html")
	var output = tmp(userinfo);
	serve(output)
}