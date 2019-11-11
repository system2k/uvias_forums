module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var userinfo = evars.userinfo;

    var tmp = swig.compileFile("./frontend/templates/admin_editannouncement.html")
	var output = tmp(Object.assign({
	}, userinfo));
	serve(output)
}